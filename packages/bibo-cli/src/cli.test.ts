import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

test("CLI logs in privately, uses object commands, handles conflicts, installs Skill and revokes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bibo-cli-"));
  let revoked = false;
  const calls: { action: string; input: Record<string, unknown> }[] = [];
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    const send = (status: number, value: unknown): void => { response.statusCode = status; response.end(JSON.stringify(value)); };
    if (request.headers.authorization !== "Bearer fixture-secret" || revoked) { send(401, { error: { code: "UNAUTHORIZED", message: "revoked" } }); return; }
    if (request.url === "/api/v1/me") { send(200, { result: { userId: "test", integration: { name: "CLI", scopes: ["space:read", "space:write"] } } }); return; }
    if (request.url === "/api/v1/auth/revoke") { revoked = true; send(200, { result: { revoked: "test" } }); return; }
    let raw = ""; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw) as { action: string; input: Record<string, unknown> }; calls.push(body);
    if (body.action === "task.update" && body.input.version !== 2) { send(409, { error: { code: "CONFLICT", message: "stale version" }, requestId: "server-trace" }); return; }
    send(200, { result: body.action.endsWith(".get") ? { id: body.input.id ?? body.input.path, version: body.action.startsWith("file") ? "etag-1" : 2, content: "verified note" }
      : { id: "created", ...body.input } });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number }, endpoint = `http://127.0.0.1:${address.port}`;
  const cli = (args: string[], input = "", env: Record<string, string> = {}) => new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["dist/bin.js", ...args], { env: { ...process.env, BIBO_API_TOKEN: "", BIBO_ENDPOINT: "", XDG_CONFIG_HOME: directory, ...env }, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject); child.on("close", (code) => resolve({ code, stdout, stderr })); child.stdin.end(input);
  });
  // Empty env overrides must be removed, just like a clean agent process.
  const run = (args: string[], input = "") => cli(args, input, { BIBO_API_TOKEN: "fixture-secret", BIBO_ENDPOINT: endpoint });
  try {
    const login = await run(["auth", "login", "--endpoint", endpoint, "--token-stdin"], "fixture-secret\n");
    assert.equal(login.code, 0, login.stderr); assert.ok(!`${login.stdout}${login.stderr}`.includes("fixture-secret"));
    assert.equal((await stat(join(directory, "bibo/config.json"))).mode & 0o777, 0o600);
    assert.equal((await stat(join(directory, "bibo"))).mode & 0o777, 0o700);
    assert.equal(JSON.parse(await readFile(join(directory, "bibo/config.json"), "utf8")).endpoint, endpoint);
    assert.equal((await cli(["auth", "status"])).code, 0, "stored credentials work without environment secrets");
    assert.equal((await cli(["auth", "status", "--endpoint", "https://different.example"])).code, 2, "stored token is not forwarded to another endpoint");
    const created = await run(["task", "create", "--title", "My task", "--request-id", "stable"]);
    assert.equal(created.code, 0, created.stderr); assert.equal(calls.at(-1)?.input.requestId, "stable");
    const beforeInvalid = calls.length;
    assert.equal((await run(["task", "create", "--title", "Must not write", "--raw"])).code, 2);
    assert.equal(calls.length, beforeInvalid, "invalid output options are rejected before mutation");
    const update = await run(["task", "update", "task-id", "--status", "done"]);
    assert.equal(update.code, 0, update.stderr); assert.equal(calls.at(-2)?.action, "task.get"); assert.equal(calls.at(-1)?.input.version, 2);
    const conflict = await run(["task", "update", "task-id", "--status", "done", "--version", "1"]);
    assert.equal(conflict.code, 4); assert.ok(conflict.stderr.includes("CONFLICT"));
    const note = await run(["note", "get", "note.md", "--raw"]); assert.equal(note.stdout, "verified note");
    const move = await run(["file", "move", "old.md", "--path", "new.md"]); assert.equal(move.code, 0, move.stderr);
    assert.deepEqual({ ...calls.at(-1)?.input, requestId: "generated" }, { id: "old.md", path: "new.md", version: "etag-1", requestId: "generated" });
    const skill = await run(["skill", "install", "--path", join(directory, "skills")]); assert.equal(skill.code, 0, skill.stderr);
    assert.match(await readFile(join(directory, "skills/bibo-space/SKILL.md"), "utf8"), /name: bibo-space/);
    assert.equal((await run(["skill", "install", "--path", join(directory, "skills")])).code, 2);
    assert.equal((await run(["auth", "logout"])).code, 0); assert.equal(revoked, true);
    await assert.rejects(stat(join(directory, "bibo/config.json")), { code: "ENOENT" });
    assert.equal((await run(["task", "list"])).code, 3);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); await rm(directory, { recursive: true, force: true }); }
});
