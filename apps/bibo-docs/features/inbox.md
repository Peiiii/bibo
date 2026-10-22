# 收件箱

把需要用户关注、确认或处理的结果送到空间收件箱。适合 AI 完成调研后留下结论、提出待决事项，用户在网页中继续处理。

## 送达与处理

```sh
bibo inbox create --title '请确认调研方向' --body '建议先验证笔记与任务接入。' --kind decision
bibo inbox list --unread --unresolved --limit 20
bibo inbox get ITEM_ID
bibo inbox read ITEM_ID
bibo inbox resolve ITEM_ID
```

将 `ITEM_ID` 替换为返回的 `result.id`。类型为 `agent`（默认）、`decision`、`reminder`。`get` 只读取正文；`read` 才改变已读状态，`resolve` 同时标记已读和已处理。

## 用 HTTP 送达提醒

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/space \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"action":"inbox.create","input":{"title":"请确认调研方向","body":"建议先验证笔记与任务接入。","kind":"decision","requestId":"research-decision-001"}}'
```

`result` 包含 `id/kind/title/body/source/createdAt/updatedAt/readAt/resolvedAt/version`。新条目的 `readAt` 和 `resolvedAt` 为 null；处理动作递增版本。列表返回 `{items,nextCursor}`。API 标记已读使用 `inbox.read` 和 `{id,version}`。

## 操作与参数

<!--@include: ../.generated/inbox.md-->

## 来源与边界

可选 `source` 是 `{kind,id?}`，kind 为 `bibo/session/task/event/file`。它表示条目关联的上下文，不是给另一个 Agent 寻址的协议。收件箱目前没有编辑、删除或标记未读 API，也不发送邮件、推送或定时提醒。已处理条目仍可查询；筛选 `--unresolved` 时会排除它们。
