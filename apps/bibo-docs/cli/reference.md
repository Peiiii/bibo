# CLI 命令

```sh
npm install -g @nextclaw/bibo
bibo --help
```

## 身份、能力与概览

```sh
bibo auth login                     # 隐藏输入令牌
bibo auth login --token-stdin        # 自动化从安全 stdin 读取
bibo auth status
bibo auth logout                    # 服务端撤销 + 删除本地配置
bibo auth logout --local-only       # 仅离线清理本地
bibo actions
bibo overview
```

所有 API 命令支持 `--endpoint https://your-bibo.example`；也可设 `BIBO_ENDPOINT` 和 `BIBO_API_TOKEN`。CLI 只管理空间，不启动本地 Bibo 服务。

## 对象命令

| 对象 | 操作 |
| --- | --- |
| [note · 笔记](../features/notes) | list、get、create、update、move、delete |
| [file · 文件与目录](../features/files) | list、get、create、update、move、delete |
| [task · 待办与任务](../features/tasks) | list、get、create、update、delete |
| [project · 项目](../features/projects) | list、get、create、update、delete |
| [event · 日程](../features/events) | list、get、create、update、delete |
| [inbox · 收件箱](../features/inbox) | list、get、create、read、resolve |

`note` 复用 file 动作，list/create 自动指定 kind=note；file create 默认 document，创建目录使用 `--kind folder`。对象 ID 放在操作后，文件的 get 接受路径；写操作可以将路径作为文件 ID。

```sh
bibo project create --name '开放空间'
bibo task create --title '写接入说明' --project-id PROJECT_ID --priority high
bibo event create --title '方案评审' --start-at 2026-10-23T02:00:00Z --end-at 2026-10-23T03:00:00Z
bibo inbox create --title '需要确认' --body '请核对方案' --kind decision
bibo inbox read ITEM_ID
bibo inbox resolve ITEM_ID
bibo file create --path research --kind folder
bibo note create --path research/plan.md --content-file ./plan.md
bibo file update research/plan.md --content-file ./new-plan.md
bibo file move research/plan.md --path research/final.md
bibo file get research/final.md --raw
```

删除会影响真实云端数据：`bibo task delete TASK_ID`，`bibo file delete research/final.md`。删除目录包含后代；删除项目解除任务归属。命令本身即执行，不另加确认。

更新/删除等操作缺少 version 时先读取当前版本；需要保护先前读到的快照时传 `--version`。文件版本是字符串，其他对象是数字。JSON 输入可以完整保留类型。

## 筛选与复杂输入

常用字段使用 kebab-case，如 `--project-id`、`--parent-path`、`--due-before`。时间使用带时区的 ISO8601。

```sh
bibo task list --open --due-before 2026-11-01T00:00:00Z --limit 100
bibo file list --parent-path research
bibo file list --query plan
bibo note list --sort recent
bibo task create --input '{"title":"发布","subtasks":[{"title":"验证","done":false}]}'
bibo call task.update --input @./update.json
```

`--input` 接受 JSON 对象或 `@文件`；单独 flags 覆盖其中同名字段。`--content-file` 读取 UTF-8 内容。JSON 的 null 可清除可空字段。list 的 `nextCursor` 传给下次 `--cursor`。

## 图片与 Skill

```sh
bibo assets upload ./diagram.png
bibo assets download ASSET_ID --out ./download.png
bibo skill install --path ~/.codex/skills
bibo skill print
bibo skill path
```

下载默认不覆盖已有文件，明确 `--force` 才覆盖。图片 10 MiB、支持五种格式；使用返回的 `webUrl` 在 Bibo 笔记中引用。

## 输出、重试与退出码

stdout 是 JSON：普通调用 `{result,...}`，写入还包括 `requestId`。`--raw` 仅用于 file/note get 的完整或预览文本。stderr 提供结构化错误和登录提示，不输出令牌。

| 退出码 | 含义 |
| --- | --- |
| 0 | 成功 |
| 1 | 其他远端/网络错误 |
| 2 | 本地配置/参数错误 |
| 3 | 认证或权限错误 |
| 4 | 版本/幂等冲突 |
| 5 | 限流/忙 |

对于主动重试，提前指定 `--request-id`，并保留相同 version 和参数。参见[故障与幂等](../guide/auth#重试与幂等)。
