import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { isBuiltin } from "node:module";

test("actual Worker login, DO authorization, R2 space and revocation work without a model", async () => {
  const built = await build({ entryPoints: ["src/app/bibo-hosted.app.ts"], bundle: true, format: "esm", platform: "neutral", target: "es2022",
    mainFields: ["module", "main"], conditions: ["workerd"], external: ["node:*", "cloudflare:*"],
    tsconfig: "tsconfig.json", write: false,
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire("/");' },
    plugins: [{ name: "sandbox-not-used", setup(builder) {
      builder.onResolve({ filter: /^@cloudflare\/sandbox$/ }, () => ({ path: "sandbox", namespace: "stub" }));
      builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: 'import { DurableObject } from "cloudflare:workers"; export class Sandbox extends DurableObject {} export class ContainerProxy extends DurableObject {} export function getSandbox(){ throw new Error("API must not acquire a sandbox"); }' }));
      builder.onResolve({ filter: /^[\w/]+$/ }, (args) => isBuiltin(args.path) ? { path: `node:${args.path}`, external: true } : undefined);
    } }],
  });
  const worker = new Miniflare({ modules: true, script: built.outputFiles[0]!.text, compatibilityDate: "2026-09-24", compatibilityFlags: ["nodejs_compat"],
    bindings: { BIBO_AUTH_MODE: "self-hosted", BIBO_OWNER_EMAIL: "owner@example.test", BIBO_OWNER_PASSWORD: "test-only-password-123456" },
    r2Buckets: ["SNAPSHOTS"], durableObjects: { BIBO_USER: { className: "BiboUserContainer", useSQLite: true }, BIBO_MODEL_BUDGET: { className: "BiboModelBudget", useSQLite: true }, BIBO_DEVICE_AUTH: { className: "BiboDeviceAuthorization", useSQLite: true } },
  });
  const origin = "https://bibo.test";
  const request = (path: string, init?: Parameters<Miniflare["dispatchFetch"]>[1]) => worker.dispatchFetch(origin + path, init);
  try {
    const login = await request("/api/auth/login", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: "owner@example.test", password: "test-only-password-123456" }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const create = await request("/api/integrations", { method: "POST", headers: { origin, cookie }, body: JSON.stringify({ operation: "create", name: "Worker smoke", scopes: ["space:read", "space:write"] }) });
    assert.equal(create.status, 201, await create.clone().text());
    const key = await create.json() as { token: string; integration: { id: string } };
    const headers = { authorization: `Bearer ${key.token}` };
    const action = (action: string, input: unknown) => request("/api/v1/space", { method: "POST", headers, body: JSON.stringify({ action, input }) });
    const payload = { path: "worker-note.md", kind: "note", content: "real R2 and DO", requestId: "worker-once" };
    const created = await action("file.create", payload); assert.equal(created.status, 200, await created.clone().text());
    assert.deepEqual(await (await action("file.create", payload)).json().then((v: unknown) => (v as { result: unknown }).result), (await created.json() as { result: unknown }).result);
    const read = await action("file.get", { path: payload.path });
    assert.equal((await read.json() as { result: { content: string } }).result.content, payload.content);
    const browser = await request("/api/space", { method: "POST", headers: { origin, cookie }, body: JSON.stringify({ action: "file.get", input: { path: payload.path } }) });
    assert.equal((await browser.json() as { result: { content: string } }).result.content, payload.content);
    assert.equal((await request("/api/integrations", { method: "POST", headers: { cookie }, body: "{}" })).status, 403);
    const revoked = await request("/api/integrations", { method: "POST", headers: { origin, cookie }, body: JSON.stringify({ operation: "revoke", id: key.integration.id }) });
    assert.equal(revoked.status, 200);
    assert.equal((await request("/api/v1/me", { headers })).status, 401);
    const begin = await request("/api/auth/device/code", { method: "POST", body: JSON.stringify({ client_id: "bibo-cli", scope: "space:read" }) });
    assert.equal(begin.status, 200);
    const device = await begin.json() as { device_code: string; user_code: string; verification_uri_complete: string };
    const code = device.user_code;
    assert.equal(new URL(device.verification_uri_complete).searchParams.get("user_code"), code.replaceAll("-", ""));
    assert.equal((await request(`/api/auth/device?user_code=${code}`)).status, 401);
    assert.equal((await request(`/api/auth/device?user_code=${code}`, { headers: { cookie } })).status, 200);
    const decision = { user_code: code, approve: true };
    assert.equal((await request("/api/auth/device/decision", { method: "POST", headers: { cookie }, body: JSON.stringify(decision) })).status, 403);
    assert.equal((await request("/api/auth/device/decision", { method: "POST", headers: { cookie, origin }, body: JSON.stringify(decision) })).status, 200);
    const tokenResponse = await request("/api/auth/device/token", { method: "POST", body: JSON.stringify({ client_id: "bibo-cli", device_code: device.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }) });
    assert.equal(tokenResponse.status, 200, await tokenResponse.clone().text());
    const cliToken = (await tokenResponse.json() as { access_token: string }).access_token;
    const cliHeaders = { authorization: `Bearer ${cliToken}` };
    assert.equal((await request("/api/v1/me", { headers: cliHeaders })).status, 200);
    assert.equal((await request("/api/v1/space", { method: "POST", headers: cliHeaders, body: JSON.stringify({ action: "task.create", input: { title: "must not write" } }) })).status, 403);
    assert.equal((await request("/api/v1/auth/revoke", { method: "POST", headers: cliHeaders })).status, 200);
  } finally { await worker.dispose(); }
});
