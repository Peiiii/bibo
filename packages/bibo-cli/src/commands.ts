import { parseArgs } from "node:util";
import { readFile, writeFile, cp, mkdir, lstat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BiboApi, normalizeBiboEndpoint } from "@nextclaw/bibo-api";
import { credentials, readConfig, readToken, removeConfig, writeConfig } from "./config.js";

const HELP = `Bibo — your shared personal context
Usage: bibo <command> [operation] [target] [options]

  auth login [--token-stdin]   Create a token in the web app, then log in
  auth status | logout       Inspect identity or revoke this token and sign out
  actions                    Discover the live action catalog
  overview                   Read the space overview
  project|task|event          list, get, create, update, delete
  inbox                      list, get, create, read, resolve
  file|note                  list, get, create, update, move, delete
  assets upload <file>       Upload an image (max 10 MiB)
  assets download <id> --out <file>
  call <action> --input '<JSON>'    Direct action access
  skill path | print | install --path <skills-directory> [--force]

Options: --endpoint <origin> --input <JSON|@file> --content-file <file>
  --title --name --content --path --kind --description --status --priority
  --project-id --start-at --due-at --end-at --from --to --due-before --due-from
  --id --version --request-id --query --parent-path --limit --cursor
  --open --unread --unresolved --raw --local-only --help --version

Updates read the current version first unless --version is supplied.
Writes print their requestId; reuse it with identical input for safe retries.
Docs: https://app.bibo.bot/docs/
`;
const stringOptions = ["endpoint", "input", "content-file", "title", "name", "content", "path", "kind", "description", "status", "priority", "project-id", "start-at", "due-at", "end-at", "from", "to", "due-before", "due-from", "id", "version", "request-id", "query", "parent-path", "limit", "cursor", "body", "sort", "ancestor-of", "out"];
const booleanOptions = ["help", "token-stdin", "raw", "local-only", "force", "open", "unread", "unresolved"];
const camel = (key: string): string => key.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
type Input = Record<string, unknown>;
const output = (value: unknown): void => { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); };
export const skillDirectory = (): string => fileURLToPath(new URL("../skill/", import.meta.url));

