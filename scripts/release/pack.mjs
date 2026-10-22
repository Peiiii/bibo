import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = join(root, ".local/release");
await mkdir(output, { recursive: true });
const packages = ["bibo-api", "bibo-cli"], records = [];
for (const name of packages) {
  const directory = join(root, "packages", name);
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  execFileSync("pnpm", ["-C", directory, "pack", "--pack-destination", output], { stdio: "pipe" });
  const archive = join(output, `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`);
  const entries = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n");
  if (entries.some((entry) => !/^package\/(dist\/|skill\/|package.json$|README.md$|LICENSE$)/.test(entry))) throw new Error(`Unexpected packed file in ${name}`);
  const packed = JSON.parse(execFileSync("tar", ["-xOf", archive, "package/package.json"], { encoding: "utf8" }));
  if (JSON.stringify(packed).includes("workspace:") || packed.private) throw new Error("Package manifest is not publishable");
  records.push({ name: manifest.name, version: manifest.version, archive, files: entries.length });
}
const temporary = await mkdtemp(join(tmpdir(), "bibo-packed-smoke-"));
try {
  await writeFile(join(temporary, "package.json"), JSON.stringify({ private: true, type: "module" }));
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...records.map((item) => item.archive)], { cwd: temporary, stdio: "pipe" });
  const cli = join(temporary, "node_modules/@nextclaw/bibo/dist/bin.js");
  const version = execFileSync(process.execPath, [cli, "--version"], { encoding: "utf8" }).trim();
  if (version !== records[1].version) throw new Error("Installed CLI version mismatch");
  execFileSync(process.execPath, [cli, "--help"], { stdio: "pipe" });
  execFileSync(process.execPath, [cli, "skill", "install", "--path", join(temporary, "skills")], { stdio: "pipe" });
  await readFile(join(temporary, "skills/bibo-space/SKILL.md"));
  execFileSync(process.execPath, ["--input-type=module", "-e", "import {BiboApi} from '@nextclaw/bibo-api'; const api=new BiboApi({token:'fixture'}); if(api.endpoint!=='https://app.bibo.bot') throw Error('bad endpoint');"], { cwd: temporary, stdio: "pipe" });
} finally { await rm(temporary, { recursive: true, force: true }); }
await writeFile(join(output, "packages.json"), `${JSON.stringify(records, null, 2)}\n`);
console.log(JSON.stringify({ packedSmoke: "passed", packages: records.map(({ archive, ...record }) => record) }));
