# Bibo 开放空间第一版交付记录

关联：`bibo-open-api-v1` r1；[合同](../../work/2026-10-22-bibo-open-api/acceptance-contract.md)；[方案](../../designs/2026-10-22-bibo-open-api.design.md)；[唯一恢复入口](../../work/2026-10-22-bibo-open-api/current-state.md)。

## 原始输入与约束

2026-10-22 当前会话用户原话（语音转写）：

> 我的第一个想法就是暴露api，并提供cli。这样其他的agent就可以访问、管理我们的空间了。
>
> 直接做出一版……做好充分的验证……包括那个发布。这个 CI 发布你可以挂到……NextCloud 这个 namespace 下面。……token 的话，NextCloud 这个项目里边是有的，就是发布 NPM 的话这样会方便一些。……直接交付相关的文档网站……接入，就是使用文档，还有 Skill，就是像别的 AI 用这个 Skill 就可以使用咱们这个东西了。……全部写好完善的这个方案设计，就是按照咱们的流程来吧。……一次性搞定，直接交付成品。

「NextCloud」结合实际项目和注册包解析为 NextClaw / `@nextclaw`；已向用户说明。用户明确授权一体化实现、充分验证、CI/NPM 发布与文档网站交付，沿用已授权独立 Bibo 主仓。长期愿景原话在[想法文档](../../thoughts/2026-10-21-bibo-open-personal-context-hub.thought.md)，本次聚焦已有空间 API/CLI/Skill，不扩展为 Agent 消息平台。

AI 在授权内选择：PAT、公开 SDK、VitePress `/docs/`、现有账户 UI 授权入口、现有队列/领域 owner、安全 token 配置。命名和技术决定不是用户原话。代码基线 c71aa419；无用户产品 WIP。独立磁盘清理会话另行执行，不阻塞本交付。

## 过程记录

- 20:39 开始，调查 API/空间/授权/部署 owner；发现 Bibo 仅有根规则，用户要求的完整 AI 体系尚未安装。
- 安装权威 ai-development-system payload，check/readiness 通过。相关本机日志 `.local/qingtian-{install,readiness}.log`。
- 核实 NPM 身份 peiiii；两个目标包均 404，可首次发布；NextClaw 既有稳定 release run 39306362156 成功，环境 npm-production 有 NPM_TOKEN。未读取或记录机密。
- 完成设计和授权/幂等/隔离反例审查，r1 design-review: passed；当前尚未执行产品实现。
- 实现前发现 workspace 文件 facade 绕过领域收据；修订并复审原设计，将文件执行委托放回原领域队列/收据边界，不创建第二套存储。
- 21:15：API/令牌/SDK/CLI/网页入口/Skill 已实现；真实 Worker/SQLite DO/R2 集成通过，私有 token hash/过期/撤销/限流/跨租户测试通过。CLI 打包后独立安装、帮助/版本/Skill/SDK import 通过；类型检查通过。原幂等测试期待跨 actor 共享结果，已按新隔离合同更新，需统一回归。
- 文档依赖下载出现 ECONNRESET 并长时间停顿；核实官方 registry 可达，终止本任务卡住的 pnpm 安装进程，降低并发与 timeout 重试。没有改用未知镜像或引入 sibling runtime 依赖。
- 实现审查关闭三项边界：文件收据总量限制为 2 MiB，reset 全程加入授权/空间队列避免 key 恢复，CLI 的非法 `--raw` 在变更前报错。均有定向回归；保留 R2/DO 非事务故障边界的明确说明。
- 本地验证：完整 `pnpm test` 通过后，针对后续 reset/收据/文档路由补充回归通过；真实 Worker 2 项通过；SDK/CLI 独立 tarball 安装与 Skill 安装通过；全部 TS 及新增线上验收脚本 TS 通过；两种构建及两种 Worker dry-run 通过。
- 浏览器：原 `bibo-product.smoke.ts` 完整工作区回归 exit 0；新授权页在 1440/390/320 的创建、失败重试、一次性 token 关闭、撤销、无横向溢出通过；公开文档、OpenAPI、Skill 下载通过。已实际查看桌面授权和手机文档截图，路径 `.local/integrations-browser/`。手机文档使用独立 viewport，避免响应式动画过渡截图失真。
- 文档下载链接使用明确 raw 文件锚点，避免 VitePress 将 SKILL.md 解释为页面；本地 Vite preview 的静态 `.html` 路径和生产 clean URL 区分，后者必须上线验证。
- Skill creator validator 通过。系统 Python 缺 PyYAML，改用隔离 `uv run --with pyyaml`，未增加产品依赖。
- 实现 Review：当前工作区相对 c71aa419 的源码、公共合同、授权生命周期、类型归属、CLI、UI、Skill、文档和发布链路均已复核。项目没有既有 diff-only maintainability/lint 脚本，按已安装 Review 合同执行 diff 检查与完整主观审查，不为一次交付发明检查器。`git diff --check` 通过；无未关闭 finding。适用范围为本地发布候选，尚不包含 NPM/生产完成结论。

### 发布意图与核验入口

授权发布 `@nextclaw/bibo-api@0.1.0`、`@nextclaw/bibo@0.1.0`；独立仓库 `npm-production` 环境 Secret；GitHub workflow `Release Bibo NPM`；tag `bibo-v0.1.0`。CI 从 main 验证并先发 SDK 再发 CLI，registry integrity 校验防止重复覆盖。

应用与文档目标 `https://app.bibo.bot` / `/docs/`，从冻结远程 main 的干净 checkout 发布，保留 `--containers-rollout=none` 和既有所有资源。上线后执行新 `integrations-live.smoke.ts`：真实网页创建 token→全新 registry CLI 登录→空间对象读改与网页一致→权限/冲突/幂等→撤销，并清理精确测试对象。凭据不落日志。

## 交付汇总与复盘

进行中，尚未交付。
