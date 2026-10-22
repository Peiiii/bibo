import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { registryIntegrity, waitForRegistryIntegrity } from "./registry.mjs";
import { writeFile } from "node:fs/promises";

if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REF !== "refs/heads/main") throw new Error("Stable publishing runs only from main in GitHub Actions.");
const records = JSON.parse(await readFile(new URL("../../.local/release/packages.json", import.meta.url), "utf8"));
const accepted = [];
for (const record of records) {
  const spec = `${record.name}@${record.version}`;
  const existing = registryIntegrity(spec);
  const expected = `sha512-${createHash("sha512").update(await readFile(record.archive)).digest("base64")}`;
  if (existing) {
    if (existing !== expected) throw new Error(`${spec} already exists with different contents. Bump the version.`);
    console.log(`Already published and verified: ${spec}`); continue;
  }
  execFileSync("npm", ["publish", record.archive, "--access", "public"], { stdio: "inherit" });
  accepted.push({ spec, integrity: expected, acceptedAt: new Date().toISOString() });
  await writeFile(new URL("../../.local/release/accepted.json", import.meta.url), `${JSON.stringify(accepted, null, 2)}\n`);
  await waitForRegistryIntegrity(spec, expected);
  console.log(`Published and verified: ${spec}`);
}
