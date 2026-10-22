import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { pbkdf2Sync } from "node:crypto";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

test("independent accounts: real D1 codes, password isolation, legacy exchange, replay and revocation", async () => {
  const built = await build({ stdin: { contents: `
    import { authRoute, currentUser } from './src/app/bibo-auth.utils';
    export default { async fetch(request,env) {
      env.BIBO_MODEL_BUDGET={getByName(){return {fetch:async()=>new Response('ok')}}};
      const path = new URL(request.url).pathname;
      if(path==='/identity') return Response.json(await currentUser(request.headers.get('authorization'),env));
      try { return await authRoute(request,path,env); } catch {return new Response('failed',{status:503});}
    } };
  `, resolveDir: process.cwd() }, bundle: true, format: "esm", platform: "neutral", target: "es2022", external: ["node:*"], tsconfig: "tsconfig.json", write: false });
  let sentCode = ""; let sends = 0; let upstream = 0; let failMail = false;
  const worker = new Miniflare({ modules: true, script: built.outputFiles[0]!.text, compatibilityDate: "2026-09-24", compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["BIBO_AUTH_DB"], bindings: { BIBO_AUTH_SECRET: "test-only-secret-not-production" },
    serviceBindings: {
      BIBO_AUTH_MAILER: async (request) => {
        sends++; const mail = await request.json() as { text: string; senderName: string };
        assert.equal(mail.senderName, "Bibo"); sentCode = mail.text.match(/\d{6}/)![0];
        return Response.json({ sent: !failMail }, { status: failMail ? 503 : 200 });
      },
    },
    outboundService: async () => { upstream++; return Response.json({ ok: true, data: { user: { id: "legacy-id", email: "old@example.test" } } }); },
  });
  // The budget owner is a DO in production; this fixture exposes its identical getByName/fetch contract.
  // Override it in the bundled fixture so all account decisions still execute in workerd with real D1.
  const db = await worker.getD1Database("BIBO_AUTH_DB");
  await db.exec((await readFile("migrations/0001-accounts.sql", "utf8")).replaceAll("\n", " "));
  const origin = "https://bibo.test";
  const call = async (path: string, body?: unknown, session?: string) => worker.dispatchFetch(origin + path, {
    method: body === undefined ? "GET" : "POST", headers: { origin, ...(session ? { cookie: session } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const session = (response: Response | Awaited<ReturnType<typeof worker.dispatchFetch>>) => response.headers.get("set-cookie")!.split(";")[0]!;
  try {
    const email = "new@example.test"; const password = "independent-password";
    assert.equal((await call("/api/auth/send-code", { email })).status, 200);
    const registerCode = sentCode;
    assert.equal((await call("/api/auth/send-code", { email })).status, 429);
    const stored = await db.prepare("SELECT code_hash FROM account_email_codes WHERE email=?").bind(email).first<{ code_hash: string }>();
    assert.notEqual(stored!.code_hash, registerCode); assert.equal(stored!.code_hash.includes(registerCode), false);
    const registered = await call("/api/auth/register", { email, password, code: registerCode });
    assert.equal(registered.status, 200, await registered.clone().text()); const first = session(registered);
    const user = (await registered.json() as { user: { id: string } }).user;
    assert.equal((await call("/api/auth/register", { email, password, code: registerCode })).status, 400);
    assert.equal((await call("/api/auth/me", undefined, first)).status, 200);
    assert.equal((await call("/api/auth/login", { email, password: "wrong-password" })).status, 401);
    const login = await call("/api/auth/login", { email, password }); assert.equal(login.status, 200);
    const second = session(login);
    assert.equal((await call("/api/auth/send-code", { email, purpose: "reset" })).status, 200);
    const reset = await call("/api/auth/reset-password", { email, password: "new-bibo-password", code: sentCode });
    assert.equal(reset.status, 200, await reset.clone().text());
    assert.equal((await call("/api/auth/me", undefined, first)).status, 401);
    assert.equal((await call("/api/auth/me", undefined, second)).status, 401);
    assert.equal((await call("/api/auth/login", { email, password })).status, 401);
    const changed = await call("/api/auth/login", { email, password: "new-bibo-password" });
    assert.equal((await changed.json() as { user: { id: string } }).user.id, user.id);
    assert.equal(upstream, 0, "native register/login/session/reset never queries NextClaw");
    const salt = Buffer.alloc(16, 7).toString("base64url"); const oldPassword = "original-platform-password".repeat(12);
    const oldHash = Buffer.from(pbkdf2Sync(oldPassword, Buffer.from(salt, "base64url"), 100000, 32, "sha256")).toString("base64url");
    await db.prepare("INSERT INTO accounts(id,email,password_hash,password_salt,legacy_allowed,created_at) VALUES('legacy-id','old@example.test',?,?,1,0)").bind(oldHash, salt).run();
    const migrated = await call("/api/auth/login", { email: "old@example.test", password: oldPassword });
    assert.equal(migrated.status, 200, "existing binary-salt PBKDF2 verifier remains usable");
    assert.equal((await migrated.json() as { user: { id: string } }).user.id, "legacy-id");
    const legacyCookie = "bibo_session=old-platform-token";
    const exchanged = await call("/api/auth/me", undefined, legacyCookie); assert.equal(exchanged.status, 200);
    assert.match(session(exchanged), /^bibo_session=bibo_s1_/);
    assert.equal((await call("/api/auth/me", undefined, legacyCookie)).status, 401, "old token cannot be replayed after exchange");
    const native = session(exchanged);
    await call("/api/auth/logout", {}, native);
    assert.equal((await call("/api/auth/me", undefined, native)).status, 401);
    assert.equal((await call("/api/auth/me", undefined, legacyCookie)).status, 401);
    const unexchanged = "bibo_session=another-old-platform-token";
    assert.equal((await call("/api/auth/logout", {}, unexchanged)).status, 200);
    assert.equal((await call("/api/auth/me", undefined, unexchanged)).status, 401, "logging out a legacy token records its verified owner and prevents re-exchange");
    const failures = { email: "old@example.test", password: "wrong-password" };
    for (let i = 0; i < 5; i++) assert.equal((await call("/api/auth/login", failures)).status, 401);
    assert.equal((await call("/api/auth/login", { email: failures.email, password: oldPassword })).status, 401, "account locks after five failed attempts");
    assert.equal(upstream, 2);
    assert.equal((await call("/api/auth/send-code", { email: "expiry@example.test" })).status, 200);
    await db.prepare("UPDATE account_email_codes SET expires_at=0 WHERE email='expiry@example.test'").run();
    assert.equal((await call("/api/auth/register", { email: "expiry@example.test", password, code: sentCode })).status, 400);
    failMail = true;
    assert.equal((await call("/api/auth/send-code", { email: "mail-fail@example.test" })).status, 503);
    assert.equal(await db.prepare("SELECT 1 FROM account_email_codes WHERE email='mail-fail@example.test'").first(), null);
    failMail = false;
    assert.equal((await call("/api/auth/send-code", { email: "race@example.test" })).status, 200);
    const race = await Promise.all([1, 2].map(() => call("/api/auth/register", { email: "race@example.test", password, code: sentCode })));
    assert.equal(race.filter((response) => response.status === 200).length, 1, "a one-time code creates exactly one account under concurrent requests");
    assert.equal(sends, 5);
  } finally { await worker.dispose(); }
});
