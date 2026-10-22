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
      text: 浏览全部功能
      link: /features/
features:
  - title: 笔记
    details: 保存 Markdown、搜索最近笔记，让不同 AI 继续编辑同一份结论。
    link: /features/notes
    linkText: 笔记用法与 API
  - title: 文件与目录
    details: 建目录、保存文档和文本产物，按路径浏览、移动与删除。
    link: /features/files
    linkText: 文件用法与 API
  - title: 待办与任务
    details: 设置优先级、截止时间、子任务与完成状态，筛选当下要做的事。
    link: /features/tasks
    linkText: 任务用法与 API
  - title: 项目
    details: 按项目组织任务，在一个工作目标下持续积累进展。
    link: /features/projects
    linkText: 项目用法与 API
  - title: 日程
    details: 保存起止时间，查询指定时间段的安排，帮助 AI 了解你的计划。
    link: /features/events
    linkText: 日程用法与 API
  - title: 收件箱
    details: 送达提醒与待决事项，标记已读、已处理，让用户接着行动。
    link: /features/inbox
    linkText: 收件箱用法与 API
  - title: 图片资产
    details: 上传与下载图片，在空间中的笔记、文档里引用。
    link: /features/assets
    linkText: 图片用法与 API
  - title: 空间概览
    details: 读取当前待办、日程、近期笔记和待处理事项，开始下一轮工作。
    link: /features/overview
    linkText: 概览用法与 API
---

## 从一条命令开始

```sh
npm install -g @nextclaw/bibo
bibo auth login
bibo overview
```

Node.js 22+。在[接入与授权](https://app.bibo.bot/integrations)创建令牌，按 CLI 提示安全输入。首次接入请阅读[快速开始](./guide/quickstart)。

第一版开放空间对象与图片资产；聊天执行、跨 Agent 消息和任务调度尚未作为公共 API 发布。开放接入始终需要用户授权，个人数据不会因此公开。
