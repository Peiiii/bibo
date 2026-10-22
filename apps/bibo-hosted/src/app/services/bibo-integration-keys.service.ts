import type { BiboIntegration, BiboScope } from "@nextclaw/bibo-api";
import { PublicApiError } from "../utils/bibo-public-api.utils";

type StoredKey = BiboIntegration & { hash: string; minute?: number; count?: number; grantExpiresAt?: number; revokedAt?: number };
type KeyStorage = Pick<DurableObjectStorage, "get" | "put">;
const storageKey = "bibo.integrationKeys.v1";
const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}";
const tokenPattern = new RegExp(`^bibo_v1_([A-Za-z0-9_-]{1,270})\\.(${uuid})\\.([A-Za-z0-9_-]{43})$`);
const encode = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

export function parseIntegrationToken(token: string | null): { userId: string; id: string } | null {
  const parts = token?.match(tokenPattern);
  if (!parts) return null;
  try {
    const bytes = Uint8Array.from(atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")), (char) => char.charCodeAt(0));
    const userId = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!userId || userId.length > 200 || /[\u0000-\u001f\u007f]/.test(userId) || encode(bytes) !== parts[1]) return null;
    return { userId, id: parts[2] };
  } catch { return null; }
}
export const bearerToken = (request: Request): string | null => request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1] ?? null;
const publicKey = ({ hash: _hash, minute: _minute, count: _count, grantExpiresAt: _grant, revokedAt: _revoked, ...key }: StoredKey): BiboIntegration => key;
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function equal(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** The account DO serializes all calls to this owner with space operations. */
export class BiboIntegrationKeys {
  constructor(private readonly storage: KeyStorage, private readonly now: () => number = Date.now) {}
  private load = (): Promise<StoredKey[]> => this.storage.get<StoredKey[]>(storageKey).then((keys) => keys ?? []);
  list = async (): Promise<BiboIntegration[]> => (await this.load()).filter((key) => !key.revokedAt).map(publicKey);

  create = async (userId: string, input: Record<string, unknown>, grant?: { id: string; secret: Uint8Array; expiresAt: number }): Promise<{ integration: BiboIntegration; token: string }> => {
    if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 80) throw new PublicApiError("名称须为 1–80 字符。", 400);
    const days = input.expiresInDays ?? 30;
    if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 365) throw new PublicApiError("有效期须为 1–365 天。", 400);
    const scopes = input.scopes;
    if (!Array.isArray(scopes) || !scopes.includes("space:read") || scopes.some((scope) => !["space:read", "space:write"].includes(scope)) || scopes.length > 2) {
      throw new PublicApiError("权限须包含 space:read，可选 space:write。", 400);
    }
    if (grant && (!new RegExp(`^${uuid}$`).test(grant.id) || grant.secret.byteLength !== 32 || grant.expiresAt <= this.now())) throw new PublicApiError("Device authorization expired.", 400);
    const keys = (await this.load()).filter((key) => (!key.revokedAt && Date.parse(key.expiresAt) > this.now()) || (key.grantExpiresAt ?? 0) > this.now());
    const id = grant?.id ?? crypto.randomUUID();
    const token = `bibo_v1_${encode(new TextEncoder().encode(userId))}.${id}.${encode(grant?.secret ?? crypto.getRandomValues(new Uint8Array(32)))}`;
    const previous = grant ? keys.find((key) => key.id === id) : undefined;
    if (previous) {
      if (previous.revokedAt || !equal(previous.hash, await hashToken(token))) throw new PublicApiError("Device authorization was revoked.", 403);
      return { integration: publicKey(previous), token };
    }
    if (keys.filter((key) => !key.revokedAt && Date.parse(key.expiresAt) > this.now()).length >= 20) throw new PublicApiError("最多保留 20 个有效授权，请先撤销旧授权。", 409);
    const key: StoredKey = { id, name: input.name.trim(), scopes: [...new Set(scopes)] as BiboScope[],
      createdAt: new Date(this.now()).toISOString(), expiresAt: new Date(this.now() + days * 86_400_000).toISOString(),
      lastUsedAt: null, hash: await hashToken(token), ...(grant ? { grantExpiresAt: grant.expiresAt } : {}) };
    keys.push(key);
    await this.storage.put(storageKey, keys);
    return { integration: publicKey(key), token };
  };
  revoke = async (id: unknown): Promise<{ revoked: string }> => {
    if (typeof id !== "string" || !new RegExp(`^${uuid}$`).test(id)) throw new PublicApiError("授权编号不正确。", 400);
    const keys = await this.load();
    await this.storage.put(storageKey, keys.filter((key) => key.id !== id || (key.grantExpiresAt ?? 0) > this.now())
      .map((key) => key.id === id ? { ...key, revokedAt: this.now() } : key));
    return { revoked: id };
  };
  authenticate = async (token: string | null): Promise<{ userId: string; integration: BiboIntegration }> => {
    const parsed = parseIntegrationToken(token);
    if (!parsed || !token) throw new PublicApiError("A valid Bibo access token is required.", 401);
    const keys = await this.load();
    const key = keys.find((candidate) => candidate.id === parsed.id);
    if (!key || key.revokedAt || !equal(key.hash, await hashToken(token)) || Date.parse(key.expiresAt) <= this.now()) {
      throw new PublicApiError("The access token is invalid, expired, or revoked.", 401);
    }
    const minute = Math.floor(this.now() / 60_000);
    if (key.minute !== minute) { key.minute = minute; key.count = 0; key.lastUsedAt = new Date(this.now()).toISOString(); }
    if ((key.count ?? 0) >= 60) throw new PublicApiError("Rate limit exceeded. Try again next minute.", 429);
    key.count = (key.count ?? 0) + 1;
    await this.storage.put(storageKey, keys);
    return { userId: parsed.userId, integration: publicKey(key) };
  };
}
