# Bibo 能做什么

把笔记、文件、待办和工作上下文保存在自己的空间，再让获授权的 AI 通过同一套 API 接着使用。网页、CLI、SDK 和内置助手读写的是同一份数据。

## 按你要做的事查找

| 功能 | 可以做什么 | CLI 入口 | API 动作或端点 |
| --- | --- | --- | --- |
| [笔记](./notes) | 保存 Markdown、读取正文、检索最近笔记、修改与移动 | `bibo note` | `file.*`，`kind=note` |
| [文件与目录](./files) | 建目录、保存文档与文本产物、浏览层级、移动和删除 | `bibo file` | `file.*` |
| [待办与任务](./tasks) | 创建待办、设置优先级/截止时间、维护子任务和完成状态 | `bibo task` | `task.*` |
| [项目](./projects) | 创建与改名项目，把任务归入项目 | `bibo project` | `project.*` |
| [日程](./events) | 安排起止时间、查找时间范围内的事项、修改日程 | `bibo event` | `event.*` |
| [收件箱](./inbox) | 送达提醒与待决事项、标记已读和已处理 | `bibo inbox` | `inbox.*` |
| [图片资产](./assets) | 上传图片、下载原始字节、在笔记中引用 | `bibo assets` | `/assets`、`/assets/:id` |
| [空间概览](./overview) | 一次读取当前任务、日程和待处理事项摘要 | `bibo overview` | `overview.get` |

## 选择接入方式

- **让 AI 直接使用**：[安装 Skill](../guide/skill)，给它一个独立授权。
- **在终端操作**：[五分钟接入](../guide/quickstart)后使用上表的对象命令。
- **集成到程序**：[JavaScript SDK](../guide/sdk)或直接调用 [HTTP API](../api/reference)。

各功能页包含可复制的 CLI、HTTP 示例及操作字段。所有对象动作通过 `POST https://app.bibo.bot/api/v1/space` 执行，提交 `{action,input}`；读取用只读权限，修改需要读写权限。列表通过 `items` / `nextCursor` 分页。

## 一个连贯的使用流程

1. 在[笔记](./notes)保存调研结论。
2. 建立[项目](./projects)，把后续行动拆成[任务](./tasks)。
3. 将评审时间写入[日程](./events)，需要用户决定的内容送到[收件箱](./inbox)。
4. 下次换一个 AI，从[空间概览](./overview)和相关对象继续工作。

当前发布的是这些空间对象的管理能力。任务不会因创建而自动执行，日程不会自动触发提醒；跨 Agent 消息、聊天执行和任意二进制文件上传尚未开放。具体限制见各功能页。
