# 公共 API v1

Base URL：`https://app.bibo.bot/api/v1`。自部署替换 origin，路径相同。[OpenAPI JSON](/openapi.json) 可供工具读取。

每个请求携带 `Authorization: Bearer <BIBO_ACCESS_TOKEN>`，使用接入页创建的个人访问令牌。不要使用网页 session cookie、平台 API key 或把令牌放在 URL。无 CORS，面向服务端/CLI。

## 端点

| 方法 | 路径 | 结果 |
| --- | --- | --- |
| GET | /me | `{userId,integration}`（授权名称、scope、有效期） |
| GET | /actions | 动作目录，含 action/domain/description/input/readOnly |
| POST | /space | 执行 `{action,input}` |
| POST | /assets | 上传原始图片字节，返回 `{id,url,webUrl}` |
| GET | /assets/:id | 下载当前账户图片，返回二进制 |
| POST | /auth/revoke | 撤销当前令牌，返回 `{revoked}` |

## 空间动作

### 按功能查 API

| 你要操作的内容 | 动作前缀 | 功能说明、字段与示例 |
| --- | --- | --- |
| 笔记 | `file.*` + `kind=note` | [笔记](../features/notes) |
| 文件与目录 | `file.*` | [文件](../features/files) |
| 待办与子任务 | `task.*` | [任务](../features/tasks) |
| 项目与任务归属 | `project.*` | [项目](../features/projects) |
| 起止时间与日程 | `event.*` | [日程](../features/events) |
| 提醒、待决与已读状态 | `inbox.*` | [收件箱](../features/inbox) |
| 当前工作上下文 | `overview.get` | [概览](../features/overview) |
| 图片字节 | `/assets` 端点 | [图片资产](../features/assets) |

### 请求与响应

```json
{
  "action": "task.create",
  "input": {"title": "写一份方案", "requestId": "draft-plan-2026-10-22"}
}
```

JSON 成功响应为 `{ "result": <领域结果>, "requestId": "追踪ID" }`。创建空间对象返回 200；图片上传返回 201。列表结果包含 items 和 nextCursor。完整字段由[动作目录](./actions)提供。

错误响应：

```json
{"error":{"code":"CONFLICT","message":"内容已有更新，请重新加载后再保存。"},"requestId":"追踪ID"}
```

HTTP `X-Request-Id` 与响应 requestId 一致。这里的追踪 ID 每次请求不同，**不是**写入幂等键；幂等键是调用方的 `input.requestId`。

## 错误

| HTTP | code | 处理 |
| --- | --- | --- |
| 400 | INVALID_REQUEST | 修正 JSON、动作或字段 |
| 401 | UNAUTHORIZED | 重新授权，令牌可能过期或撤销 |
| 403 | FORBIDDEN | 需要空间写权限 |
| 404 | NOT_FOUND | 对象/图片不存在或属于其他账户 |
| 409 | CONFLICT | 读取新版本并合并，或更换误用的幂等键 |
| 413 | PAYLOAD_TOO_LARGE | 缩小请求 |
| 415 | UNSUPPORTED_MEDIA_TYPE | 图片类型不支持 |
| 429 | RATE_LIMITED | 遵循 Retry-After |
| 503 | UNAVAILABLE | 未确认成功；读取状态后决定重试 |

## 图片

上传 body 为图片原始字节，类型根据签名识别，支持 PNG/JPEG/GIF/WebP/AVIF、最大 10 MiB。`url` 是带 Bearer 下载的 API 相对路径；`webUrl` 是 Bibo 网页内部使用 cookie 读取的资产路径，可用于笔记 Markdown 图片引用。不同账户无法读取对应字节。图片端点目前无删除和任意二进制上传。

## 版本与幂等

所有修改必须提供领域当前 version；创建可提供 requestId。scope、body 上限、分页、重试收据与故障边界见[授权与安全](../guide/auth)。API 与网页共享同一业务 owner；API 不运行模型或沙箱。
