# 给 AI 安装 Skill

`bibo-space` 告诉 Agent 如何发现、读取和管理空间，如何安全认证、处理分页/冲突/限流，以及写后核验。

## CLI 安装

```sh
npm install -g @nextclaw/bibo
bibo skill install --path ~/.codex/skills
```

这会创建 `~/.codex/skills/bibo-space/`，包含 `SKILL.md` 与 `agents/openai.yaml`。其他宿主改为其 Skill 发现目录。已有同名 Skill 时默认拒绝覆盖；审阅后可显式 `--force`。

```sh
bibo skill print
bibo skill path
```

安装 Skill 不会自动授予空间访问权限；还需要用户的 Bibo 授权。令牌不写入 Skill。

## 手动安装

下载 <a href="/docs/downloads/bibo-space/SKILL.md" download>SKILL.md</a> 和 <a href="/docs/downloads/bibo-space/agents/openai.yaml" download>openai.yaml</a>，按下列结构放到 Agent 支持的 Skill 目录：

```text
bibo-space/
  SKILL.md
  agents/openai.yaml
```

也可从[仓库源码](https://github.com/Peiiii/bibo/tree/main/skills/bibo-space)获取。CLI 包和文档下载都由这份源码构建，不维护平行正文。

## 使用示例

> 使用 bibo-space，读取我还没完成的任务和最近的笔记，先给出今天的工作建议。

> 把我们刚才确认的方案保存到 Bibo 的 agent-plan.md，然后读回来核验。

Agent 应使用实际结果回答；只读令牌遇到写入请求时应说明权限缺口。未经请求，不批量修改无关资料或向别人发消息。
