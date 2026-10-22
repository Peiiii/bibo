# Bibo 开发约定

## 产品与源码归属

- 产品判断先读 [docs/VISION.md](docs/VISION.md)。Bibo 正在探索个人全局上下文与资产中心；既有助手保留。愿景不代表所有能力已经实现。
- `Peiiii/bibo` 是 Bibo 的唯一日常开发主仓，默认分支 `main`。应用、client、UI 与官网都在本仓维护；不再从 NextClaw 导出覆盖，也不要求把产品改动回流另一个仓库。
- NextClaw 的稳定执行与界面底层通过已发布公共包复用；禁止复制其内核、引用 sibling checkout 或用 alias 绕过 package 根入口。公共能力缺口回原 owner 修复发布，再升级精确依赖。
- 现有 `@nextclaw/bibo-*` 与 `@nextclaw/personal-agent-ui` 是历史包名，不代表源码仍归上游；不为品牌一致性批量改名。

## 协作与保护

- 用户可见消息使用中文，以 `[我严格遵守规则]` 开头，并带恰好一个真实 `[step: ...]` 内联阶段标记。
- 默认单代理；不因省时或省 Token 自行委派。首次编辑前检查 Git 状态，保护用户及其它任务的改动，精确提交本任务范围。
- 主线为 `main`，新分支前缀 `codex/`。本项目由用户交给 AI 全托管；授权范围内完成验证与 Review 后提交推送，无需重复询问。只有用户明确限制时停止对应外部步骤。
- 保持清楚的 owner 和单一读写路径。网页、内置助手及未来接入方复用同一套领域动作；前端状态与编排归 store/manager，组件连接展示。
- 凭据只从本机认证或 Secret 读取，禁止回显、提交、复制到代码、浏览器变量或日志。`.local`、`.dev.vars`、`.env` 与个人数据不提交。

## 开发、验证与交付

- 使用 `.nvmrc` 和 package.json 固定的工具链。开发入口为 `pnpm dev`，凭据无关预览；现有技术栈和架构说明见应用 README。
- TS、类型或导入导出改动运行 `pnpm typecheck`；运行链路改动执行相关测试、构建和 Worker dry-run。仓库迁移/公共依赖升级使用完整 `pnpm test`、两种构建和真实桌面/手机浏览器验证。
- 默认 `pnpm build` / `pnpm deploy` 服务自部署；官方托管使用显式 `build:hosted` / `deploy:hosted`，官网用 `build:site` / `deploy:site`。官方发布从冻结远程 `main` 的干净 checkout 执行，保留 `--containers-rollout=none`，除非本任务确实需要更新沙箱。
- 不因迁移或重构改变线上 Worker、DO 类、迁移标签、R2 bucket 或域名；生产数据变更须有明确任务依据和匹配验证。纯文档与项目维护归属变化不触发产品部署或 NPM 发布。
- 官网 `apps/bibo-*/dist` 是手写静态源码；应用 `apps/bibo-hosted/dist` 与官网 `.publish` 才是生成物。不要删除或忽略需要维护的静态源文件。
- 想法归 `docs/thoughts/YYYY-MM-DD-<topic>.thought.md`，稳定方案归 `docs/designs`，真实交付证据归 `docs/logs`；原话、用户确认、AI 建议和已实现事实分开。目录沿用现有 owner，不创建空流程套件。
