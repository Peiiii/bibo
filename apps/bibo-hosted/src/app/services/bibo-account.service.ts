import { accountCodeHash, accountDigest, accountEqual, accountPassword, accountRandom } from "../utils/bibo-account-crypto.utils";
import type { BiboUser } from "../bibo-auth.utils";
import type { D1Database } from "@cloudflare/workers-types";

export type BiboAccountEnvironment = {
  BIBO_AUTH_DB?: D1Database; BIBO_AUTH_SECRET?: string;
  BIBO_AUTH_MAILER?: { fetch(url: string, init: { method: string; headers: Record<string, string>; body: string }): Promise<{ ok: boolean }> };
};
type Account = { id: string; email: string; password_hash: string; password_salt: string; role: string; legacy_allowed: number; locked_until: number };
type Code = { code_hash: string; expires_at: number; attempts: number };
export class BiboAccountError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
const cookie = (token: string, age = 2_592_000): string => `bibo_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
export const clearAccountCookie = (): string => cookie("", 0);
const toUser = (account: Pick<Account, "id" | "email">): BiboUser => ({ id: account.id, email: account.email, freeRemainingUsd: 0, paidBalanceUsd: 0 });
const legacyDeadline = Date.parse("2026-11-21T16:00:00Z");
export const legacyAccountWindow = (): boolean => Date.now() < legacyDeadline;

/** Owns Bibo identities, one-time codes and revocable sessions; mail transport owns no identity. */
export class BiboAccountService {
  private readonly db: D1Database;
  constructor(private readonly env: BiboAccountEnvironment) {
    if (!env.BIBO_AUTH_DB) throw new BiboAccountError("账号服务尚未配置。", 503);
    this.db = env.BIBO_AUTH_DB;
  }
  private account = (email: string): Promise<Account | null> => this.db.prepare("SELECT * FROM accounts WHERE email = ?").bind(email).first<Account>();
  private body = (value: unknown): { email: string; password: string; code: string; purpose: string } => {
    const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BiboAccountError("请输入有效邮箱。", 400);
    return { email, password: typeof body.password === "string" ? body.password : "", code: typeof body.code === "string" ? body.code : "", purpose: body.purpose === "reset" ? "reset" : "register" };
  };
  private password = (password: string): void => {
    if (password.trim().length < 8 || password.length > 256) throw new BiboAccountError("密码需为 8–256 个字符。", 400);
  };
  private issue = async (account: Account): Promise<{ user: BiboUser; cookie: string }> => {
    const token = `bibo_s1_${accountRandom()}`; const now = Date.now();
    const result = await this.db.prepare("INSERT INTO account_sessions(token_hash,user_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND password_hash=? AND locked_until<=?")
      .bind(await accountDigest(token), now + 2_592_000_000, account.id, account.password_hash, now).run();
    if (!result.meta.changes) throw new BiboAccountError("账号状态已变化，请重新登录。", 401);
    return { user: toUser(account), cookie: cookie(token) };
  };
  user = async (token: string | null): Promise<(BiboUser & { role: string }) | null> => {
    if (!token?.startsWith("bibo_s1_")) return null;
    const result = await this.db.prepare("SELECT a.id,a.email,a.role FROM accounts a JOIN account_sessions s ON s.user_id=a.id WHERE s.token_hash=? AND s.kind='native' AND s.expires_at>?")
      .bind(await accountDigest(token), Date.now()).first<Pick<Account, "id" | "email" | "role">>();
    return result ? { ...toUser(result), role: result.role } : null;
  };
  legacyUser = async (token: string, verify: () => Promise<BiboUser | null>): Promise<BiboUser | null> => {
    if (!legacyAccountWindow() || token.startsWith("bibo_s1_") || token.length > 4096) return null;
    if (await this.db.prepare("SELECT 1 FROM account_sessions WHERE token_hash=?").bind(await accountDigest(token)).first()) return null;
    const verified = await verify();
    if (!verified) return null;
    const account = await this.account(verified.email);
    return account?.id === verified.id && account.legacy_allowed ? toUser(account) : null;
  };
  exchange = async (token: string, verify: () => Promise<BiboUser | null>): Promise<{ user: BiboUser; cookie: string } | null> => {
    const user = await this.legacyUser(token, verify);
    if (!user) return null;
    const account = (await this.account(user.email))!;
    const fresh = `bibo_s1_${accountRandom()}`; const oldHash = await accountDigest(token);
    const results = await this.db.batch([
      this.db.prepare("INSERT OR IGNORE INTO account_sessions(token_hash,user_id,expires_at,kind) VALUES(?,?,?,'legacy-consumed')").bind(oldHash, account.id, legacyDeadline),
      this.db.prepare("INSERT INTO account_sessions(token_hash,user_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND legacy_allowed=1 AND changes()=1")
        .bind(await accountDigest(fresh), Date.now() + 2_592_000_000, account.id),
    ]);
    return results[1]?.meta.changes ? { user, cookie: cookie(fresh) } : null;
  };
  logout = async (token: string | null, verify: () => Promise<BiboUser | null>): Promise<void> => {
    if (!token) return;
    const hash = await accountDigest(token);
    if (token.startsWith("bibo_s1_")) await this.db.prepare("DELETE FROM account_sessions WHERE token_hash=?").bind(hash).run();
    else {
      const user = await this.legacyUser(token, verify);
      if (user) await this.db.prepare("INSERT OR IGNORE INTO account_sessions(token_hash,user_id,expires_at,kind) VALUES(?,?,?,'legacy-consumed')").bind(hash, user.id, legacyDeadline).run();
    }
  };
  login = async (value: unknown): Promise<{ user: BiboUser; cookie: string }> => {
    const { email, password } = this.body(value);
    if (!password) throw new BiboAccountError("请输入密码。", 400);
    const account = await this.account(email);
    // A missing or wrong local password never falls back to the other product.
    const hash = await accountPassword(password, account?.password_salt ?? "bibo-absent-account");
    if (!account || account.locked_until > Date.now() || !accountEqual(hash, account.password_hash)) {
      if (account && account.locked_until <= Date.now()) await this.db.prepare("UPDATE accounts SET failures=failures+1,locked_until=CASE WHEN failures>=4 THEN ? ELSE locked_until END WHERE id=?")
        .bind(Date.now() + 900_000, account.id).run();
      throw new BiboAccountError("邮箱或密码不正确，或尝试过于频繁。", 401);
    }
    await this.db.prepare("UPDATE accounts SET failures=0 WHERE id=?").bind(account.id).run();
    return this.issue(account);
  };
  sendCode = async (value: unknown): Promise<{ sent: true }> => {
    const { email, purpose } = this.body(value);
    if (!this.env.BIBO_AUTH_SECRET || !this.env.BIBO_AUTH_MAILER) throw new BiboAccountError("邮件服务尚未配置。", 503);
    const account = await this.account(email);
    if (purpose === "register" && account) throw new BiboAccountError("此邮箱已注册，请登录。", 409);
    if (purpose === "reset" && !account) return { sent: true };
    const random = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const code = String(random % 1_000_000).padStart(6, "0");
    const hash = await accountCodeHash(this.env.BIBO_AUTH_SECRET, email, purpose, code); const now = Date.now();
    const reservation = await this.db.prepare("INSERT INTO account_email_codes(email,purpose,code_hash,expires_at,attempts,sent_at) VALUES(?,?,?,?,0,?) ON CONFLICT(email,purpose) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,sent_at=excluded.sent_at WHERE account_email_codes.sent_at<=?")
      .bind(email, purpose, hash, now + 600_000, now, now - 60_000).run();
    if (!reservation.meta.changes) throw new BiboAccountError("请稍等 60 秒再发送验证码。", 429);
    try {
      const label = purpose === "reset" ? "重置密码" : "注册账号";
      const response = await this.env.BIBO_AUTH_MAILER.fetch("https://mail.internal/send", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: email, senderName: "Bibo", subject: `Bibo ${label}验证码`, text: `你的 Bibo 验证码是 ${code}，10 分钟内有效。请勿向他人提供验证码。`, html: `<p>你的 Bibo ${label}验证码：</p><p style="font-size:28px;letter-spacing:6px">${code}</p><p>10 分钟内有效。请勿向他人提供验证码。</p>` }) });
      if (!response.ok) throw new Error("Mail delivery failed");
    } catch {
      await this.db.prepare("DELETE FROM account_email_codes WHERE email=? AND purpose=? AND code_hash=?").bind(email, purpose, hash).run();
      throw new BiboAccountError("验证码暂时发送失败，请稍后重试。", 503);
    }
    return { sent: true };
  };
  complete = async (value: unknown, purpose: "register" | "reset"): Promise<{ user: BiboUser; cookie: string }> => {
    const { email, password, code } = this.body(value); this.password(password);
    if (!this.env.BIBO_AUTH_SECRET) throw new BiboAccountError("账号服务尚未配置。", 503);
    const hash = await accountCodeHash(this.env.BIBO_AUTH_SECRET, email, purpose, code);
    const saved = await this.db.prepare("SELECT * FROM account_email_codes WHERE email=? AND purpose=?").bind(email, purpose).first<Code>();
    if (!saved || saved.expires_at <= Date.now() || saved.attempts >= 5 || !accountEqual(hash, saved.code_hash)) {
      await this.db.prepare("UPDATE account_email_codes SET attempts=attempts+1 WHERE email=? AND purpose=?").bind(email, purpose).run();
      throw new BiboAccountError("验证码不正确或已过期，请重新获取。", 400);
    }
    const salt = accountRandom(16); const passwordHash = await accountPassword(password, salt); const now = Date.now();
    const valid = "EXISTS(SELECT 1 FROM account_email_codes WHERE email=? AND purpose=? AND code_hash=? AND expires_at>? AND attempts<5)";
    const args = [email, purpose, hash, now];
    const change = purpose === "register" ? this.db.prepare(`INSERT OR IGNORE INTO accounts(id,email,password_hash,password_salt,created_at) SELECT ?,?,?,?,? WHERE ${valid}`)
      .bind(crypto.randomUUID(), email, passwordHash, salt, now, ...args) : this.db.prepare(`UPDATE accounts SET password_hash=?,password_salt=?,legacy_allowed=0,failures=0,locked_until=0 WHERE email=? AND ${valid}`)
      .bind(passwordHash, salt, email, ...args);
    const statements = purpose === "reset" ? [this.db.prepare(`DELETE FROM account_sessions WHERE kind='native' AND user_id=(SELECT id FROM accounts WHERE email=?) AND ${valid}`).bind(email, ...args), change] : [change];
    statements.push(this.db.prepare("DELETE FROM account_email_codes WHERE email=? AND purpose=? AND code_hash=?").bind(email, purpose, hash));
    const results = await this.db.batch(statements);
    if (!results[purpose === "reset" ? 1 : 0]?.meta.changes) throw new BiboAccountError("验证码已使用或账号状态已变化，请重试。", 409);
    return this.issue({ ...(await this.account(email))!, password_hash: passwordHash });
  };
}
