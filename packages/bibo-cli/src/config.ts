import { chmod, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeBiboEndpoint } from "@nextclaw/bibo-api";

type Config = { endpoint: string; token: string };
export const configPath = (): string => join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "bibo", "config.json");

export async function readConfig(): Promise<Config | null> {
  const path = configPath();
  let info;
  try { info = await lstat(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  if (!info.isFile() || info.isSymbolicLink() || (process.platform !== "win32" && (info.mode & 0o077))) {
    throw new Error("Bibo config must be a regular private file (chmod 600). Do not use a symlink.");
  }
  let value: Config;
  try { value = JSON.parse(await readFile(path, "utf8")) as Config; }
  catch { throw new Error("Invalid Bibo config. Log in again."); }
  if (!value || typeof value.token !== "string" || !value.token || typeof value.endpoint !== "string") throw new Error("Invalid Bibo config. Log in again.");
  return { endpoint: normalizeBiboEndpoint(value.endpoint), token: value.token };
}

export async function writeConfig(config: Config): Promise<void> {
  const path = configPath(), directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Bibo config directory must not be a symlink.");
  await chmod(directory, 0o700);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(config)}\n`, { mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}
export async function removeConfig(endpoint: string): Promise<void> {
  if ((await readConfig())?.endpoint === endpoint) await rm(configPath(), { force: true });
}

export async function credentials(endpointOption?: string): Promise<Config> {
  const config = await readConfig();
  const endpoint = normalizeBiboEndpoint(endpointOption || process.env.BIBO_ENDPOINT || config?.endpoint);
  const token = process.env.BIBO_API_TOKEN || (config?.endpoint === endpoint ? config.token : null);
  if (!token) throw new Error("Run bibo auth login, or set BIBO_API_TOKEN. Tokens are bound to their endpoint.");
  return { endpoint, token };
}

export async function readToken(fromStdin: boolean): Promise<string> {
  if (fromStdin) {
    let token = "";
    for await (const chunk of process.stdin) {
      token += chunk.toString();
      if (token.length > 1024) throw new Error("Access token is too long.");
    }
    return token.trim();
  }
  if (!process.stdin.isTTY) throw new Error("Use --token-stdin when piping a token.");
  process.stderr.write("Paste access token (hidden): ");
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error): void => {
      process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off("data", receive);
      process.stderr.write("\n");
      if (error) reject(error); else resolve(value.trim());
    };
    const receive = (chunk: Buffer): void => {
      for (const char of chunk.toString()) {
        if (char === "\u0003") { finish(new Error("Login cancelled.")); return; }
        if (char === "\r" || char === "\n") { finish(); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
        if (value.length > 1024) { finish(new Error("Access token is too long.")); return; }
      }
    };
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on("data", receive);
  });
}