export async function run(argv: string[]): Promise<void> {
  if (argv.length === 1 && argv[0] === "--version") {
    const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    process.stdout.write(`${manifest.version}\n`); return;
  }
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    ...Object.fromEntries(stringOptions.map((name) => [name, { type: "string" as const }])),
    ...Object.fromEntries(booleanOptions.map((name) => [name, { type: "boolean" as const }])),
  } });
  const option = (key: string): string | undefined => typeof values[key] === "string" ? values[key] as string : undefined;
  const [noun, verb, target] = positionals;
  if (!noun || values.help) { process.stdout.write(HELP); return; }
  if (positionals.length > 3) throw new Error("Too many positional arguments. Use --input for structured fields.");
  if (noun === "skill") {
    if (verb === "path") { process.stdout.write(`${skillDirectory()}\n`); return; }
    if (verb === "print") { process.stdout.write(await readFile(join(skillDirectory(), "SKILL.md"), "utf8")); return; }
    if (verb !== "install" || !option("path")) throw new Error("Usage: bibo skill install --path <skills-directory> [--force]");
    const destination = resolve(option("path")!, "bibo-space");
    let exists = false; try { await lstat(destination); exists = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (exists && !values.force) throw new Error("Skill already exists. Review it or explicitly use --force.");
    await mkdir(dirname(destination), { recursive: true });
    await cp(skillDirectory(), destination, { recursive: true, force: Boolean(values.force), errorOnExist: !values.force });
    output({ installed: destination }); return;
  }
  if (noun === "auth" && verb === "login") {
    const existing = await readConfig();
    const endpoint = normalizeBiboEndpoint(option("endpoint") || process.env.BIBO_ENDPOINT || existing?.endpoint);
    process.stderr.write(`Create a scoped token at ${endpoint}/integrations\n`);
    const token = await readToken(Boolean(values["token-stdin"]));
    const identity = await new BiboApi({ endpoint, token }).me();
    await writeConfig({ endpoint, token }); output({ authenticated: true, endpoint, ...identity }); return;
  }
  const credential = await credentials(option("endpoint"));
  const api = new BiboApi(credential);
  if (noun === "auth") {
    if (verb === "status") { output({ endpoint: api.endpoint, ...await api.me() }); return; }
    if (verb === "logout") {
      if (!values["local-only"]) await api.revoke();
      await removeConfig(api.endpoint); output({ loggedOut: true, revoked: !values["local-only"] }); return;
    }
    throw new Error("Usage: bibo auth login|status|logout");
  }
  if (noun === "actions") { output({ result: await api.actions() }); return; }
  if (noun === "overview") { output({ result: await api.call("overview.get") }); return; }
  if (noun === "assets") {
    if (verb === "upload" && target) { output({ result: await api.uploadAsset(await readFile(target)) }); return; }
    if (verb === "download" && target && option("out")) {
      const bytes = await api.downloadAsset(target);
      await writeFile(option("out")!, bytes, { flag: values.force ? "w" : "wx" });
      output({ saved: resolve(option("out")!), bytes: bytes.byteLength }); return;
    }
    throw new Error("Usage: bibo assets upload <file> | download <id> --out <file> [--force]");
  }
  const source = option("input");
  let input: Input = source ? JSON.parse(source.startsWith("@") ? await readFile(source.slice(1), "utf8") : source) as Input : {};
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("--input must be a JSON object.");
  const ignored = ["endpoint", "input", "content-file", "out", ...booleanOptions];
  for (const [key, value] of Object.entries(values)) if (!ignored.includes(key) && value !== undefined) {
    input[camel(key)] = key === "limit" ? Number(value) : key === "version" && noun !== "file" && noun !== "note" && /^\d+$/.test(String(value)) ? Number(value) : value;
  }
  for (const key of ["open", "unread", "unresolved"]) if (values[key]) input[key] = true;
  if (option("content-file")) input.content = await readFile(option("content-file")!, "utf8");
  let action: string;
  if (noun === "call") { if (!verb) throw new Error("Specify an action."); action = verb; }
  else {
    if (!["project", "task", "event", "inbox", "file", "note"].includes(noun)) throw new Error("Unknown command. Run bibo --help.");
    const domain = noun === "note" ? "file" : noun;
    const allowed = domain === "inbox" ? ["list", "get", "create", "read", "resolve"] : ["list", "get", "create", "update", "delete", ...(domain === "file" ? ["move"] : [])];
    if (!verb || !allowed.includes(verb)) throw new Error(`Usage: bibo ${noun} ${allowed.join("|")}`);
    action = `${domain}.${verb}`;
    if (target) input[domain === "file" && verb === "get" ? "path" : "id"] = target;
    if (noun === "note" && ["list", "create"].includes(verb)) input.kind = "note";
    if (domain === "file" && verb === "create" && input.kind === undefined) input.kind = "document";
    if (["update", "delete", "move", "read", "resolve"].includes(verb) && input.version === undefined) {
      const current = await api.call<{ id: string; version: number | string }>(`${domain}.get`,
        { ...(input.id ? { id: input.id } : { path: input.path }) });
      input.id = current.id; input.version = current.version;
    }
  }
  if (values.raw && action !== "file.get") throw new Error("--raw is only available for file/note get.");
  const write = !/\.(list|get)$/.test(action);
  if (write && input.requestId === undefined) input.requestId = crypto.randomUUID();
  let result: { content?: string | null };
  try { result = await api.call<{ content?: string | null }>(action, input); }
  catch (error) {
    if (write && error && typeof error === "object") Object.assign(error, { clientRequestId: input.requestId });
    throw error;
  }
  if (values.raw) {
    if (typeof result.content !== "string") throw new Error("--raw requires a readable text file.");
    process.stdout.write(result.content); return;
  }
  output({ result, ...(write ? { requestId: input.requestId } : {}) });
}
