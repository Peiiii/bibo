# 空间概览

在接手工作前，读取当前空间的任务、日程与收件箱摘要。适合 AI 每次开始工作时了解待处理事项，再按对象 ID 读取完整上下文。

## 一条命令了解当下

```sh
bibo overview
```

只需要 `space:read`。响应为 `{result:...}`，不修改空间。

## 用 HTTP 读取

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/space \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"action":"overview.get","input":{}}'
```

## 动作与返回结果

<!--@include: ../.generated/overview.md-->

概览返回 `tasks`（最多 4 条未完成任务）、`events`（最多 4 条尚未结束的日程）、`inbox`（最多 4 条未处理条目）、`notes`（最近 3 条笔记）、`projects`（最多 3 个有任务的项目进度）以及 `counts.unread/activeTasks`。

这些是摘要，不能当成全部对象的完整备份。需要完整列表时，分别使用[任务](./tasks)、[日程](./events)、[收件箱](./inbox)的分页查询；笔记正文与文件内容通过[文件读取](./files)取得。

## 先发现服务端能力

```sh
bibo actions
```

等价于 `GET /api/v1/actions`，返回当前服务端动作名、参数说明和只读标记。静态文档与自部署版本不一致时，以已部署服务的目录为准；稳定协议见 [API 参考](../api/reference)。
