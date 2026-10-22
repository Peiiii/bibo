# Bibo 独立开发主仓

## 原始输入与约束

用户先提出把 Bibo 发展为开放、包容的个人全局上下文中心，保留内置助手作为管理员。原始文字与整理稿迁入本仓 thought。随后讨论独立项目，AI 推荐沿用 `Peiiii/bibo`、让其成为源码主仓，与 NextClaw 通过公共能力关联。用户明确确认：“可以。你来落地并沉淀想法文档”。

本次实现独立开发项目和文档，不把前一轮头脑风暴当成已确认的 API/CLI/Agent 通信需求。迁移保护 NextClaw 的七份无关 WIP；不复制凭据，不改变生产 Worker、bucket、DO 身份或现有数据。

## 设计与恢复

- [设计](../../designs/2026-10-22-bibo-independent-development.design.md)
- [当前状态与验收](../../work/2026-10-22-bibo-independent-development/current-state.md)

## 验证与交付

本机 Node 22.23.2 / pnpm 9.15.1：frozen install；client/UI 与应用三份 TypeScript 检查；19 client + 5 Markdown UI + 174 app + 7 auth 测试通过。真实 Miniflare SQLite Durable Object 集成 1 项通过，覆盖分页、精确 source、隔离、失败提交与恢复。

自部署构建及 Worker dry-run、官方托管构建及 Worker dry-run 均成功；官网根页和六个候选构建成功。官方配置逐字保留原资源身份。此次没有执行生产部署、数据迁移、NPM 或 NextClaw 发布。

`pnpm dev` 从本仓运行，1440/390px 实际浏览器完成预览对话、笔记自动保存、刷新读回，pageErrors 均为空。该预览使用本地示例响应，不宣称真实模型验收；运行持久化另有 Worker 集成证据。

迁入的 274 份冻结文件逐项比对，差异只在包依赖/脚本、入口文档、部署 preflight、日志配置、自部署帮助与测试适配。未复制内核或任何 WIP、凭据。

验证恢复：公开 UI 包的 development export 指向未发布源码，Node 测试回退外部导入后无法处理 CSS；测试配置解析安装包的公开根入口，并按 Vitest 的依赖处理方式转换该包，不引用内部源码。原菜单 smoke 在 Radix 延迟安装 outside-pointer 监听前点击；按已存在的双 animation-frame 等待方式消除时序竞争，未改变产品 UI。维护性检查无 error，已有设计 smoke 接近文件行数预算的 warning 不触发无关拆分。

云端 CI 与旧仓退出证据待同步。
