import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const origin = "https://app.bibo.bot";
const account = JSON.parse(await readFile(join(homedir(), ".config/bibo-hosted/smoke-account.json"), "utf8")) as { email: string; password: string; userId: string };
const call = (path: string, cookie?: string, body?: unknown) => fetch(origin + path, { method: body === undefined ? "GET" : "POST",
  headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20_000) });
const login = () => call("/api/auth/login", undefined, { email: account.email, password: account.password });
const before = await login(); assert.equal(before.status, 200);
const oldCookie = before.headers.get("set-cookie")!.split(";")[0]!;
assert.ok(!oldCookie.includes("bibo_s1_"), "Start the continuity probe before native account cutover.");
const keyResponse = await call("/api/integrations", oldCookie, { operation: "create", name: "Account migration continuity probe", scopes: ["space:read", "space:write"], expiresInDays: 1 });
assert.equal(keyResponse.status, 201);
const key = await keyResponse.json() as { token: string };
const path = `migration-probe-${crypto.randomUUID()}.md`;
const action = async (action: string, input: unknown) => {
  const response = await fetch(origin + "/api/v1/space", { method: "POST", headers: { authorization: `Bearer ${key.token}`, "content-type": "application/json" }, body: JSON.stringify({ action, input }), signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, action);
  return (await response.json() as { result: { content?: string; version?: string } }).result;
};
let created = false;
try {
  await action("file.create", { path, kind: "note", content: "Bibo account continuity", requestId: path }); created = true;
  console.log(JSON.stringify({ beforeCutover: "ready", originalPassword: "accepted", oldSpaceAndPat: "ready" }));
  const deadline = Date.now() + 10 * 60_000;
  let nativeCookie = "";
  while (Date.now() < deadline) {
    const response = await call("/api/auth/me", oldCookie);
    const next = response.headers.get("set-cookie")?.split(";")[0];
    if (next?.includes("bibo_s1_")) {
      assert.equal((await response.json() as { user: { id: string } }).user.id, account.userId);
      nativeCookie = next; break;
    }
    assert.equal(response.status, 200, "Legacy login remains available before cutover");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  assert.ok(nativeCookie, "Native account cutover did not arrive within 10 minutes");
  assert.equal((await call("/api/auth/me", oldCookie)).status, 401, "Consumed legacy session cannot be replayed");
  const web = await call("/api/space", nativeCookie, { action: "file.get", input: { path } });
  assert.equal(web.status, 200);
  assert.equal((await web.json() as { result: { content: string } }).result.content, "Bibo account continuity");
  assert.equal((await action("file.get", { path })).content, "Bibo account continuity");
  const after = await login(); assert.equal(after.status, 200, "Original password verifies locally after migration");
  assert.equal((await after.json() as { user: { id: string } }).user.id, account.userId);
  const afterCookie = after.headers.get("set-cookie")!.split(";")[0]!;
  assert.match(afterCookie, /^bibo_session=bibo_s1_/);
  await call("/api/auth/logout", afterCookie, {});
  assert.equal((await call("/api/auth/me", afterCookie)).status, 401);
  await call("/api/auth/logout", nativeCookie, {});
  console.log(JSON.stringify({ migratedIdentity: "passed", originalPassword: "passed", oldCookieExchangeAndReplay: "passed", existingSpace: "passed", existingPat: "passed", nativeLogout: "passed" }));
} finally {
  if (created) {
    const file = await action("file.get", { path }); await action("file.delete", { id: path, version: file.version });
  }
  await fetch(origin + "/api/v1/auth/revoke", { method: "POST", headers: { authorization: `Bearer ${key.token}` }, signal: AbortSignal.timeout(20_000) });
}
