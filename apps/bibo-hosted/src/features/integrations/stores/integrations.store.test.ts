import assert from "node:assert/strict";
import test from "node:test";
import { createIntegrationsStore } from "./integrations.store";

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
