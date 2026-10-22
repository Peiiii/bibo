import { BiboAccountError, BiboAccountService, clearAccountCookie, type BiboAccountEnvironment } from "../services/bibo-account.service";
import { cookieToken, json, publicError, type BiboUser } from "../bibo-auth.utils";
import { PublicApiError, readApiObject } from "../utils/bibo-public-api.utils";

type Environment = BiboAccountEnvironment & {
  BIBO_MODEL_BUDGET?: { getByName(name: string): { fetch(input: string, init?: RequestInit): Promise<Response> } };
};
export async function biboAccountRoute(request: Request, path: string, env: Environment, legacy: (token: string) => Promise<BiboUser | null>): Promise<Response> {
  const accounts = new BiboAccountService(env); const token = cookieToken(request);
  try {
    if (path === "/api/auth/me" && request.method === "GET") {
      const user = await accounts.user(token);
      if (user) return json({ user });
      const exchanged = token ? await accounts.exchange(token, () => legacy(token)) : null;
      return exchanged ? json({ user: exchanged.user }, 200, { "set-cookie": exchanged.cookie }) : publicError("请先登录。", 401);
    }
    if (path === "/api/auth/logout" && request.method === "POST") {
      await accounts.logout(token, () => token ? legacy(token) : Promise.resolve(null));
      return json({ ok: true }, 200, { "set-cookie": clearAccountCookie() });
    }
    if (request.method !== "POST" || !["/api/auth/send-code", "/api/auth/register", "/api/auth/login", "/api/auth/reset-password"].includes(path)) return publicError("Not found", 404);
    if (!env.BIBO_MODEL_BUDGET) return publicError("登录服务尚未配置。", 503);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(request.headers.get("cf-connecting-ip") ?? "local"));
    const admission = await env.BIBO_MODEL_BUDGET.getByName("global").fetch("https://bibo.internal/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `account:${Buffer.from(digest).toString("hex")}` }),
    });
    if (!admission.ok) return publicError("尝试过于频繁，请稍后重试。", 429);
    const body = await readApiObject(request, 4096);
    if (path === "/api/auth/send-code") return json(await accounts.sendCode(body));
    const result = path === "/api/auth/login" ? await accounts.login(body) : await accounts.complete(body, path === "/api/auth/register" ? "register" : "reset");
    return json({ user: result.user }, 200, { "set-cookie": result.cookie });
  } catch (error) {
    if (error instanceof BiboAccountError) return publicError(error.message, error.status);
    if (error instanceof PublicApiError) return publicError(error.message, error.status);
    throw error;
  }
}
