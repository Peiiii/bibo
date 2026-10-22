import assert from "node:assert/strict";
import test from "node:test";
import { waitForRegistryIntegrity } from "./registry.mjs";

test("accepted packages wait through temporary 404s without publishing again", async () => {
  let calls = 0, waits = 0;
  await waitForRegistryIntegrity("@example/pkg@1.0.0", "sha512-good", {
    read: () => ++calls < 3 ? null : "sha512-good", wait: async () => { waits++; },
  });
  assert.equal(calls, 3); assert.equal(waits, 2);
});
test("mismatches and authorization/network errors fail immediately; processing has a deadline", async () => {
  let waits = 0;
  await assert.rejects(waitForRegistryIntegrity("pkg", "expected", { read: () => "different", wait: async () => { waits++; } }), /mismatch/);
  await assert.rejects(waitForRegistryIntegrity("pkg", "expected", { read: () => { throw new Error("auth failure"); }, wait: async () => { waits++; } }), /auth failure/);
  assert.equal(waits, 0);
  let time = 0;
  await assert.rejects(waitForRegistryIntegrity("pkg", "expected", { read: () => null, now: () => time, timeoutMs: 2, wait: async () => { time++; } }), /still processing/);
});
