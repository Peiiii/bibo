---
layout: home
hero:
  name: Bibo 开放空间
  text: 让 AI 共享你的上下文
  tagline: 笔记、文件、项目、任务与日程持续积累。通过 API、CLI 和 Skill，让你信任的工具接着使用。
  actions:
    - theme: brand
      text: 五分钟接入
      link: /guide/quickstart
    - theme: alt
      text: 给 AI 安装 Skill
      link: /guide/skill
    - theme: alt
      text: 查看 API
      link: /api/reference
features:
  - title: 同一份个人资产
    details: 外部 Agent、网页和内置助手使用同一套空间操作，结果可相互读取、继续编辑。
  - title: 由你决定访问权限
    details: 为每个工具创建独立令牌，选择只读或读写、设置有效期，随时撤销。
  - title: 开放、直接、可发现
    details: CLI 面向人和 Agent，SDK 面向集成；在线能力目录提供当前版本的动作与参数。
---

## 从一条命令开始

```sh
npm install -g @nextclaw/bibo
bibo auth login
bibo overview
```

Node.js 22+。在[接入与授权](https://app.bibo.bot/integrations)创建令牌，按 CLI 提示安全输入。首次接入请阅读[快速开始](./guide/quickstart)。

第一版开放空间对象与图片资产；聊天执行、跨 Agent 消息和任务调度尚未作为公共 API 发布。开放接入始终需要用户授权，个人数据不会因此公开。
