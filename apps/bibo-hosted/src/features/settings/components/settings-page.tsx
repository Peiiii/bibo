import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ArrowUpRight, Check, CircleUserRound, Plug, Shield, Sun } from "lucide-react";
import { Button, Dialog, NavigationItem, Notice } from "@nextclaw/personal-agent-ui";
import { readSettingsSection, type SettingsSection } from "@/app/workspace-router";
import { useBiboChatStore } from "@/features/chat/stores/bibo-chat.store";
import { useBiboConversation } from "@/features/chat/hooks/use-bibo-conversation";
import { useWorkspaceUiStore } from "@/features/space";
import { IntegrationsPage } from "@/features/integrations/components/integrations-page";
import { biboCopy } from "@/shared/configs/bibo-copy.config";
import "../styles/settings.css";

const sections = [
  { id: "account", title: "账号", group: "个人", icon: CircleUserRound },
  { id: "appearance", title: "外观", group: "个人", icon: Sun },
  { id: "data", title: "数据管理", group: "空间", icon: Shield },
  { id: "integrations", title: "接入与授权", group: "集成", icon: Plug },
] as const;

export function SettingsNavigation({ onNavigate }: { onNavigate: () => void }) {
  const section = readSettingsSection(useLocation().pathname);
  return <nav className="bibo-settings-navigation" aria-label="设置分类">{sections.map((item, index) => <div key={item.id}>
    {(index === 0 || sections[index - 1].group !== item.group) && <p className="bibo-settings-group">{item.group}</p>}
    <NavigationItem label={item.title} selected={section === item.id} layout="row"><Link to={`/settings/${item.id}`} aria-current={section === item.id ? "page" : undefined} onClick={onNavigate}><item.icon aria-hidden="true" />{item.title}</Link></NavigationItem>
  </div>)}</nav>;
}

export function SettingsPage() {
  const location = useLocation();
  const section = readSettingsSection(location.pathname) ?? "account";
  const account = useBiboChatStore((state) => state.user);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, [section]);
  return <section className="bibo-settings-page" aria-labelledby="settings-title"><div className="bibo-settings-content">
    <header className="bibo-settings-heading"><div><h1 id="settings-title" ref={title} tabIndex={-1}>{sections.find((item) => item.id === section)!.title}</h1>
      <p>{section === "account" ? "管理你的 Bibo 账号。" : section === "appearance" ? "选择适合你的空间外观。" : section === "data" ? "管理保存在 Bibo 中的个人内容。" : "查看和管理能够访问你空间的工具。"}</p></div>
      {section === "integrations" && <a className="bibo-settings-docs" href="https://docs.bibo.bot" target="_blank" rel="noopener noreferrer">开发者文档 <ArrowUpRight size={14} /></a>}
    </header>
    <SettingsContent key={`${account?.id ?? "anonymous"}:${section}`} section={section} />
  </div></section>;
}

function SettingsContent({ section }: { section: SettingsSection }) {
  const store = useBiboChatStore();
  const run = useBiboConversation();
  const { theme, setTheme } = useWorkspaceUiStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [done, setDone] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (section === "integrations") return <IntegrationsPage />;
  if (section === "appearance") return <div className="bibo-settings-section"><h2>主题</h2><div className="bibo-theme-options" role="group" aria-label="主题">{([
    { value: "classic", label: biboCopy.classicTheme }, { value: "neutral", label: biboCopy.neutralTheme },
  ] as const).map((item) => <button className={`bibo-theme-option is-${item.value}`} key={item.value} type="button" aria-pressed={theme === item.value} onClick={() => setTheme(item.value)}>
    <span className="bibo-theme-preview" aria-hidden="true"><span /><span><i /><i /><i /></span></span><span className="bibo-theme-label">{item.label}{theme === item.value && <Check size={16} aria-hidden="true" />}</span>
  </button>)}</div><p className="bibo-settings-note">外观设置自动保存在此浏览器中。</p></div>;
  if (section === "account") return <div className="bibo-settings-section"><div className="bibo-setting-row"><div><h2>登录邮箱</h2><p className="bibo-settings-email">{store.user?.email ?? "尚未登录"}</p></div><span className="bibo-settings-status">{store.user ? "已登录" : "未登录"}</span></div>
    <div className="bibo-setting-row"><div><h2>退出登录</h2><p>退出当前浏览器中的 Bibo 账号。</p></div><Button disabled={!store.user || run.busy} onClick={() => void store.logout()}>退出登录</Button></div></div>;
  return <div className="bibo-settings-section"><div className="bibo-setting-row bibo-setting-danger"><div><h2>清空个人空间</h2><p>删除对话和空间内容，并撤销所有接入授权。此操作无法撤销。</p></div><Button ref={trigger} tone="danger" disabled={!store.user || run.busy || busy} onClick={() => { setFailure(""); setDone(false); setConfirming(true); }}>清空空间</Button></div>
    {done && <Notice tone="success">{biboCopy.resetDone}</Notice>}
    <Dialog open={confirming} onOpenChange={setConfirming} title="清空个人空间？" description={biboCopy.resetConfirm} closeLabel="取消清空" busy={busy} returnFocusRef={trigger}>
      {failure && <Notice tone="error">{failure}</Notice>}<div className="ui-overlay__actions"><Button disabled={busy} onClick={() => setConfirming(false)}>保留个人空间</Button><Button tone="danger" disabled={busy} onClick={() => {
        setBusy(true); setFailure(""); void store.reset().then((ok) => { setBusy(false); if (ok) { setConfirming(false); setDone(true); } else setFailure(useBiboChatStore.getState().status); });
      }}>{busy ? "正在清空…" : "确认清空"}</Button></div>
    </Dialog>
  </div>;
}
