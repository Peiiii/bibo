export type * from "./space.types.js";
export type BiboScope = "space:read" | "space:write";
export type BiboIntegration = {
  id: string; name: string; scopes: BiboScope[]; createdAt: string; expiresAt: string; lastUsedAt: string | null;
};
export type BiboIdentity = { userId: string; integration: BiboIntegration };
export type BiboActionDefinition = { action: string; domain: string; description: string; input: string; readOnly: boolean };

export class BiboApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly requestId?: string,
    readonly retryAfter?: number) { super(message); this.name = "BiboApiError"; }
}

/** Origins only: credentials must never follow an arbitrary path or redirect. */
export function normalizeBiboEndpoint(value = "https://app.bibo.bot"): string {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password
    || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("Endpoint must be an HTTPS origin (HTTP is allowed only on loopback).");
  }
  return url.origin;
}

export class BiboApi {
  readonly endpoint: string;
  private readonly token: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  constructor(options: { token: string; endpoint?: string; fetch?: typeof fetch; timeoutMs?: number }) {
    this.endpoint = normalizeBiboEndpoint(options.endpoint);
    if (!options.token || /\s/.test(options.token)) throw new Error("A Bibo access token is required.");
    this.token = options.token;
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }
  private async response(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.endpoint}/api/v1/${path}`, {
        ...init, redirect: "error", credentials: "omit",
        signal: init.signal ?? AbortSignal.timeout(this.timeoutMs),
        headers: { ...Object.fromEntries(new Headers(init.headers)), authorization: `Bearer ${this.token}` },
      });
    } catch { throw new BiboApiError("Could not reach Bibo. Check the endpoint and connection.", 0, "NETWORK_ERROR"); }
    if (!response.ok) {
      const value = await response.json().catch(() => null) as { error?: { code?: string; message?: string }; requestId?: string } | null;
      throw new BiboApiError(value?.error?.message ?? `Bibo request failed (${response.status}).`, response.status,
        value?.error?.code ?? "HTTP_ERROR", value?.requestId, Number(response.headers.get("retry-after")) || undefined);
    }
    return response;
  }
  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.response(path, init);
    const value = await response.json().catch(() => null) as { result?: T } | null;
    if (!value || !("result" in value)) throw new BiboApiError("Invalid Bibo response.", response.status, "INVALID_RESPONSE");
    return value.result as T;
  }
  me = (): Promise<BiboIdentity> => this.json("me");
  actions = (): Promise<BiboActionDefinition[]> => this.json("actions");
  call = <T = unknown>(action: string, input: Record<string, unknown> = {}): Promise<T> => this.json("space", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, input }),
  });
  revoke = (): Promise<{ revoked: string }> => this.json("auth/revoke", { method: "POST" });
  uploadAsset = (bytes: Uint8Array): Promise<{ id: string; url: string; webUrl: string }> => this.json("assets", {
    method: "POST", headers: { "content-type": "application/octet-stream" }, body: new Uint8Array(bytes).buffer,
  });
  downloadAsset = async (id: string): Promise<Uint8Array> => {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid asset ID.");
    return new Uint8Array(await (await this.response(`assets/${id}`)).arrayBuffer());
  };
}
