# 五分钟接入

## 1. 准备 Bibo 账号

打开 [Bibo](https://app.bibo.bot) 注册或登录。原有用户继续使用原邮箱和密码，空间内容与已有授权保留；迁移后 Bibo 与 NextClaw 的密码分别管理。

## 2. 安装并登录

需要 Node.js 22+：

```sh
npm install -g @nextclaw/bibo
bibo --version
bibo auth login
```

CLI 自动打开预填设备码的浏览器授权页。已登录时，核对设备码与权限并点击「授权」即可；终端会自动轮询，完成后保存私有凭据，无需复制 Token。

VPS、SSH 或无浏览器环境使用：

```sh
bibo auth login --no-browser
```

在手机或电脑打开终端显示的链接，也可打开 [授权页](https://app.bibo.bot/authorize) 输入短码。确认后远程终端自动完成登录。设备请求 10 分钟过期；`--read-only` 只申请读取权限，网页也可降权。按 Ctrl+C 取消。

人工创建 PAT 仍可在[设置 → 接入与授权](https://app.bibo.bot/settings/integrations)使用；每个工具使用具名、可撤销、有限期的授权。不要把令牌放进聊天、代码、截图或 URL。

自动化从安全的标准输入提供令牌：

```sh
cat /protected/bibo-token | bibo auth login --token-stdin
```

也可通过进程环境 `BIBO_API_TOKEN` 提供，不写本地配置；自部署设置 `BIBO_ENDPOINT`。不要在 shell 历史中直接写入令牌字面量。

## 3. 发现和读取

```sh
bibo auth status
bibo actions
bibo overview
bibo task list --open --limit 20
bibo note list --query '计划'
```

默认 JSON 输出：`result` 是对象或 `{items,nextCursor}`；用 `--cursor` 继续分页。`bibo actions` 返回当前服务端的完整动作和参数，优先于静态示例。

## 4. 保存并核验

下列命令需要读写权限；路径是空间根下的相对路径，上级文件夹必须已存在。

```sh
bibo note create --path agent-hello.md --content '# 来自外部 AI 的笔记' --request-id hello-2026-10-22
bibo note get agent-hello.md --raw
bibo task create --title '阅读这份笔记' --request-id read-hello-2026-10-22
```

打开网页的笔记和任务页，可以看到同一结果。使用返回的任务 ID 继续操作：

```sh
bibo task get TASK_ID
bibo task update TASK_ID --status done
bibo task get TASK_ID
```

CLI 更新前读取版本，再提交版本检查。对读到的具体版本做修改时，明确传 `--version 1`。冲突时重新读取并合并，不能盲目覆盖。写入后再读一次核验。

## 5. 给 AI 安装 Skill

```sh
bibo skill install --path ~/.codex/skills
```

其他 Agent 将 `--path` 指向其支持的 Skill 目录。安装后让 Agent 使用 `bibo-space`；部分宿主需要重新加载。详见 [Skill](./skill)。

## 6. 撤销

网页撤销对应授权，或运行 `bibo auth logout` 自撤销。后续 API 请求会失败，已有空间内容保留。离线只清理本地可显式使用 `bibo auth logout --local-only`，服务端令牌仍需另行撤销。
