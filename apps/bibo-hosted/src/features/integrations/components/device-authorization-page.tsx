import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { Check, Clock3, FileText, LockKeyhole, PencilLine, ShieldCheck, Terminal, X } from "lucide-react";
import { Button, Input } from "@nextclaw/personal-agent-ui";
import { useBiboChatStore } from "@/features/chat/stores/bibo-chat.store";
import { AuthPanel } from "@/features/chat/components/auth-panel";
import { useDeviceAuthorizationStore } from "../stores/device-authorization.store";
import "../styles/authorization.css";

export function DeviceAuthorizationPage() {
  const account = useBiboChatStore((state) => state.user);
  const checked = useBiboChatStore((state) => state.authChecked);
  const search = useLocation().search;
  const state = useDeviceAuthorizationStore();
  const load = state.load;
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { const previous = document.title; document.title = "终端登录授权 · Bibo"; void useBiboChatStore.getState().bootstrap(); return () => { document.title = previous; }; }, []);
  useEffect(() => { void load(new URLSearchParams(search).get("user_code") ?? "", account?.id ?? null); }, [search, account?.id, load]);
  useEffect(() => { if (["approved", "denied", "expired"].includes(state.phase)) title.current?.focus(); }, [state.phase]);
  const complete = ["approved", "denied", "expired"].includes(state.phase);
  const code = state.info?.user_code ?? state.code;
  const formatted = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
  const phase = !checked ? "loading" : state.phase;
  const heading = phase === "approved" ? "授权成功" : phase === "denied" ? "已拒绝授权" : phase === "expired" ? "授权链接已过期" : phase === "input" ? "输入设备授权码" : "连接你的 Bibo CLI";
  const switchAccount = async () => { await useBiboChatStore.getState().logout(); useBiboChatStore.getState().setAuthMode("login"); };
  return <main className={`bibo-authorization${complete ? " is-complete" : ""}`}><div className="bibo-authorization__frame">
    <header className="bibo-authorization__brand"><a href="https://bibo.bot" aria-label="Bibo 首页">Bibo<span>.</span></a><span><LockKeyhole size={14} />安全授权</span></header>
    {checked && !account ? <AuthPanel variant="authorization" /> : <section className={`bibo-authorization__card${complete ? " bibo-authorization__result" : ""}`} aria-labelledby="device-title" aria-busy={phase === "loading" || phase === "saving"}>
      <div className="bibo-authorization__intro"><div className={`bibo-authorization__icon is-${phase}`} aria-hidden="true">{phase === "approved" ? <Check /> : phase === "denied" ? <X /> : phase === "expired" ? <Clock3 /> : <Terminal />}</div>
        <h1 id="device-title" tabIndex={-1} ref={title}>{heading}</h1>
        <p>{phase === "approved" ? "连接已就绪，回到终端继续。" : phase === "denied" ? "你的空间仍由你掌控。" : phase === "expired" ? "这次请求已超过有效时间。" : phase === "input" ? "输入终端中显示的八位授权码。" : "让终端安全地访问你的个人空间。"}</p>
        {account && !complete && <div className="bibo-authorization__account"><span className="bibo-authorization__avatar" aria-hidden="true">{account.email[0]?.toUpperCase()}</span><span>{account.email}</span><button type="button" onClick={() => void switchAccount()} disabled={phase === "saving"}>切换账号</button></div>}
      </div>
      <div className="bibo-authorization__content" key={phase === "saving" ? "consent" : phase}>
        {phase === "input" && <form onSubmit={(event) => { event.preventDefault(); void state.load(state.code, account?.id ?? null); }}><label htmlFor="device-code">设备授权码</label><Input id="device-code" autoComplete="off" spellCheck={false} autoCapitalize="characters" placeholder="ABCD-EFGH" value={state.code} onChange={(event) => state.setCode(event.target.value)} required maxLength={10} aria-describedby="device-code-hint" /><p id="device-code-hint" className="bibo-authorization__muted">授权码仅用于确认这台设备，10 分钟内有效。</p><Button type="submit" tone="primary" disabled={!account}>继续</Button></form>}
        {phase === "loading" && <div className="bibo-authorization__loading" role="status"><span />正在读取授权请求…</div>}
        {(phase === "consent" || phase === "saving") && state.info && <>
          <p className="bibo-authorization__request"><strong>{state.info.client_name}</strong> 希望访问你的 Bibo 空间</p>
          <div className="bibo-authorization__code-box"><span>请与终端中的授权码核对</span><p className="bibo-device-auth__code">{formatted}</p></div>
          <ul className="bibo-authorization__permissions"><li><FileText size={20} /><div><strong>读取空间内容</strong><span>笔记、文件、项目、待办、日程、收件箱和图片</span></div></li>{state.info.scope.includes("space:write") && !state.readOnly && <li><PencilLine size={20} /><div><strong>管理空间内容</strong><span>创建、修改和删除内容，以及上传图片</span></div></li>}</ul>
          {state.info.scope.includes("space:write") && <label className="bibo-authorization__readonly"><input type="checkbox" checked={state.readOnly} disabled={phase === "saving"} onChange={(event) => state.setReadOnly(event.target.checked)} />仅允许读取，不允许修改</label>}
          <p className="bibo-authorization__trust"><ShieldCheck size={16} /><span>仅授权你刚发起的请求。有效期 30 天，可随时撤销。</span></p>
          <div className="bibo-authorization__actions"><Button tone="text" disabled={phase === "saving"} onClick={() => void state.decide(false)}>拒绝</Button><Button tone="primary" disabled={phase === "saving"} onClick={() => void state.decide(true)}>{phase === "saving" ? "正在确认…" : state.readOnly ? "授权读取空间" : "授权读写空间"}</Button></div>
        </>}
        {phase === "approved" && <><p role="status">CLI 会自动完成登录，你可以关闭此页面。</p><Link className="bibo-authorization__manage" to="/settings/integrations">管理接入与授权</Link></>}
        {phase === "denied" && <p role="status">此终端未获得访问权限。需要连接时，请在终端重新运行 <code>bibo auth login</code>。</p>}
        {phase === "expired" && <><p role="status">请在终端重新运行 <code>bibo auth login</code>，或输入另一组有效授权码。</p><Button onClick={() => { state.setCode(""); void state.load("", account?.id ?? null); }}>输入其他授权码</Button></>}
        {state.error && phase !== "expired" && <p role="alert" className="bibo-authorization__error">{state.error}</p>}
      </div>
    </section>}
    <footer className="bibo-authorization__footer"><span>你的空间，由你掌控。</span><a href="https://docs.bibo.bot/guide/auth" target="_blank" rel="noopener noreferrer">授权与安全</a></footer>
  </div></main>;
}
