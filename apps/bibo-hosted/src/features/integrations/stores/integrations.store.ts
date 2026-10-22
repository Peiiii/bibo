import { create } from "zustand";
import { BiboClient } from "@nextclaw/bibo-client";
import type { BiboIntegration, BiboScope } from "@nextclaw/bibo-api";

type Client = Pick<BiboClient, "integrations" | "createIntegration" | "revokeIntegration">;
type State = {
  accountId: string | null; items: BiboIntegration[]; loading: boolean; busy: boolean; error: string;
  load(accountId: string | null, refresh?: boolean): Promise<void>;
  clearError(): void;
  create(input: { name: string; scopes: BiboScope[]; expiresInDays: number }): Promise<string | null>;
  revoke(id: string): Promise<boolean>;
};
export function createIntegrationsStore(client: Client) {
  let generation = 0;
  return create<State>((set, get) => ({
    accountId: null, items: [], loading: false, busy: false, error: "",
    clearError() { set({ error: "" }); },
    async load(accountId, refresh = false) {
      if (refresh && (get().accountId !== accountId || get().busy || get().loading)) return;
      const current = ++generation;
      set({ accountId, items: refresh ? get().items : [], loading: Boolean(accountId), busy: false, error: "" });
      if (!accountId) return;
      try { const items = await client.integrations(); if (current === generation) set({ items, loading: false }); }
      catch (error) { if (current === generation) set({ loading: false, error: error instanceof Error ? error.message : "读取授权失败。" }); }
    },
    async create(input) {
      if (get().busy || get().loading || !get().accountId) return null;
      const current = generation;
      set({ busy: true, error: "" });
      try {
        const result = await client.createIntegration(input);
        if (current !== generation) return null;
        set((state) => ({ items: [...state.items, result.integration], busy: false }));
        return result.token;
      } catch (error) {
        if (current === generation) set({ busy: false, error: error instanceof Error ? error.message : "创建授权失败。" });
        return null;
      }
    },
    async revoke(id) {
      if (get().busy || get().loading || !get().accountId) return false;
      const current = generation; set({ busy: true, error: "" });
      try {
        await client.revokeIntegration(id);
        if (current !== generation) return false;
        set((state) => ({ busy: false, items: state.items.filter((item) => item.id !== id) })); return true;
      } catch (error) {
        if (current === generation) set({ busy: false, error: error instanceof Error ? error.message : "撤销授权失败。" });
        return false;
      }
    },
  }));
}
export const useIntegrationsStore = createIntegrationsStore(new BiboClient());
