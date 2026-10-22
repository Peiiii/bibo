# 待办与任务

把接下来要做的事保存在空间里，按项目、完成状态和截止时间查找。可以维护优先级、时间与子任务；AI 和网页共享这些待办。

## 创建、筛选和完成

```sh
bibo task create --title '整理调研结论' --priority high --due-at 2026-11-01T10:00:00+08:00
bibo task list --open --limit 20
bibo task list --query 调研 --due-before 2026-11-02T00:00:00+08:00
bibo task get TASK_ID
bibo task update TASK_ID --status active
bibo task update TASK_ID --status done
```

把 `TASK_ID` 替换为创建结果的 `result.id`。状态是 `planned`（默认）、`active`、`done`、`cancelled`；优先级是 `low/medium/high`（默认 medium）。`--open` 只返回 planned/active。`dueFrom` 含边界，`dueBefore` 不含边界，未设截止时间的任务不匹配截止筛选。

## 子任务与项目

```sh
bibo task create --input '{"title":"发布调研","subtasks":[{"title":"核对结论","done":false},{"title":"保存笔记","done":false}]}'
bibo task update TASK_ID --project-id PROJECT_ID
bibo task list --project-id PROJECT_ID --open
```

项目须先[创建](./projects)。更新 `subtasks` 是替换整份数组，请先读取原内容。用 JSON `null` 清除 `projectId/startAt/dueAt` 等可空字段，例如 `--input '{"dueAt":null}'`。

## 用 HTTP 创建待办

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/space \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"action":"task.create","input":{"title":"整理调研结论","priority":"high","requestId":"research-task-001"}}'
```

`result` 包含 `id/title/description/projectId/status/priority/startAt/dueAt/completedAt/subtasks/source/createdAt/updatedAt/version`。创建时 version=1，更新后递增；列表为 `{items,nextCursor}`。直接 API 完成任务提交 `task.update` 及 `{id,version,status:"done"}`。

## 操作与参数

<!--@include: ../.generated/tasks.md-->

## 执行与并发边界

创建任务只保存待办，不会自动执行 Agent 或建立调度。时间必须带时区；截止时间不能早于开始时间。CLI 更新前读版本，指定 `--version` 可保护已读快照。删除命令 `bibo task delete TASK_ID` 直接删除真实任务，冲突返回 409，不应盲目重试。
