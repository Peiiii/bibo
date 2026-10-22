import { cookieToken, json, publicError, sessionUser } from "../bibo-auth.utils";
import { deviceCodePattern, deviceError, normalizeUserCode } from "../services/bibo-device-authorization.service";
import { PublicApiError, readApiObject } from "../utils/bibo-public-api.utils";

export async function deviceAuthorizationRoute(request: Request, env: Env): Promise<Response> {
  if (!env.BIBO_DEVICE_AUTH) return deviceError("temporarily_unavailable", "Browser authorization is not configured for this deployment.", 503);
  const url = new URL(request.url), path = url.pathname;
  try {
    const body = request.method === "GET" ? Object.fromEntries(url.searchParams) : await readApiObject(request, 4096);
    const call = (code: string, action: string, input: unknown) => env.BIBO_DEVICE_AUTH!.getByName(code).fetch(`https://bibo.internal/${action}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
    });
    if (path === "/api/auth/device/code" && request.method === "POST") {
      if (body.client_id !== "bibo-cli" || (body.scope !== undefined && !["space:read", "space:read space:write"].includes(String(body.scope)))) return deviceError("invalid_request", "Unsupported client or scope.");
      const admission = await env.BIBO_MODEL_BUDGET.getByName("global").fetch("https://bibo.internal/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `device:${request.headers.get("cf-connecting-ip") ?? "local"}` }) });
      if (!admission.ok) return deviceError("slow_down", "Too many authorization requests. Try again later.", 429);
      const name = body.name ?? "Bibo CLI";
      if (typeof name !== "string" || !name.trim() || name.length > 80) return deviceError("invalid_request", "Client name must be 1–80 characters.");
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => alphabet[byte % 32]).join("");
        const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
        const deviceCode = `bibo_dc_v1_${code}.${secret}`;
        const result = await call(code, "start", { userCode: code, deviceCode, name: name.trim(), scopes: String(body.scope ?? "space:read space:write").split(" ") });
        if (result.status === 409) continue;
        if (!result.ok) return result;
        return json({ device_code: deviceCode, user_code: `${code.slice(0, 4)}-${code.slice(4)}`,
          verification_uri: `${url.origin}/authorize`, verification_uri_complete: `${url.origin}/authorize?user_code=${code}`,
          ...await result.json() as object });
      }
      return deviceError("temporarily_unavailable", "Please try again.", 503);
    }
    if (path === "/api/auth/device/token" && request.method === "POST") {
      if (body.client_id !== "bibo-cli" || body.grant_type !== "urn:ietf:params:oauth:grant-type:device_code") return deviceError("invalid_request", "Unsupported device grant.");
      const match = typeof body.device_code === "string" && body.device_code.match(/^bibo_dc_v1_([A-HJ-NP-Z2-9]{8})\.[A-Za-z0-9_-]{43}$/);
      if (!match) return deviceError("invalid_grant", "Invalid device credential.");
      return await call(match[1], "token", { deviceCode: body.device_code });
    }
    if (path !== "/api/auth/device" && path !== "/api/auth/device/decision") return publicError("Not found", 404);
    if ((path.endsWith("/decision") && request.method !== "POST") || (path === "/api/auth/device" && request.method !== "GET")) return publicError("Not found", 404);
    if (request.method === "POST" && request.headers.get("origin") !== url.origin) return publicError("请求来源不正确。", 403);
    const user = await sessionUser(cookieToken(request), env);
    if (!user) return publicError("请先登录 Bibo。", 401);
    const code = typeof body.user_code === "string" ? normalizeUserCode(body.user_code) : "";
    if (!deviceCodePattern.test(code)) return deviceError("invalid_request", "请输入正确的八位授权码。");
    if (request.method === "GET") return await call(code, "inspect", {});
    if (typeof body.approve !== "boolean" || (body.readOnly !== undefined && typeof body.readOnly !== "boolean")) return deviceError("invalid_request", "请明确同意或拒绝授权。");
    return await call(code, "decide", { userId: user.id, approve: body.approve, readOnly: body.readOnly });
  } catch (error) {
    if (error instanceof PublicApiError) return deviceError("invalid_request", error.message, error.status);
    return deviceError("temporarily_unavailable", "Authorization is temporarily unavailable.", 503);
  }
}
