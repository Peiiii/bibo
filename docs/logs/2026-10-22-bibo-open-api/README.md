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

- 发布候选提交 `3a1670c91e7a6b750de09d27aef48aecc0077c7e` 已推送；NPM release run `39788828274`，CI run `39788609358`。NPM_TOKEN 通过 stdin 配置独立仓库环境，未入文件或日志。
- SSH 22 关闭，切换现有 NextClaw 已验证的 `ssh.github.com:443` 传输后 push 成功。随后官方部署 preflight 因旧地址正则拒绝端口格式，未触发上传。修正原 preflight 的身份 owner：以 URL 解析精确核对 GitHub host/owner/repo/协议，支持 SCP SSH、HTTPS、SSH 443，拒绝仿冒域名、错误仓库、凭据和查询参数；干净 checkout/远程 main 检查不变。手工 planned-path 核对两个小 utility/test 归现有 deployment owner，局部设计与反例 Review 通过。
- 部署前版本：`15aff649-3b6a-450c-99ac-4f8016c884df`（100%），本机 receipt `.local/bibo-deployments-before.json`，可作为 Worker 回退入口。没有更改 DO 类、迁移或 bucket。
- 官方应用与文档已从 `b4d82a0` 发布，Worker version `1174dbc4-6ce1-42ae-9a8b-703f3dc73fbb`，保留 containers-rollout=none；线上 `/docs/guide/quickstart` 匿名 200 且确认为 VitePress，不是应用 fallback。
- NPM run 39788828274 所有验证/打包通过，SDK publish 已返回 `+ @nextclaw/bibo-api@0.1.0`，并明确提示新包正在处理、可能需几分钟。失败点是紧接着的 registry integrity 查询 404，非认证失败；CLI 尚未执行发布。保留该不可变成功 checkpoint，不重复发布 SDK。
- 发布恢复局部设计/Review：新包接收与公开可见是不同阶段；原 publish owner 在成功返回后只轮询 registry，最长 5 分钟，404 可等待，hash 不同或认证/网络错误立即失败。新增 registry utility/test 归既有 release owner；accepted receipt 与 tarball 无论后续步骤是否失败都上传 artifact，避免丢失已接收状态。SDK 可见且 hash 核对后再继续原流程；不移动或覆盖已发版本。

## 交付汇总与复盘

- 正式 NPM：`@nextclaw/bibo-api@0.1.0`、`@nextclaw/bibo@0.1.0`；[release run 39790168184](https://github.com/Peiiii/bibo/actions/runs/39790168184) success，保留已有 SDK immutable checkpoint，新发 CLI 后完成 integrity 校验；[GitHub Release](https://github.com/Peiiii/bibo/releases/tag/bibo-v0.1.0) 于 21:55 发布，tag 目标 fbf8cae。
- 官方应用/文档：version `1174dbc4-6ce1-42ae-9a8b-703f3dc73fbb`，应用源 b4d82a0；后续 fbf8cae 只改变发布控制器/测试/记录，不改变部署的 API/UI。访问 [docs](https://app.bibo.bot/docs/) 和[接入与授权](https://app.bibo.bot/integrations)。
- CI：217 项测试、2 项真实 Worker、所有 TS、生产构建/dry-run、打包独立安装通过。另有本地 self-hosted 构建/dry-run、完整原工作区 browser、新授权 1440/390/320 与生产文档桌面手机证据。
- NPM 全新安装到临时 prefix 后，真实 bin `bibo --version` 为 0.1.0；21:58 生产黄金链路通过：网页创建令牌、CLI 私有登录、项目/任务/日程/收件箱/笔记/文件管理、网页读取、幂等/冲突、图片字节、只读拒绝、撤销及打包 Skill。日志 `.local/production-golden-retry.log`；没有使用源码 CLI 冒充正式包。
- 首次生产脚本在关闭动画完成前统计 DOM，误报令牌仍在；原烟测 owner 改为等待控件 detached，TS 和同一真实链路复验通过，产品没有为测试增加固定等待。脚本 finally 已清理失败轮次和成功轮次的全部测试授权。可删除对象已清理；专用测试账户保留一个已处理收件箱回执和 68 字节图片，因为公共 API 尚无对应删除动作。
- SDK Mac 与 Linux tarball 包内数据、tar 元信息完全一致，仅 gzip OS 标记不同一字节；跨平台本地比较不能替代 CI 同产物 integrity 校验。实际 registry SDK/CLI 均通过 Linux CI 精确 hash 校验。
- 范围限制已在公开文档说明：全空间级 read/write PAT；文本上限/大文件预览、图片格式与 10 MiB、60 请求/分钟、有限幂等窗口；不开放聊天模型执行、OAuth、Agent 通信或任意二进制上传。没有把长期愿景冒充本批实现。
- `retrospective_decision: updated-existing-owners`：NPM 接收与可见性区分落实到原 release utility/回归/accepted artifact；Git 传输与仓库身份分离落实到原 deployment preflight/反例测试；弹窗结束状态落实到原 smoke harness。维护者恢复入口追加 CONTRIBUTING；没有为单次事件新增全局提示词或改造共享框架。Qingtian 使用权威安装、check/readiness 通过，8 个开发阶段入口之外未人为复制规则；真实标记响应已在本会话应用，不宣称历史或未来宿主自动加载已验证。
- `parent_status=ready-for-completion-check`；原合同全部 Required 已验证，交回 lifecycle 完成最终主线/入口核对。用户主观偏好仍由用户判断，不代指用户已验收。
