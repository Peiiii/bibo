import { DurableObject } from "cloudflare:workers";
import type { BiboScope } from "@nextclaw/bibo-api";
import { json } from "../bibo-auth.utils";

export const deviceCodePattern = /^[A-HJ-NP-Z2-9]{8}$/;
export const normalizeUserCode = (value: string): string => value.replaceAll("-", "").replaceAll(" ", "").toUpperCase();
export const deviceError = (error: string, description: string, status = 400): Response => json({ error, error_description: description }, status);
const digest = async (value: string): Promise<Uint8Array> => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const hexDigest = async (value: string): Promise<string> => Buffer.from(await digest(value)).toString("hex");
type Grant = {
  userCode: string; deviceHash: string; keyId: string; name: string; scopes: BiboScope[]; expiresAt: number;
  status: "pending" | "approved" | "denied"; userId?: string; lastPollAt?: number; interval: number;
};

/** A short-lived authorization request. Actual access keys belong to the user's existing key owner. */
export class BiboDeviceAuthorization extends DurableObject<Env> {
  private queue: Promise<void> = Promise.resolve();
  override fetch(request: Request): Promise<Response> {
    const operation = this.queue.then(() => this.handle(request));
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  override async alarm(): Promise<void> { await this.ctx.storage.deleteAll(); }

  private async handle(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const body = await request.json() as Record<string, unknown>;
    const now = Date.now();
    const saved = await this.ctx.storage.get<Grant>("grant");
    if (path === "/start") {
      if (saved && saved.expiresAt > now) return deviceError("temporarily_unavailable", "Please request another code.", 409);
      const grant: Grant = {
        userCode: body.userCode as string, deviceHash: await hexDigest(body.deviceCode as string), keyId: crypto.randomUUID(),
        name: body.name as string, scopes: body.scopes as BiboScope[], expiresAt: now + 600_000, status: "pending", interval: 5,
      };
      await this.ctx.storage.put("grant", grant); await this.ctx.storage.setAlarm(grant.expiresAt);
      return json({ expires_in: 600, interval: grant.interval });
    }
    if (!saved || saved.expiresAt <= now) return deviceError("expired_token", "Authorization expired. Run bibo auth login again.");
    if (path === "/inspect") return json({ user_code: saved.userCode, client_name: saved.name, scope: saved.scopes.join(" "), expires_at: saved.expiresAt, status: saved.status });
    if (path === "/decide") {
      if (saved.status !== "pending") {
        if (saved.userId !== body.userId) return deviceError("access_denied", "This request was already handled.", 403);
        return json({ status: saved.status });
      }
      saved.userId = body.userId as string;
      saved.status = body.approve === true ? "approved" : "denied";
      if (saved.status === "approved" && body.readOnly === true) saved.scopes = ["space:read"];
      await this.ctx.storage.put("grant", saved);
      return json({ status: saved.status });
    }
    if (path !== "/token") return deviceError("invalid_request", "Unknown device authorization request.", 404);
    if (typeof body.deviceCode !== "string" || await hexDigest(body.deviceCode) !== saved.deviceHash) return deviceError("invalid_grant", "Invalid device credential.");
    if (saved.lastPollAt && now - saved.lastPollAt < saved.interval * 1000) {
      saved.interval = Math.min(saved.interval + 5, 60); saved.lastPollAt = now;
      await this.ctx.storage.put("grant", saved);
      return deviceError("slow_down", "Increase polling interval.");
    }
    saved.lastPollAt = now; await this.ctx.storage.put("grant", saved);
    if (saved.status === "pending") return deviceError("authorization_pending", "Waiting for browser approval.");
    if (saved.status === "denied") return deviceError("access_denied", "The user denied this authorization.");
    const secret = await digest(`bibo.device.access.v1\0${body.deviceCode}`);
    const response = await this.env.BIBO_USER.getByName(`user:${saved.userId}`).fetch("https://bibo.internal/device-key", {
      method: "POST", headers: { "content-type": "application/json", "x-bibo-user-id": saved.userId! },
      body: JSON.stringify({ id: saved.keyId, secret: Buffer.from(secret).toString("base64url"), expiresAt: saved.expiresAt,
        name: saved.name, scopes: saved.scopes, expiresInDays: 30 }),
    });
    if (!response.ok) return deviceError(response.status === 403 ? "access_denied" : "temporarily_unavailable", response.status === 403 ? "Authorization was revoked." : "Authorization could not complete. Try again.", response.status === 403 ? 400 : 503);
    const result = await response.json() as { token: string; integration: { expiresAt: string } };
    return json({ access_token: result.token, token_type: "Bearer", expires_in: Math.max(0, Math.floor((Date.parse(result.integration.expiresAt) - now) / 1000)), scope: saved.scopes.join(" ") });
  }
}
