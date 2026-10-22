import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

type Start = { device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval: number };
const grantType = "urn:ietf:params:oauth:grant-type:device_code";

async function openBrowser(url: string): Promise<boolean> {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    const timer = setTimeout(() => { child.kill(); resolve(false); }, 5000);
    child.once("error", () => { clearTimeout(timer); resolve(false); });
    child.once("exit", (code) => { clearTimeout(timer); resolve(code === 0); });
  });
}

/** One device flow serves both automatic browser opening and remote terminals. */
export async function deviceLogin(options: { endpoint: string; noBrowser?: boolean; readOnly?: boolean; name?: string }): Promise<string> {
  const controller = new AbortController();
  const cancel = (): void => controller.abort(new Error("Login cancelled."));
  process.once("SIGINT", cancel);
  const request = (path: string, body: unknown) => fetch(`${options.endpoint}${path}`, {
    method: "POST", redirect: "error", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
  });
  try {
    const response = await request("/api/auth/device/code", { client_id: "bibo-cli", name: options.name ?? "Bibo CLI",
      scope: options.readOnly ? "space:read" : "space:read space:write" });
    const start = await response.json() as Start & { error_description?: string };
    if (!response.ok) throw new Error(start.error_description || "Could not start browser login. Use --token-stdin for an older deployment.");
    const uri = new URL(start.verification_uri_complete || start.verification_uri);
    if (uri.origin !== options.endpoint || uri.pathname !== "/authorize" || typeof start.device_code !== "string" ||
      !/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(start.user_code) ||
      !Number.isFinite(start.expires_in) || start.expires_in < 1 || start.expires_in > 900 ||
      !Number.isFinite(start.interval) || start.interval < 1 || start.interval > 60) throw new Error("Invalid browser authorization response.");
    process.stderr.write(`Authorize Bibo CLI\nCode: ${start.user_code}\nOpen: ${uri.toString()}\n`);
    const hasDesktop = process.platform === "darwin" || process.platform === "win32" || process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
    if (!options.noBrowser && !process.env.SSH_CONNECTION && !process.env.SSH_TTY && hasDesktop) {
      if (!await openBrowser(uri.toString())) process.stderr.write("Could not open a browser. Open the URL above on any device.\n");
    }
    process.stderr.write("Waiting for browser approval… (Ctrl+C to cancel)\n");
    const deadline = Date.now() + start.expires_in * 1000;
    let interval = start.interval, networkDelay = 0;
    while (Date.now() < deadline) {
      const delay = Math.max(interval, networkDelay) * 1000;
      if (Date.now() + delay >= deadline) break;
      await sleep(delay, undefined, { signal: controller.signal });
      let result: Response;
      try { result = await request("/api/auth/device/token", { client_id: "bibo-cli", grant_type: grantType, device_code: start.device_code }); }
      catch (error) {
        if (controller.signal.aborted) throw controller.signal.reason;
        networkDelay = Math.min(Math.max(networkDelay, interval) * 2, 30); continue;
      }
      const value = await result.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string };
      if (result.ok && typeof value.access_token === "string" && value.access_token) return value.access_token;
      if (value.error === "slow_down" || result.status === 429) { interval += 5; networkDelay = 0; continue; }
      if (value.error === "authorization_pending") { networkDelay = 0; continue; }
      if (result.status >= 500) { networkDelay = Math.min(Math.max(networkDelay, interval) * 2, 30); continue; }
      if (value.error === "access_denied") throw new Error("Browser authorization was denied. No login was saved.");
      if (value.error === "expired_token") break;
      throw new Error(value.error_description || "Browser authorization failed. Run bibo auth login again.");
    }
    throw new Error("Browser authorization expired. Run bibo auth login again.");
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Login cancelled.");
    throw error;
  } finally { process.off("SIGINT", cancel); }
}
