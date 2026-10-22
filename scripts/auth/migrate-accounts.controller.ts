import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// Only the minimum identity snapshot crosses databases, in memory. Never log rows or credentials.
const account = "adb27b39051202962038992eeaf8f6bb";
const source = "748845b9-8f96-4862-87e9-c10e7c478a70";
const target = "9750ac1d-810d-4c69-90e5-02c66c4b049b";
const apply = process.argv.includes("--apply");
const snapshot = process.argv.find((value) => value.startsWith("--snapshot="))?.slice(11) ?? new Date().toISOString();
if (!Number.isFinite(Date.parse(snapshot))) throw new Error("Invalid snapshot timestamp.");
const config = process.platform === "darwin" ? join(homedir(), "Library/Preferences/.wrangler/config/default.toml") : join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), ".wrangler/config/default.toml");
const token = process.env.CLOUDFLARE_API_TOKEN ?? /^oauth_token\s*=\s*"([^"]+)"/m.exec(await readFile(config, "utf8"))?.[1];
if (!token) throw new Error("Authenticate with Wrangler first.");
async function query<T>(database: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(30_000),
  });
  const value = await response.json() as { success?: boolean; result?: { success?: boolean; results?: T[] }[] };
  if (!response.ok || !value.success || !value.result?.[0]?.success) throw new Error(`Database operation failed (${response.status}); no private response logged.`);
  return value.result.flatMap((item) => item.results ?? []);
}
type Identity = { id: string; email: string; password_hash: string; password_salt: string; role: string; created_at: string };
const rows = await query<Identity>(source, "SELECT id,email,password_hash,password_salt,role,created_at FROM users WHERE created_at<=? ORDER BY id", [snapshot]);
if (!rows.length) throw new Error("Empty source snapshot; migration aborted.");
const existing = await query<{ id: string; email: string }>(target, "SELECT id,email FROM accounts");
const byId = new Map(existing.map((row) => [row.id, row.email.toLowerCase()]));
const byEmail = new Map(existing.map((row) => [row.email.toLowerCase(), row.id]));
for (const row of rows) {
  if (!/^[\w-]{1,100}$/.test(row.id) || !/^[A-Za-z0-9_-]{43}$/.test(row.password_hash) || !/^[A-Za-z0-9_-]{22}$/.test(row.password_salt)
    || (byId.has(row.id) && byId.get(row.id) !== row.email.toLowerCase()) || (byEmail.has(row.email.toLowerCase()) && byEmail.get(row.email.toLowerCase()) !== row.id)) {
    throw new Error("Identity conflict or unsupported verifier; migration aborted without printing private rows.");
  }
}
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", snapshot, sourceIdentities: rows.length, existingTargetIdentities: existing.length, conflicts: 0 }));
if (apply) {
  for (let offset = 0; offset < rows.length; offset += 10) {
    const batch = rows.slice(offset, offset + 10);
    await query(target, `INSERT OR IGNORE INTO accounts(id,email,password_hash,password_salt,role,created_at,legacy_allowed) VALUES ${batch.map(() => "(?,?,?,?,?,?,1)").join(",")}`,
      batch.flatMap((row) => [row.id, row.email.trim().toLowerCase(), row.password_hash, row.password_salt, row.role === "admin" ? "admin" : "user", Date.parse(row.created_at) || Date.now()]));
  }
  const imported = await query<{ id: string; email: string }>(target, "SELECT id,email FROM accounts");
  const ids = new Map(imported.map((row) => [row.id, row.email.toLowerCase()]));
  const matched = rows.filter((row) => ids.get(row.id) === row.email.toLowerCase()).length;
  if (matched !== rows.length) throw new Error("Migration identity audit failed.");
  console.log(JSON.stringify({ migratedIdentities: matched, sameIdentityAudit: "passed", sourceWrites: 0, verifierFiles: 0 }));
}
