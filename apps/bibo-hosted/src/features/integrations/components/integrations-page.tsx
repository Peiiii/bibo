import { useEffect, useState } from "react";
import { Button, Dialog } from "@nextclaw/personal-agent-ui";
import { KeyRound, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useBiboChatStore } from "@/features/chat/stores/bibo-chat.store";
import { useIntegrationsStore } from "../stores/integrations.store";
import "../styles/integrations.css";

const date = (value: string): string => new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value));

export function IntegrationsPage() {
  const accountId = useBiboChatStore((state) => state.user?.id ?? null);
  const store = useIntegrationsStore();
  const [name, setName] = useState("");
  const [write, setWrite] = useState(false);
  const [days, setDays] = useState(30);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  useEffect(() => {
    setToken(null); setRevoking(null); setCopied("");
    void useIntegrationsStore.getState().load(accountId);
    return () => { void useIntegrationsStore.getState().load(null); };
  }, [accountId]);
  const create = async (): Promise<void> => {
    const value = await store.create({ name, expiresInDays: days, scopes: write ? ["space:read", "space:write"] : ["space:read"] });
    if (value) { setToken(value); setCopied(""); setName(""); }
  };
  const copy = async (): Promise<void> => {
    try { await navigator.clipboard.writeText(token!); setCopied("已复制，请保存在安全位置。"); }
    catch { setCopied("复制失败，请选中令牌手动复制。"); }
  };
  return <section className="bibo-integrations" aria-labelledby="integrations-title">
    <div className="bibo-integrations__intro"><span className="bibo-integrations__mark"><KeyRound size={24} /></span>
      <div><h2 id="integrations-title">让你信任的 AI 接入空间</h2><p>笔记、任务和资料，交给你选择的工具继续使用。每个授权都可以随时撤销。</p></div>
      <a href="/docs/" target="_blank" rel="noopener noreferrer">接入文档 <ArrowUpRight size={16} /></a>
    </div>
    <div className="bibo-integrations__grid">
      <form className="bibo-integrations__panel" onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <h3>创建访问令牌</h3>
        <label htmlFor="integration-name">授权给谁<input id="integration-name" autoComplete="off" maxLength={80} required placeholder="例如：我的编程助手" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label htmlFor="integration-scope">空间权限<select id="integration-scope" value={write ? "write" : "read"} onChange={(event) => setWrite(event.target.value === "write")}><option value="read">只读 · 查询和读取内容</option><option value="write">读写 · 可创建、修改和删除内容</option></select></label>
        <label htmlFor="integration-days">有效期<select id="integration-days" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={1}>1 天</option><option value={7}>7 天</option><option value={30}>30 天</option><option value={90}>90 天</option><option value={365}>365 天</option></select></label>
        <p className="bibo-integrations__hint"><ShieldCheck size={16} />令牌代表你访问整个空间，请只交给信任的工具。</p>
        <Button type="submit" tone="primary" disabled={!accountId || store.busy || store.loading || !name.trim()}>{store.busy ? "正在处理…" : "创建令牌"}</Button>
      </form>
      <div className="bibo-integrations__panel bibo-integrations__quickstart"><h3>三步开始使用</h3>
        <ol><li>创建令牌，复制并妥善保存。</li><li>在终端安装 CLI：<code>npm install -g @nextclaw/bibo</code></li><li>运行 <code>bibo auth login</code>，按提示粘贴令牌。</li></ol>
        <p>给 AI 安装 Skill：</p><code>bibo skill install --path ~/.codex/skills</code>
        <a href="/docs/guide/quickstart">查看完整使用说明 →</a>
      </div>
    </div>
    {store.error && <div className="bibo-integrations__error" role="alert">{store.error}<Button tone="text" disabled={store.busy} onClick={() => void store.load(accountId)}>重新加载</Button></div>}
    <div className="bibo-integrations__list"><h3>已有授权 <span>{store.items.length}</span></h3>
      {store.loading ? <p role="status">正在加载授权…</p> : store.items.length === 0 ? <p className="bibo-integrations__empty">还没有外部工具接入你的空间。</p> : store.items.map((item) => <article className="bibo-integrations__item" key={item.id}>
        <KeyRound size={18} aria-hidden="true" /><div><h4>{item.name} <span>{item.scopes.includes("space:write") ? "读写" : "只读"}</span></h4><p>{Date.parse(item.expiresAt) <= Date.now() ? "已过期" : `${date(item.expiresAt)} 到期`} · {item.lastUsedAt ? `最近使用 ${date(item.lastUsedAt)}` : "尚未使用"}</p></div>
        <Button tone="danger" disabled={store.busy} onClick={() => setRevoking(item.id)}>撤销<span className="visually-hidden"> {item.name}</span></Button>
      </article>)}
    </div>
    <Dialog open={Boolean(token)} onOpenChange={(open) => { if (!open) { setToken(null); setCopied(""); } }} title="保存你的访问令牌" description="令牌只显示这一次。关闭后无法再次查看；遗失时请撤销并重新创建。" closeLabel="关闭令牌">
      <textarea className="bibo-integrations__token" aria-label="访问令牌" readOnly value={token ?? ""} autoComplete="off" spellCheck={false} />
      <p role="status">{copied || "请勿把令牌放进聊天记录、代码仓库或截图。"}</p><div className="ui-overlay__actions"><Button onClick={() => { setToken(null); setCopied(""); }}>我已保存，关闭</Button><Button tone="primary" onClick={() => void copy()}>复制令牌</Button></div>
    </Dialog>
    <Dialog open={Boolean(revoking)} onOpenChange={(open) => { if (!open) setRevoking(null); }} title="撤销这项授权？" description="该工具将立即失去空间访问权限。空间中的内容会保留。" closeLabel="取消撤销" busy={store.busy}>
      {store.error && <p role="alert">{store.error}</p>}<div className="ui-overlay__actions"><Button disabled={store.busy} onClick={() => setRevoking(null)}>保留授权</Button><Button tone="danger" disabled={store.busy} onClick={() => { void store.revoke(revoking!).then((ok) => { if (ok) setRevoking(null); }); }}>{store.busy ? "正在撤销…" : "确认撤销"}</Button></div>
    </Dialog>
  </section>;
}
