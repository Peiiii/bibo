import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Button, Input } from "@nextclaw/personal-agent-ui";
import { useBiboChatStore } from "@/features/chat/stores/bibo-chat.store";
import { useDeviceAuthorizationStore } from "../stores/device-authorization.store";
import "../styles/integrations.css";

export function DeviceAuthorizationPage() {
  const account = useBiboChatStore((state) => state.user);
  const search = useLocation().search;
  const state = useDeviceAuthorizationStore();
  const load = state.load;
  useEffect(() => { void load(new URLSearchParams(search).get("user_code") ?? "", account?.id ?? null); }, [search, account?.id, load]);
  const code = state.info?.user_code ?? state.code;
  const formatted = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
  return <section className="bibo-device-auth" aria-labelledby="device-title">
    <div className="bibo-integrations__panel">
      <p className="bibo-device-auth__eyebrow">Bibo · 终端授权</p>
      <h1 id="device-title">{state.phase === "approved" ? "授权成功" : state.phase === "denied" ? "已拒绝授权" : "连接你的 Bibo CLI"}</h1>
      {state.phase === "input" && <>
        <p>输入终端显示的授权码，在网页确认后，CLI 会自动完成登录。</p>
        <form onSubmit={(event) => { event.preventDefault(); void state.load(state.code, account?.id ?? null); }}>
          <label htmlFor="device-code">授权码</label>
          <Input id="device-code" autoComplete="off" spellCheck={false} autoCapitalize="characters" placeholder="ABCD-EFGH" value={state.code} onChange={(event) => state.setCode(event.target.value)} required maxLength={10} />
          <Button type="submit" tone="primary" disabled={!account}>继续</Button>
        </form>
      </>}
      {state.phase === "loading" && <p role="status">正在读取授权请求…</p>}
      {(state.phase === "consent" || state.phase === "saving") && state.info && <>
        <p><strong>{state.info.client_name}</strong> 请求访问你的空间。请核对下方授权码与终端一致。</p>
        <p className="bibo-device-auth__code" aria-label={`授权码 ${formatted}`}>{formatted}</p>
        <p>当前账号：{account?.email}</p>
        <ul><li>读取笔记、文件、项目、待办、日程、收件箱和图片。</li>
          {state.info.scope.includes("space:write") && !state.readOnly && <li>创建、修改和删除空间内容。</li>}</ul>
        {state.info.scope.includes("space:write") && <label className="bibo-device-auth__permission"><input type="checkbox" checked={state.readOnly} disabled={state.phase === "saving"} onChange={(event) => state.setReadOnly(event.target.checked)} />仅允许读取，不允许修改</label>}
        <p className="bibo-device-auth__hint">仅确认你刚刚在终端发起的请求。授权有效期 30 天，你可以随时撤销。</p>
        <div className="bibo-device-auth__actions"><Button tone="text" disabled={state.phase === "saving"} onClick={() => void state.decide(false)}>拒绝</Button>
          <Button tone="primary" disabled={state.phase === "saving"} onClick={() => void state.decide(true)}>{state.phase === "saving" ? "正在确认…" : state.readOnly ? "授权读取空间" : "授权读写空间"}</Button></div>
      </>}
      {state.phase === "approved" && <p role="status">可以返回终端了，CLI 会自动继续。你可以在<Link to="/integrations">接入与授权</Link>中管理这项授权。</p>}
      {state.phase === "denied" && <p role="status">CLI 不会获得访问权限。需要时可以在终端重新发起登录。</p>}
      {state.error && <p role="alert" className="bibo-integrations__error">{state.error}</p>}
    </div>
  </section>;
}
