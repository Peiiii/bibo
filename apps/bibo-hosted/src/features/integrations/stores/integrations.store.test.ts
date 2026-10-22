import assert from "node:assert/strict";
import test from "node:test";
import { createIntegrationsStore } from "./integrations.store";

test("list refresh serializes mutations so an older read cannot resurrect a revoked grant", async () => {
  let finish!: (items: never[]) => void;
  let reads = 0, writes = 0;
  const store = createIntegrationsStore({ integrations: () => ++reads === 1 ? Promise.resolve([]) : new Promise((resolve) => { finish = resolve; }),
    revokeIntegration: async () => { writes++; }, createIntegration: async () => { writes++; throw new Error("must not create during refresh"); } });
  await store.getState().load("one");
  const refresh = store.getState().load("one", true);
  assert.equal(await store.getState().revoke("key"), false);
  assert.equal(await store.getState().create({ name: "agent", scopes: ["space:read"], expiresInDays: 1 }), null);
  assert.equal(writes, 0);
  finish([]); await refresh;
  assert.equal(await store.getState().revoke("key"), true);
  assert.equal(writes, 1);
});

test("focus refresh cannot discard an in-flight one-time credential", async () => {
  let finish!: (value: { token: string; integration: never }) => void;
  let reads = 0;
  const store = createIntegrationsStore({ integrations: async () => { reads++; return []; }, revokeIntegration: async () => {},
    createIntegration: () => new Promise((resolve) => { finish = resolve; }) });
  await store.getState().load("one");
  const creating = store.getState().create({ name: "agent", scopes: ["space:read"], expiresInDays: 1 });
  await store.getState().load("one", true);
  assert.equal(reads, 1);
  assert.equal(store.getState().busy, true);
  finish({ token: "one-time-secret", integration: { id: "new-key" } as never });
  assert.equal(await creating, "one-time-secret");
  assert.equal(store.getState().items[0]?.id, "new-key");
});

test("account switches discard stale authorization loads and one-time secrets", async () => {
  let finish!: (value: { token: string; integration: never }) => void;
  const store = createIntegrationsStore({ integrations: async () => [], revokeIntegration: async () => {},
    createIntegration: () => new Promise((resolve) => { finish = resolve; }) });
  await store.getState().load("one");
  const creating = store.getState().create({ name: "agent", scopes: ["space:read"], expiresInDays: 1 });
  await store.getState().load("two");
  finish({ token: "do not reveal", integration: {} as never });
  assert.equal(await creating, null);
  assert.equal(store.getState().accountId, "two");
  assert.equal(JSON.stringify(store.getState()).includes("do not reveal"), false);
});
