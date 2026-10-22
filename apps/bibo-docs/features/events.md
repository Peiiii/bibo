# 日程

把有明确起止时间的事项保存到空间中，例如评审、会议或专注时段。按时间范围读取，让其他 AI 在安排工作前了解已有日程。

## 安排与查询

```sh
bibo event create --title '调研评审' --start-at 2026-11-01T14:00:00+08:00 --end-at 2026-11-01T15:00:00+08:00
bibo event list --from 2026-10-31T16:00:00Z --to 2026-11-01T16:00:00Z
bibo event get EVENT_ID
bibo event update EVENT_ID --title '调研与后续计划评审'
```

把 `EVENT_ID` 替换成创建结果的 ID。起止时间必须是带时区的 ISO8601，结束晚于开始。列表按开始时间排序，返回与查询范围相交的日程（含边界）；为避免时区歧义，HTTP 查询建议使用 UTC 的 `Z` 格式。

## 用 HTTP 创建日程

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/space \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"action":"event.create","input":{"title":"调研评审","startAt":"2026-11-01T06:00:00Z","endAt":"2026-11-01T07:00:00Z","requestId":"research-review-001"}}'
```

`result` 包含 `id/title/description/startAt/endAt/source/createdAt/updatedAt/version`；列表为 `{items,nextCursor}`。直接 API 更新提交 `event.update` 和 `{id,version,...变更字段}`；CLI 自动读取当前版本，亦可显式 `--version`。

## 操作与参数

<!--@include: ../.generated/events.md-->

## 当前边界

`bibo event delete EVENT_ID` 删除真实日程。日程目前是个人空间记录，不发送会议邀请，不连接第三方日历，也不自动触发提醒或执行任务。需要送达一条待处理事项，可使用[收件箱](./inbox)。
