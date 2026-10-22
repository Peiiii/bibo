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

- 前端视觉与交互遵循现有 [personal-agent-ui 规范](packages/personal-agent-ui/README.md)，复用组件及反馈配方；界面修正同步核对真实点击范围与 hover/focus 状态。

- 使用 `.nvmrc` 和 package.json 固定的工具链。开发入口为 `pnpm dev`，凭据无关预览；现有技术栈和架构说明见应用 README。
- TS、类型或导入导出改动运行 `pnpm typecheck`；运行链路改动执行相关测试、构建和 Worker dry-run。仓库迁移/公共依赖升级使用完整 `pnpm test`、两种构建和真实桌面/手机浏览器验证。
- 默认 `pnpm build` / `pnpm deploy` 服务自部署；官方托管使用显式 `build:hosted` / `deploy:hosted`，官网用 `build:site` / `deploy:site`。官方发布从冻结远程 `main` 的干净 checkout 执行，保留 `--containers-rollout=none`，除非本任务确实需要更新沙箱。
- 不因迁移或重构改变线上 Worker、DO 类、迁移标签、R2 bucket 或域名；生产数据变更须有明确任务依据和匹配验证。纯文档与项目维护归属变化不触发产品部署或 NPM 发布。
- 官网 `apps/bibo-*/dist` 是手写静态源码；应用 `apps/bibo-hosted/dist` 与官网 `.publish` 才是生成物。不要删除或忽略需要维护的静态源文件。
- 想法归 `docs/thoughts/YYYY-MM-DD-<topic>.thought.md`，稳定方案归 `docs/designs`，真实交付证据归 `docs/logs`；原话、用户确认、AI 建议和已实现事实分开。目录沿用现有 owner，不创建空流程套件。

<!-- ai-development-system:start -->
## 共享 AI 开发体系

- 开始开发决策前先读取当前项目的目标、约束与权威事实；项目 `AGENTS.md` 承载项目规则和授权。
- 普通开发从 `.agents/skills/development-lifecycle/SKILL.md` 进入，由它选择流程与当前阶段，命名流程入口见 `.agents/workflows/README.md`（含大型交付）；明确只要调查、设计、验证或 Review 时只完成该范围。
- 每条实际发给用户的普通文字消息发送前核恰好一个真实阶段标记，同阶段进度和最终答复不省略。项目已定义格式优先；开发开启 tracing 时沿原插件，未开启或无专属格式时用内联代码 `[step: understanding/designing/working/reviewing/verifying/fixing/retrospective/finishing]` 中一个值兜底。简单回答可用 understanding，不启动多步流程。工具调用、对外产物及严格机器协议不插入，静默协议保持静默；不为标记额外通信，标记不替代验收或结束门。
- 用户要求打开、启动或查看擎天 / AI 开发体系大盘时，读取 `.agents/wiki/skills/tools/qingtian-dashboard/SKILL.md` 并执行到当前项目可用的入口；单纯讨论设计不启动。
- 修改项目 AI 规则、Skill 拓扑或开发体系时，按需读取 `.agents/wiki/skills/process/agent-instructions-governance/SKILL.md`；先找现有 owner，再做最小、可验证的改动。
- 只读取当前阶段和当前判断需要的 reference；不把整个 Skill 库、历史记录或项目知识一次性载入。
- 保护用户和其它任务的工作区改动。未经用户明确授权或当前项目已有可核对的明确授权，不提交、推送、建 PR、发布或部署。
- 先找事实、状态和行为的权威 owner；复用或修正已有路径，避免复制规则、平行状态与无收益的适配层。
- 修复异常先定义可观察判定条件，再沿真实触发或最近边界验证。修改 TypeScript 类型、导入、导出或运行链路时运行适用范围的类型检查。
- 源码验证后按项目检查入口完成 diff-only 可维护性检查和实现 Review；有 finding 时修正并重验受影响证据。
- 收尾核对最小完整结果、有效证据、用户可用入口和未验证边界；复盘只沉淀有可复用增量的事实或方法。
- 上游管理的 Skill 由 `ai-development-system` 仓库维护；项目专项规则留在本项目。升级通过同步工具审查差异，不直接覆盖受管文件。
<!-- ai-development-system:end -->

- Qingtian 插件 development-step-tracing：开启
