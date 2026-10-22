import assert from "node:assert/strict";
import test from "node:test";
import { BiboIntegrationKeys, parseIntegrationToken } from "./bibo-integration-keys.service";

test("tokens are hashed, private, tenant bound, expiring, revocable and rate limited", async () => {
  const values = new Map<string, unknown>();
  const storage = { get: async (key: string) => structuredClone(values.get(key)), put: async (key: string, value: unknown) => { values.set(key, structuredClone(value)); } } as unknown as Pick<DurableObjectStorage, "get" | "put">;
  let now = Date.parse("2026-10-22T12:00:00Z");
  const keys = new BiboIntegrationKeys(storage, () => now);
  await assert.rejects(keys.create("user", { name: "bad", scopes: ["space:write"] }), /权限/);
  await assert.rejects(keys.create("user", { name: "bad", scopes: ["space:read"], expiresInDays: 0 }), /有效期/);
  const created = await keys.create("用户-1", { name: "Agent", scopes: ["space:read"], expiresInDays: 1 });
  assert.equal(parseIntegrationToken(created.token)?.userId, "用户-1");
  assert.ok(!JSON.stringify([...values]).includes(created.token));
  assert.ok(!JSON.stringify(await keys.list()).includes("hash"));
  assert.equal((await keys.authenticate(created.token)).userId, "用户-1");
  const parts = created.token.split("."); parts[0] = "bibo_v1_dXNlcg";
  await assert.rejects(keys.authenticate(parts.join(".")), { status: 401 });
  for (let i = 1; i < 60; i++) await keys.authenticate(created.token);
  await assert.rejects(keys.authenticate(created.token), { status: 429 });
  now += 60_000; await keys.authenticate(created.token);
  now += 86_400_000; await assert.rejects(keys.authenticate(created.token), { status: 401 });
  const replacement = await keys.create("用户-1", { name: "New", scopes: ["space:read", "space:write"] });
  await keys.revoke(replacement.integration.id);
  await assert.rejects(new BiboIntegrationKeys(storage, () => now).authenticate(replacement.token), { status: 401 });
  for (const token of ["", "bibo_v1_", "../bad", "bibo_v1_a.a.a", "x".repeat(2000)]) assert.equal(parseIntegrationToken(token), null);
});

test("key metadata remains bounded to twenty active authorizations", async () => {
  const values = new Map<string, unknown>();
  const storage = { get: async (key: string) => structuredClone(values.get(key)), put: async (key: string, value: unknown) => { values.set(key, structuredClone(value)); } } as unknown as Pick<DurableObjectStorage, "get" | "put">;
  const keys = new BiboIntegrationKeys(storage);
  for (let i = 0; i < 20; i++) await keys.create("user", { name: `key ${i}`, scopes: ["space:read"] });
  await assert.rejects(keys.create("user", { name: "extra", scopes: ["space:read"] }), { status: 409 });
});
