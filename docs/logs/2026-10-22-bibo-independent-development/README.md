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

## 提交与主仓切换

Bibo 源码提交 `f2a377c48a3d9f8074172af6a1f081699ede1e2e` 已推送 `origin/main`；[GitHub Linux CI](https://github.com/Peiiii/bibo/actions/runs/39775174620) 完整安装、类型、205 项测试、真实 Worker 测试、两种构建/dry-run 与官网构建全部通过。官方发布 preflight 正向核对独立仓 origin/main 的冻结 SHA 成功；脏工作区负向拒绝通过。

完整产品 browser smoke 通过 1440/1280/390/320px 主流程，以及窄屏、目录、文件、布局恢复等附加场景。默认自部署只保留 `wrangler.toml`，官方托管单独使用 `wrangler.hosted.toml`，退出迁入时多带的一份自部署配置，避免两份配置漂移。

NextClaw 提交 `802b1fe0c` 已推送远程 `master`：撤掉 Bibo 可执行源码、私有 client/UI workspace 与导出模板，保留原路径迁移指针、缓存 ignore 和明确拒绝执行的 exporter。锁文件仅移除三个迁出 importer，其余 pinned resolutions 保持。NextClaw 原有七份 WIP 的 SHA-256 在迁移前后完全一致。

旧仓 `check:skill-progressive-loading`、`lint:new-code:governance`、治理 ratchet 与退休 exporter 的维护性检查通过。常驻 AGENTS 11984 → 11989 bytes，仍低于 12000；Skill 发现数、description、discovery 字符和拓扑未增加。Bibo 新建 3083-byte 根规则并迁入原应用规则，没有复制 NextClaw Skill 体系。命令与规则归属、脚本和锁文件一致，无需修改治理 baseline。

## 复盘与完成边界

retrospective_decision：updated-owner。原始想法与用户确认保持同一 thought owner；开发与贡献说明改为 Bibo 唯一主仓；旧入口显式退出。偶发验证问题修在原测试配置与 smoke，没有扩张成全局规则。没有独立值得新增的方法条目。

本次完成独立开发项目与想法沉淀。开放 API、CLI、Skill、Agent 通信及真正的 NextClaw 接入尚未实现，仍归后续讨论。没有把源码迁移或 CI 通过写成这些产品能力已经交付。

最终边界复核删除了旧 `bibo-edge-migration.controller.ts`：它仍尝试进入 NextClaw 的本地 `workers/nextclaw-provider-gateway-api` 目录读取账号，而其调用的 `/api/admin/edge/status` 与 `/migrate` 已无对应路由。该脚本不在当前 package 命令或文档入口中，不是可保留的跨仓能力；退休后本仓无本地 NextClaw checkout 依赖。官方账号仍通过既有远程认证 API 访问，属于保留的系统关联。

最终源码 `ba9bfea86bd5f9a1e5193a5bcb2addc8f3ff46f3` 已推 main，补跑本地全部类型检查通过；[最新 Linux CI](https://github.com/Peiiii/bibo/actions/runs/39776652120) 全部通过。2026-10-22 20:15（Asia/Shanghai）核验完成。NextClaw 主线协调返回 `LOCAL_MAINLINE_SYNCED`，最终审计仅剩原有七份未改动 WIP；本仓干净且 main 与 origin/main 一致。随后仅提交这份证据回写，不再改变源码或重复运行相同测试。
