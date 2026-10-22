import assert from "node:assert/strict";
import test from "node:test";
import { createDeviceAuthorizationStore } from "./device-authorization.store";

test("late account bootstrap cannot erase a manually entered remote code", async () => {
  const requests: string[] = [];
  const store = createDeviceAuthorizationStore((async (url) => {
    requests.push(String(url));
    return Response.json({ user_code: "ABCD2345", client_name: "VPS", scope: "space:read", expires_at: Date.now() + 600000, status: "pending" });
  }) as typeof fetch);
  store.getState().setCode("ABCD-2345");
  await store.getState().load("", "late-account");
  assert.equal(store.getState().code, "ABCD-2345");
  await store.getState().load(store.getState().code, "late-account");
  assert.deepEqual(requests, ["/api/auth/device?user_code=ABCD2345"]);
  assert.equal(store.getState().phase, "consent");
});
