import { json, publicError } from "../bibo-auth.utils";
import { BiboIntegrationKeys, bearerToken } from "../services/bibo-integration-keys.service";
import type { BiboSpaceActionService } from "../services/bibo-edge-space.service";
import { apiError, apiResult, PublicApiError, readApiObject } from "../utils/bibo-public-api.utils";
import { BiboSpaceError } from "@/features/bibo-domain";
import { biboAssetsRoute } from "@/features/assets";

/** Internal-only device grant minting; the public management route never accepts these credentials. */
export async function deviceIntegrationKey(request: Request, keys: BiboIntegrationKeys): Promise<Response> {
  try {
    if (request.method !== "POST") return publicError("Not found", 404);
    const input = await readApiObject(request, 4096);
    if (typeof input.id !== "string" || typeof input.secret !== "string" || typeof input.expiresAt !== "number") return publicError("Invalid device grant", 400);
    return json(await keys.create(request.headers.get("x-bibo-user-id")!, input,
      { id: input.id, secret: Buffer.from(input.secret, "base64url"), expiresAt: input.expiresAt }));
  } catch (error) {
    if (error instanceof PublicApiError) return publicError(error.message, error.status);
    return publicError("授权操作暂时不可用。", 503);
  }
}

export async function integrationManagement(request: Request, keys: BiboIntegrationKeys): Promise<Response> {
  try {
    if (request.method === "GET") return json({ integrations: await keys.list() });
    if (request.method !== "POST") return publicError("Not found", 404);
    const input = await readApiObject(request, 4096);
    if (input.operation === "revoke") return json(await keys.revoke(input.id));
    if (input.operation !== "create") throw new PublicApiError("未知操作。", 400);
    return json(await keys.create(request.headers.get("x-bibo-user-id")!, input), 201);
  } catch (error) {
    if (error instanceof PublicApiError) return publicError(error.message, error.status);
    return publicError("授权操作暂时不可用。", 503);
  }
}

/** Called only inside the account's space queue: validation cannot race revocation. */
export async function integrationApi(request: Request, keys: BiboIntegrationKeys,
  space: BiboSpaceActionService, bucket: Env["SNAPSHOTS"], maintenance: boolean): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const identity = await keys.authenticate(bearerToken(request));
    const path = new URL(request.url).pathname.replace(/^\/integration-api\//, "");
    const method = request.method;
    if (path === "me" && method === "GET") return apiResult(identity, requestId);
    if (path === "auth/revoke" && method === "POST") return apiResult(await keys.revoke(identity.integration.id), requestId);
    const actions = space.listActions().map((item) => ({ ...item, readOnly: /\.(get|list)$/.test(item.action) }));
    if (path === "actions" && method === "GET") return apiResult(actions, requestId);
    const write = (): void => {
      if (!identity.integration.scopes.includes("space:write")) throw new PublicApiError("This token has read-only access.", 403);
      if (maintenance) throw new PublicApiError("Bibo is busy. Try again shortly.", 429);
    };
    if (path === "space" && method === "POST") {
      const body = await readApiObject(request);
      const action = actions.find((item) => item.action === body.action);
      if (!action) throw new PublicApiError("Unknown action. Query GET /api/v1/actions.", 400);
      if (!action.readOnly) write();
      const input = body.input ?? {};
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new PublicApiError("input must be an object.", 400);
      const result = await space.execute(action.action, input, { kind: "agent", integrationId: identity.integration.id });
      return apiResult(result, requestId);
    }
    if ((path === "assets" && method === "POST") || (path.startsWith("assets/") && method === "GET")) {
      if (method === "POST") write();
      const url = new URL(request.url); url.pathname = `/api/${path}`;
      const response = await biboAssetsRoute(new Request(url, request), bucket, identity.userId);
      if (!response.ok) {
        const body = await response.json() as { error: string };
        return apiError(body.error, response.status, requestId);
      }
      if (method === "POST") {
        const body = await response.json() as { url: string };
        return apiResult({ id: body.url.split("/").at(-1), url: body.url.replace("/api/", "/api/v1/"), webUrl: body.url }, requestId, 201);
      }
      const headers = new Headers(response.headers);
      headers.set("cache-control", "private, no-store"); headers.set("vary", "Authorization"); headers.set("x-request-id", requestId);
      return new Response(response.body, { status: response.status, headers });
    }
    return apiError("Not found.", 404, requestId);
  } catch (error) {
    if (error instanceof PublicApiError || error instanceof BiboSpaceError) return apiError(error.message, error.status, requestId,
      error.status === 429 ? { "retry-after": String(60 - Math.floor(Date.now() / 1000) % 60) } : undefined);
    return apiError("Bibo is temporarily unavailable. No success was confirmed.", 503, requestId);
  }
}
