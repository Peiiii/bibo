import assert from "node:assert/strict";
import test from "node:test";
import { BiboApi, BiboApiError, normalizeBiboEndpoint } from "./index.js";

test("SDK binds credentials to an origin, refuses redirects and preserves structured errors", async () => {
  for (const value of ["http://example.com", "https://a:b@example.com", "https://example.com/path", "https://example.com?token=x", "file:///tmp/test"]) assert.throws(() => normalizeBiboEndpoint(value));
  assert.equal(normalizeBiboEndpoint("http://127.0.0.1:8123/"), "http://127.0.0.1:8123");
  let calls = 0;
  const api = new BiboApi({ token: "private", fetch: (async (url, init) => {
    calls++; assert.equal(url, "https://app.bibo.bot/api/v1/space");
    assert.equal(init?.redirect, "error"); assert.equal(init?.credentials, "omit");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer private");
    return Response.json({ error: { code: "CONFLICT", message: "version conflict" }, requestId: "trace" }, { status: 409 });
  }) as typeof fetch });
  await assert.rejects(api.call("task.update", { id: "id", version: 1 }), (error: unknown) => error instanceof BiboApiError && error.status === 409 && error.code === "CONFLICT" && error.requestId === "trace");
  assert.equal(calls, 1, "writes never retry automatically");
  const offline = new BiboApi({ token: "private", fetch: (async () => { throw new Error("secret in network internals"); }) as typeof fetch });
  await assert.rejects(offline.me(), (error: unknown) => error instanceof BiboApiError && error.code === "NETWORK_ERROR" && !error.message.includes("secret"));
});
