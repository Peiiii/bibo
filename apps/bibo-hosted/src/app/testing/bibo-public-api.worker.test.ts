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
    r2Buckets: ["SNAPSHOTS"], durableObjects: { BIBO_USER: { className: "BiboUserContainer", useSQLite: true }, BIBO_MODEL_BUDGET: { className: "BiboModelBudget", useSQLite: true } },
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
  } finally { await worker.dispose(); }
});
