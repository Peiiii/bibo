import assert from "node:assert/strict";
import { readFile, stat, mkdtemp, writeFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const origin = "https://app.bibo.bot";
const cliPath = process.env.BIBO_LIVE_CLI;
if (!cliPath || !resolve(cliPath).includes("node_modules/@nextclaw/bibo/dist/bin.js")) throw new Error("Set BIBO_LIVE_CLI to a freshly registry-installed CLI binary.");
const accountPath = join(homedir(), ".config/bibo-hosted/smoke-account.json");
assert.equal((await stat(accountPath)).mode & 0o077, 0, "Smoke account file must be private");
const account = JSON.parse(await readFile(accountPath, "utf8")) as { origin: string; email: string; password: string; userId: string };
assert.equal(account.origin, origin);
const login = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({ email: account.email, password: account.password }), signal: AbortSignal.timeout(30_000) });
assert.equal(login.status, 200, "Production test account must authenticate");
const cookie = login.headers.get("set-cookie")?.match(/bibo_session=([^;]+)/)?.[1];
assert.ok(cookie);
const temporary = await mkdtemp(join(tmpdir(), "bibo-published-live-"));
const prefix = `bibo-api-smoke-${crypto.randomUUID().slice(0, 8)}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addCookies([{ name: "bibo_session", value: cookie, domain: "app.bibo.bot", path: "/", httpOnly: true, secure: true, sameSite: "Lax" }]);
let token = "", readToken = "", cliLoggedIn = false;
let projectId = "", taskId = "", eventId = "", folderCreated = false;
const checkpoints: string[] = [];
const manage = async (input?: unknown) => {
  const response = await fetch(`${origin}/api/integrations`, { headers: { cookie: `bibo_session=${cookie}`, origin, "content-type": "application/json" },
    ...(input ? { method: "POST", body: JSON.stringify(input) } : {}), signal: AbortSignal.timeout(30_000) });
  assert.ok(response.ok, `Integration management returned ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
};
const webSpace = async (action: string, input: Record<string, unknown>) => {
  const response = await fetch(`${origin}/api/space`, { method: "POST", headers: { cookie: `bibo_session=${cookie}`, origin, "content-type": "application/json" }, body: JSON.stringify({ action, input }), signal: AbortSignal.timeout(30_000) });
  assert.ok(response.ok, `${action} through web returned ${response.status}`);
  return (await response.json() as { result: Record<string, unknown> }).result;
};
const run = (args: string[], stdin = "", expected = 0) => new Promise<Record<string, unknown>>((resolve, reject) => {
  const env: NodeJS.ProcessEnv = { ...process.env, XDG_CONFIG_HOME: temporary };
  delete env.BIBO_API_TOKEN; delete env.BIBO_ENDPOINT;
  const child = spawn(process.execPath, [cliPath, ...args], { env, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject); child.on("close", (code) => {
    if (token && `${stdout}${stderr}`.includes(token)) { reject(new Error("CLI exposed its credential")); return; }
    if (code !== expected) { reject(new Error(`Published CLI ${args.slice(0, 2).join(" ")} exited ${code}: ${stderr.slice(0, 300)}`)); return; }
    try { resolve(stdout ? JSON.parse(stdout) as Record<string, unknown> : {}); } catch { reject(new Error("CLI returned invalid JSON")); }
  }); child.stdin.end(stdin);
});
const result = async (args: string[]): Promise<Record<string, unknown>> => (await run(args)).result as Record<string, unknown>;
try {
  for (const path of ["/docs/", "/docs/guide/quickstart", "/docs/api/reference", "/docs/cli/reference", "/docs/guide/skill"]) {
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(30_000) });
    assert.equal(response.status, 200, path); assert.match(await response.text(), /name="generator" content="VitePress/);
  }
  assert.equal((await fetch(`${origin}/docs/`, { method: "HEAD" })).status, 200);
  assert.equal((await fetch(`${origin}/docs/does-not-exist-${prefix}`)).status, 404);
  assert.match(await (await fetch(`${origin}/docs/downloads/bibo-space/SKILL.md`)).text(), /name: bibo-space/);
  const openapi = await (await fetch(`${origin}/docs/openapi.json`)).json() as { paths: Record<string, unknown> };
  assert.ok(openapi.paths["/space"]); checkpoints.push("anonymous docs, clean URLs, downloads and OpenAPI");

  const page = await context.newPage();
  await page.goto(`${origin}/integrations`);
  await page.getByLabel("授权给谁").fill(prefix);
  await page.getByLabel("空间权限").selectOption("write");
  await page.getByLabel("有效期").selectOption("1");
  await page.getByRole("button", { name: "创建令牌", exact: true }).click();
  await page.getByRole("dialog", { name: "保存你的访问令牌" }).waitFor();
  token = await page.getByLabel("访问令牌", { exact: true }).inputValue();
  assert.match(token, /^bibo_v1_/);
  await page.getByRole("button", { name: "我已保存，关闭" }).click();
  await page.getByLabel("访问令牌", { exact: true }).waitFor({ state: "detached" });
  assert.equal(await page.getByLabel("访问令牌", { exact: true }).count(), 0);
  await run(["auth", "login", "--token-stdin"], `${token}\n`);
  cliLoggedIn = true;
  assert.equal((await stat(join(temporary, "bibo/config.json"))).mode & 0o777, 0o600);
  assert.equal((await run(["auth", "status"])).userId, account.userId);
  assert.ok(((await run(["actions"])).result as unknown[]).length >= 27);
  checkpoints.push("real web token creation, hidden credential handoff and published CLI login");

  const project = await result(["project", "create", "--name", prefix]); projectId = String(project.id);
  const task = await result(["task", "create", "--title", prefix, "--project-id", projectId]); taskId = String(task.id);
  const event = await result(["event", "create", "--title", prefix, "--start-at", new Date(Date.now() + 3_600_000).toISOString(), "--end-at", new Date(Date.now() + 7_200_000).toISOString()]); eventId = String(event.id);
  await result(["file", "create", "--path", prefix, "--kind", "folder"]); folderCreated = true;
  const createNote = ["note", "create", "--path", `${prefix}/plan.md`, "--content", `# ${prefix}\nVerified cloud context.`, "--request-id", `${prefix}-note`];
  const note = await result(createNote); assert.deepEqual(await result(createNote), note);
  assert.equal((await webSpace("file.get", { path: `${prefix}/plan.md` })).content, note.content);
  await page.goto(`${origin}/notes/${prefix}/plan.md`);
  await page.getByText("Verified cloud context.", { exact: false }).first().waitFor();
  await result(["note", "update", `${prefix}/plan.md`, "--content", `# ${prefix}\nUpdated by published CLI.`]);
  await result(["file", "move", `${prefix}/plan.md`, "--path", `${prefix}/final.md`]);
  assert.match(String((await result(["file", "get", `${prefix}/final.md`])).content), /Updated by published CLI/);
  await result(["task", "update", taskId, "--status", "done"]);
  assert.equal((await webSpace("task.get", { id: taskId })).status, "done");
  await run(["task", "update", taskId, "--status", "active", "--version", "999999"], "", 4);
  await result(["project", "update", projectId, "--name", `${prefix}-updated`]);
  await result(["event", "update", eventId, "--description", "Published API smoke verified"]);
  const inbox = await result(["inbox", "create", "--title", `[API验收] ${prefix}`, "--body", "Published CLI integration verified; this test receipt is resolved below."]);
  await result(["inbox", "read", String(inbox.id)]); await result(["inbox", "resolve", String(inbox.id)]);
  checkpoints.push("shared notes, files, project, task, event, inbox, idempotency and version conflict");

  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64");
  const upload = join(temporary, "image.png"), download = join(temporary, "download.png"); await writeFile(upload, image);
  const asset = await result(["assets", "upload", upload]);
  await run(["assets", "download", String(asset.id), "--out", download]); assert.deepEqual(await readFile(download), image);
  const readKey = await manage({ operation: "create", name: `${prefix}-readonly`, scopes: ["space:read"], expiresInDays: 1 }); readToken = String(readKey.token);
  const denied = await fetch(`${origin}/api/v1/space`, { method: "POST", headers: { authorization: `Bearer ${readToken}` }, body: JSON.stringify({ action: "task.create", input: { title: "Must not exist" } }) });
  assert.equal(denied.status, 403);
  await manage({ operation: "revoke", id: (readKey.integration as { id: string }).id }); readToken = "";
  await run(["skill", "install", "--path", join(temporary, "skills")]);
  assert.match(await readFile(join(temporary, "skills/bibo-space/SKILL.md"), "utf8"), /name: bibo-space/);
  checkpoints.push("image bytes, read-only denial, token revocation and packaged Skill");
} finally {
  // Only exact IDs/paths created by this run are eligible for cleanup.
  try {
    if (folderCreated) { const folder = await webSpace("file.get", { path: prefix }); await webSpace("file.delete", { id: folder.id, version: folder.version }); }
    for (const [domain, id] of [["task", taskId], ["event", eventId], ["project", projectId]]) if (id) {
      const item = await webSpace(`${domain}.get`, { id }); await webSpace(`${domain}.delete`, { id, version: item.version });
    }
    if (cliLoggedIn) await run(["auth", "logout"]);
    const keys = (await manage()).integrations as { id: string; name: string }[];
    for (const key of keys.filter((key) => key.name === prefix || key.name === `${prefix}-readonly`)) await manage({ operation: "revoke", id: key.id });
    if (token) assert.equal((await fetch(`${origin}/api/v1/me`, { headers: { authorization: `Bearer ${token}` } })).status, 401);
  } finally { await browser.close(); await rm(temporary, { recursive: true, force: true }); }
}
console.log(JSON.stringify({ production: "passed", checkpoints, cleanup: "exact test objects and all test keys removed; one resolved inbox receipt and tiny test image retained in dedicated smoke account" }));
