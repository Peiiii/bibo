import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

test("remote CLI login polls pending/slow_down, saves privately, and never prints its device secret or token", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "bibo-device-cli-"));
  const deviceSecret = `bibo_dc_v1_ABCD2345.${"s".repeat(43)}`, accessToken = "fixture-device-access-secret";
  const polls: number[] = [];
  let endpoint = "", scope = "";
  const server = createServer(async (request, response) => {
    let raw = ""; for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    response.setHeader("content-type", "application/json");
    const send = (status: number, value: unknown) => { response.statusCode = status; response.end(JSON.stringify(value)); };
    if (request.url === "/api/auth/device/code") {
      scope = body.scope; assert.equal(body.client_id, "bibo-cli");
      send(200, { device_code: deviceSecret, user_code: "ABCD-2345", verification_uri: `${endpoint}/authorize`, verification_uri_complete: `${endpoint}/authorize?user_code=ABCD2345`, expires_in: 30, interval: 1 }); return;
    }
    if (request.url === "/api/auth/device/token") {
      assert.equal(body.device_code, deviceSecret); assert.equal(body.grant_type, "urn:ietf:params:oauth:grant-type:device_code");
      polls.push(Date.now());
      if (polls.length < 3) { send(400, { error: polls.length === 1 ? "authorization_pending" : "slow_down" }); return; }
      send(200, { access_token: accessToken, token_type: "Bearer" }); return;
    }
    assert.equal(request.headers.authorization, `Bearer ${accessToken}`);
    send(200, { result: { userId: "test-user", integration: { scopes: ["space:read"] } } });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const output = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ["dist/bin.js", "auth", "login", "--endpoint", endpoint, "--no-browser", "--read-only"],
        { env: { ...process.env, BIBO_API_TOKEN: "", BIBO_ENDPOINT: "", XDG_CONFIG_HOME: temporary }, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", reject); child.on("exit", (code) => resolve({ code, stdout, stderr }));
    });
    assert.equal(output.code, 0, output.stderr);
    assert.equal(scope, "space:read"); assert.equal(polls.length, 3);
    assert.ok(polls[2] - polls[1] >= 5800, "slow_down adds five seconds to the original polling interval");
    assert.match(output.stderr, /ABCD-2345/); assert.match(output.stderr, /Waiting for browser approval/);
    assert.ok(!`${output.stdout}${output.stderr}`.includes(deviceSecret));
    assert.ok(!`${output.stdout}${output.stderr}`.includes(accessToken));
    const config = join(temporary, "bibo/config.json");
    assert.equal((await stat(config)).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await readFile(config, "utf8")).token, accessToken);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); await rm(temporary, { recursive: true, force: true }); }
});

test("cancelled login aborts waiting and leaves no credentials", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "bibo-device-cancel-"));
  const server = createServer((_request, response) => {
    const endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ device_code: "fixture-private", user_code: "ABCD-2345", verification_uri: `${endpoint}/authorize`, expires_in: 30, interval: 5 }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, ["dist/bin.js", "auth", "login", "--endpoint", endpoint, "--no-browser"], { env: { ...process.env, XDG_CONFIG_HOME: temporary }, stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; if (stderr.includes("Waiting for browser approval")) child.kill("SIGINT"); });
      child.on("error", reject); child.on("exit", () => resolve(stderr));
    });
    assert.match(output, /Login cancelled/);
    await assert.rejects(stat(join(temporary, "bibo/config.json")), { code: "ENOENT" });
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); await rm(temporary, { recursive: true, force: true }); }
});
