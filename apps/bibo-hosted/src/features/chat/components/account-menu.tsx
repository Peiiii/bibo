import { useRef } from "react";
import { useNavigate } from "react-router";
import { CircleUserRound, ChevronsUpDown } from "lucide-react";
import { ActionMenu, ActionMenuItem, ActionMenuLink, Button, NavigationItem } from "@nextclaw/personal-agent-ui";
import { useBiboChatStore } from "@/features/chat/stores/bibo-chat.store";
import { biboCopy as copy } from "@/shared/configs/bibo-copy.config";
import { useBiboConversation } from "@/features/chat/hooks/use-bibo-conversation";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const store = useBiboChatStore();
  const run = useBiboConversation();
  const trigger = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  return <ActionMenu label="账号与帮助" trigger={compact ? <NavigationItem ref={trigger} label="账号与帮助" layout="icon"><button type="button" className="account-menu-trigger" aria-label="账号与帮助"><CircleUserRound aria-hidden="true" /></button></NavigationItem> :
    <Button ref={trigger} className="account-menu-trigger" aria-label="账号与帮助" tooltip="账号与帮助" tooltipSide="right"><CircleUserRound aria-hidden="true" /><span>{store.user?.email ?? "账号与帮助"}</span><ChevronsUpDown aria-hidden="true" /></Button>}>
    {store.user && <ActionMenuItem onSelect={() => { store.setMenuOpen(false); void navigate("/settings"); }}>设置</ActionMenuItem>}
    <ActionMenuLink href="https://bibo.bot/" external>认识 Bibo ↗</ActionMenuLink>
    <ActionMenuLink href="/help.html">{copy.help}</ActionMenuLink>
    <ActionMenuLink href="https://docs.bibo.bot/" external>开发者文档</ActionMenuLink>
    {store.user && <ActionMenuItem onSelect={() => void store.logout()} disabled={run.busy}>{copy.logout}</ActionMenuItem>}
  </ActionMenu>;
}
