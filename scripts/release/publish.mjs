import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REF !== "refs/heads/main") throw new Error("Stable publishing runs only from main in GitHub Actions.");
const records = JSON.parse(await readFile(new URL("../../.local/release/packages.json", import.meta.url), "utf8"));
for (const record of records) {
  const spec = `${record.name}@${record.version}`;
  let existing;
  try { existing = JSON.parse(execFileSync("npm", ["view", spec, "dist.integrity", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })); }
  catch (error) { if (!String(error.stderr).includes("E404")) throw new Error(`Unable to check registry for ${spec}`); }
  const expected = `sha512-${createHash("sha512").update(await readFile(record.archive)).digest("base64")}`;
  if (existing) {
    if (existing !== expected) throw new Error(`${spec} already exists with different contents. Bump the version.`);
    console.log(`Already published and verified: ${spec}`); continue;
  }
  execFileSync("npm", ["publish", record.archive, "--access", "public"], { stdio: "inherit" });
  const actual = JSON.parse(execFileSync("npm", ["view", spec, "dist.integrity", "--json"], { encoding: "utf8" }));
  if (actual !== expected) throw new Error(`Registry integrity mismatch: ${spec}`);
  console.log(`Published and verified: ${spec}`);
}
