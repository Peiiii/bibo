import { create } from "zustand";

type Authorization = { user_code: string; client_name: string; scope: string; expires_at: number; status: "pending" | "approved" | "denied" };
type State = {
  code: string; info: Authorization | null; phase: "input" | "loading" | "consent" | "saving" | "approved" | "denied";
  readOnly: boolean; error: string;
  setCode(code: string): void; setReadOnly(value: boolean): void;
  load(code: string, accountId: string | null): Promise<void>; decide(approve: boolean): Promise<void>;
};
export function createDeviceAuthorizationStore(fetcher: typeof fetch = fetch) {
  let generation = 0;
  const request = async <T>(path: string, body?: unknown): Promise<T> => {
    const response = await fetcher(path, { credentials: "same-origin", ...(body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.error_description === "string" ? result.error_description : typeof result.error === "string" ? result.error : "授权请求暂时不可用。");
    return result;
  };
  return create<State>((set, get) => ({
    code: "", info: null, phase: "input", readOnly: false, error: "",
    setCode(code) { set({ code }); }, setReadOnly(readOnly) { set({ readOnly }); },
    async load(rawCode, accountId) {
      const current = ++generation, code = rawCode.replaceAll("-", "").replaceAll(" ", "").toUpperCase();
      set({ ...(code ? { code } : {}), info: null, phase: "input", error: "" });
      if (!code || !accountId) return;
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) { set({ error: "请输入终端显示的八位授权码。" }); return; }
      set({ phase: "loading" });
      try {
        const info = await request<Authorization>(`/api/auth/device?user_code=${code}`);
        if (current !== generation) return;
        set({ info, readOnly: !info.scope.split(" ").includes("space:write"), phase: info.status === "pending" ? "consent" : info.status });
      } catch (error) { if (current === generation) set({ phase: "input", error: error instanceof Error ? error.message : "读取授权请求失败。" }); }
    },
    async decide(approve) {
      if (get().phase !== "consent" || !get().info) return;
      const current = generation; set({ phase: "saving", error: "" });
      try {
        const result = await request<{ status: "approved" | "denied" }>("/api/auth/device/decision", { user_code: get().info!.user_code, approve, readOnly: get().readOnly });
        if (current === generation) set({ phase: result.status });
      } catch (error) { if (current === generation) set({ phase: "consent", error: error instanceof Error ? error.message : "提交授权失败，请重试。" }); }
    },
  }));
}
export const useDeviceAuthorizationStore = createDeviceAuthorizationStore();
