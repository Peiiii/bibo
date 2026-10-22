import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, KeyRound, MoreHorizontal, Plus, ShieldCheck, Terminal } from "lucide-react";
import { Button, Dialog, EmptyState, Field, IconButton, Input, LoadingState, Notice, Select } from "@nextclaw/personal-agent-ui";
import type { BiboIntegration } from "@nextclaw/bibo-api";
import { useBiboChatStore } from "@/features/chat/stores/bibo-chat.store";
import { useIntegrationsStore } from "../stores/integrations.store";
import "../styles/integrations.css";

const date = (value: string): string => new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value));
const dateTime = (value: string): string => new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function IntegrationsPage() {
  const accountId = useBiboChatStore((state) => state.user?.id ?? null);
  const store = useIntegrationsStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [write, setWrite] = useState(false);
  const [days, setDays] = useState(30);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [now, setNow] = useState(Date.now);
  const trigger = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const current = store.accountId === accountId;
  const items = current ? store.items : [];
  const active = items.filter((item) => Date.parse(item.expiresAt) > now);
  const expired = items.filter((item) => Date.parse(item.expiresAt) <= now);
  const item = items.find((value) => value.id === selected);
  useEffect(() => {
    setToken(null); setSelected(null); setRevoking(false); setCreating(false); setCopied("");
    void useIntegrationsStore.getState().load(accountId);
    const refresh = () => { if (document.visibilityState !== "hidden") { setNow(Date.now()); void useIntegrationsStore.getState().load(accountId, true); } };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); void useIntegrationsStore.getState().load(null); };
  }, [accountId]);
  useEffect(() => {
    const next = Math.min(...items.map((value) => Date.parse(value.expiresAt)).filter((value) => value > now));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(next - Date.now() + 10, 0), 2_147_483_647));
    return () => clearTimeout(timer);
  }, [store.items, now]);
  const create = async (): Promise<void> => {
    const value = await store.create({ name, expiresInDays: days, scopes: write ? ["space:read", "space:write"] : ["space:read"] });
    if (value) { setCreating(false); setToken(value); setCopied(""); setName(""); }
  };
  const copy = async (): Promise<void> => {
    try { await navigator.clipboard.writeText(token!); setCopied("已复制，请保存在安全位置。"); }
    catch { setCopied("复制失败，请选中令牌手动复制。"); }
  };
  const row = (value: BiboIntegration) => <div className="bibo-integration-row" role="row" key={value.id}>
    <div className="bibo-integration-identity" role="cell"><span className="bibo-integration-icon"><KeyRound size={18} aria-hidden="true" /></span><div><button type="button" className="bibo-integration-name" onClick={() => setSelected(value.id)}>{value.name}</button><p>创建于 {date(value.createdAt)}</p></div></div>
    <div role="cell"><span className="bibo-integration-scope">{value.scopes.includes("space:write") ? "读写空间" : "只读空间"}</span></div>
    <div role="cell" className="bibo-integration-used"><span className="bibo-integration-mobile-label">最近使用：</span>{value.lastUsedAt ? dateTime(value.lastUsedAt) : "尚未使用"}</div>
    <div role="cell" className="bibo-integration-expiry"><span className="bibo-integration-mobile-label">到期：</span>{date(value.expiresAt)}<span className="bibo-integration-status">{Date.parse(value.expiresAt) <= now ? "已过期" : "有效"}</span></div>
    <div role="cell"><IconButton label={`查看 ${value.name} 授权详情`} icon={<MoreHorizontal />} onClick={() => setSelected(value.id)} /></div>
  </div>;
  return <div className="bibo-integrations">
    <div className="bibo-integrations-toolbar"><h2>已授权的工具 <span>{active.length}</span></h2><Button ref={trigger} tone="primary" disabled={!accountId || store.busy} onClick={() => { store.clearError(); setName(""); setWrite(false); setDays(30); setCreating(true); }}><Plus size={15} />创建访问令牌</Button></div>
    {current && store.error && !creating && !revoking && <div className="bibo-integrations-error"><Notice tone="error">{store.error}</Notice><Button tone="text" disabled={store.busy || store.loading} onClick={() => void store.load(accountId, true)}>重新加载</Button></div>}
    {!current || store.loading && items.length === 0 ? <LoadingState label="正在加载授权…" /> : items.length === 0 && !store.error ? <EmptyState mark={<KeyRound />} title="还没有工具连接到你的空间" detail="通过 CLI 登录，或为你的工具创建访问令牌。" /> : <>
      {active.length > 0 && <div className="bibo-integration-table" role="table" aria-label="有效授权"><div className="bibo-integration-columns" role="row"><span role="columnheader">工具</span><span role="columnheader">访问权限</span><span role="columnheader">最近使用</span><span role="columnheader">到期时间</span><span role="columnheader" className="visually-hidden">操作</span></div>{active.map(row)}</div>}
      {expired.length > 0 && <details className="bibo-integration-expired"><summary>已过期的授权 <span>{expired.length}</span></summary><div role="table" aria-label="已过期授权">{expired.map(row)}</div></details>}
    </>}
    <div className="bibo-integrations-guide"><Terminal size={18} aria-hidden="true" /><div><h3>把 Bibo 连接到你的工具</h3><p>使用 CLI 登录，让 AI 和脚本在你的授权下读写空间。</p><div className="bibo-integrations-guide-links"><a href="https://docs.bibo.bot/guide/quickstart" target="_blank" rel="noopener noreferrer">CLI 使用说明 <ArrowUpRight size={13} /></a><a href="https://docs.bibo.bot/guide/skill" target="_blank" rel="noopener noreferrer">Skill 指南 <ArrowUpRight size={13} /></a></div></div></div>
    <Dialog open={creating && current} onOpenChange={(open) => { setCreating(open); if (!open) store.clearError(); }} title="创建访问令牌" description="为需要访问空间的工具创建独立凭据。" closeLabel="取消创建" busy={store.busy} returnFocusRef={trigger} initialFocusRef={nameInput}>
      <form className="bibo-integration-form" onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <Field label="名称"><Input ref={nameInput} autoComplete="off" maxLength={80} required placeholder="例如：我的编程助手" value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <div className="bibo-integration-form-options"><Field label="访问权限"><Select value={write ? "write" : "read"} onChange={(event) => setWrite(event.target.value === "write")}><option value="read">只读空间</option><option value="write">读写空间</option></Select></Field>
          <Field label="有效期"><Select value={days} onChange={(event) => setDays(Number(event.target.value))}>{[1, 7, 30, 90, 365].map((value) => <option key={value} value={value}>{value} 天</option>)}</Select></Field></div>
        <p className="bibo-integration-trust"><ShieldCheck size={16} />可访问整个空间。仅交给你信任的工具，可随时撤销。</p>
        {store.error && <Notice tone="error">{store.error}</Notice>}
        <div className="ui-overlay__actions"><Button disabled={store.busy} onClick={() => { setCreating(false); store.clearError(); }}>取消</Button><Button tone="primary" type="submit" disabled={!accountId || store.busy || store.loading || !name.trim()}>{store.busy ? "正在创建…" : "创建令牌"}</Button></div>
      </form>
    </Dialog>
    <Dialog open={Boolean(token) && current} onOpenChange={(open) => { if (!open) { setToken(null); setCopied(""); } }} title="保存你的访问令牌" description="令牌只显示这一次。关闭后无法再次查看；遗失时请撤销并重新创建。" closeLabel="关闭令牌" returnFocusRef={trigger}>
      <textarea className="bibo-integrations-token" aria-label="访问令牌" readOnly value={token ?? ""} autoComplete="off" spellCheck={false} />
      <p className="bibo-integration-trust" role="status">{copied || "请勿把令牌放进聊天记录、代码仓库或截图。"}</p><div className="ui-overlay__actions"><Button onClick={() => { setToken(null); setCopied(""); }}>我已保存，关闭</Button><Button tone="primary" onClick={() => void copy()}>复制令牌</Button></div>
    </Dialog>
    <Dialog open={Boolean(item) && !revoking} onOpenChange={(open) => { if (!open) setSelected(null); }} title={item?.name ?? "授权详情"} description="查看这项授权的访问范围和有效期。" closeLabel="关闭详情">
      {item && <><dl className="bibo-integration-details"><dt>访问权限</dt><dd>{item.scopes.includes("space:write") ? "读写空间" : "只读空间"}</dd><dt>授权范围</dt><dd>整个个人空间</dd><dt>创建时间</dt><dd>{dateTime(item.createdAt)}</dd><dt>到期时间</dt><dd>{dateTime(item.expiresAt)}</dd><dt>最近使用</dt><dd>{item.lastUsedAt ? dateTime(item.lastUsedAt) : "尚未使用"}</dd></dl><div className="ui-overlay__actions"><Button tone="danger" disabled={store.busy || store.loading} onClick={() => setRevoking(true)}>撤销授权</Button><Button onClick={() => setSelected(null)}>关闭</Button></div></>}
    </Dialog>
    <Dialog open={Boolean(item) && revoking} onOpenChange={(open) => { if (!open) setRevoking(false); }} title="撤销这项授权？" description={`“${item?.name ?? "此工具"}”将立即失去空间访问权限。空间中的内容会保留。`} closeLabel="取消撤销" busy={store.busy}>
      {store.error && <Notice tone="error">{store.error}</Notice>}<div className="ui-overlay__actions"><Button disabled={store.busy} onClick={() => setRevoking(false)}>保留授权</Button><Button tone="danger" disabled={store.busy || store.loading} onClick={() => { void store.revoke(item!.id).then((ok) => { if (ok) { setSelected(null); setRevoking(false); } }); }}>{store.busy ? "正在撤销…" : store.loading ? "正在刷新…" : "确认撤销"}</Button></div>
    </Dialog>
  </div>;
}
