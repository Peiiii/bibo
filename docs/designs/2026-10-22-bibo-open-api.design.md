# Bibo 开放空间第一版方案

> 当前补充：2026-10-23「接入管理体验重构」在本文末尾，状态为方案待实施。下文r1/r2保留历史决策；CLI现已采用设备授权，文档已独立部署，不应再按r1旧流程实现。

- 状态：已实现、发布并通过生产验收；冻结设计 r1 于 2026-10-22 Design Ready；design-document: required；plan: required。
- 来源：[原始输入](../logs/2026-10-22-bibo-open-api/README.md#原始输入与约束)。有效合同：`bibo-open-api-v1` r1，[验收账本](../work/2026-10-22-bibo-open-api/acceptance-contract.md)。
- 恢复：[当前状态](../work/2026-10-22-bibo-open-api/current-state.md)；[执行计划](../plans/2026-10-22-bibo-open-api.plan.md)。风险 L4：对外授权、租户数据、公共包和生产部署。

## 用户结果与黄金验收

1. 空间主人登录 Bibo → 账户菜单进入「接入与授权」→ 创建具名、有限期的只读或读写令牌 → 页面仅当次显示明文并提示保存 → 安装 `@nextclaw/bibo` → `bibo auth login` 通过隐藏输入或 stdin 接入 → 查看身份及能力目录 → 创建笔记/任务 → 网页可见同一结果 → CLI 获取并修改版本 → 再读确认 → 撤销授权后同一 CLI 请求立即失败。
2. 独立 AI 安装交付的 Skill → 阅读接入文档、发现动作 → 在用户授权范围内查询项目、任务、日程、收件箱、笔记和文件 → 上传图片并读取 → 执行带 requestId 的写入 → 重试不重复创建 → 错误版本和同 ID 不同参数得到冲突 → 第二客户端读取相同资产。AI 不需要内置助手或模型调用。
3. 未登录的新浏览器访问公开 `/docs/` → 获得安装、授权、API、CLI、SDK、Skill 和自部署说明 → 从真实 NPM 安装发布版本，照文档完成链路；发布 CI 与线上版本可核验。原聊天、编辑、空间及移动端回归通过。

AI 承担安装、发布、故障排查和全部客观验证。用户只判断产品方向和视觉偏好；这些不阻止已授权交付。构建/浏览器/真实云端链路有分钟级等待，不伪造结果。

## 现状与最小主链路

已有浏览器 client → `/api/space` → 每账户 `BiboUserContainer.spaceQueue` → `BiboSpaceActionService` → `BiboSpaceService` / workspace 文件 owner → SQLite/R2。已有 26 个动作、版本检查和独立图片资产 owner。保留它们，不复制空间存储或另建 Agent 数据库。

新主链路：外部客户端 → `/api/v1/*` → 严格解析 Bearer 令牌路由 → 原账户 DO 中验证 hash、过期、scope、限流 → 同一串行队列执行原动作 → 统一响应。网页仍走原 cookie 与 Origin 保护。API 仅使用用户显式授予的空间权限，不能调用模型、重置空间或管理其他令牌。

## 技术与选择

沿用 Cloudflare Workers/SQLite DO/R2、React/Vite/Zustand、pnpm/TypeScript。文档选 VitePress 1.6.4 静态构建，基础路径 `/docs/`，复制到应用静态产物后随原 Worker 发布；无新域名、服务或登录依赖。[嵌套路径部署合同](https://vitepress.dev/guide/deploy)要求固定 base 和静态路由核验。手写文档站会重新实现导航/搜索/代码展示；独立托管增加发布和域名 owner，因此不选。

CLI 使用 Node 22 内置 `util.parseArgs`、fetch、crypto、fs，不引入 CLI 框架；SDK 仅依赖标准 fetch，支持现代 Node/Worker。构建用 tsc ESM 和明确 `.js` 导入。NPM 使用现有有效发布身份和 `npm-production` 环境 Secret，公开 `@nextclaw` scope；第一版不迁移已有认证到 OIDC。

授权选择可撤销 PAT。复用网页登录但不暴露平台会话；OAuth/device flow 引入尚无消费者的授权服务器，暂不实现。令牌只在创建响应出现一次，DO 仅存 SHA-256，严格授权优先于绕过 DO 的文件快读。

## 授权与安全合同

- 令牌格式 `bibo_v1_<base64url(userId)>.<uuid>.<32字节随机数base64url>`，路由字段不构成身份凭证；验证须匹配 DO 内的 token hash、id、未撤销及 expiresAt。严格长度和字符约束，异常统一 401。
- 每账户最多 20 个有效令牌；名称 1–80 字符；默认 30 天，可选 1–365 天；scope 固定 `space:read` 和可选 `space:write`。只读只允许显式只读动作目录和资产读取，不根据未知动作的字符串后缀猜权限。
- 网页 `/api/integrations` 使用原 cookie、Origin 与当前身份认证；支持列表、创建和撤销。列表没有 hash/明文。令牌不能创建其他令牌。CLI 可自撤销；撤销排队完成后后续请求无效。一次性 token 不进入 URL、日志、持久 UI store 或 localStorage。
- 每 key 每分钟最多 60 次 API 请求；有 Retry-After。鉴权、限流、动作执行与撤销在同一账户队列中，避免验证后执行竞态。lastUsedAt 至多每分钟写一次。保留 100 条幂等收据，限制 key 元数据增长。
- API 不接受 cookie 替代 Bearer。浏览器 cookie 路径保留 CSRF 防护；第一版不开放跨域浏览器 CORS，只支持服务端/CLI/Agent。只返回通用内部错误，不泄露异常或密钥。
- SDK 禁止带凭据的重定向，HTTPS（仅 localhost/loopback 可 HTTP），endpoint 不含 userinfo/query/hash。CLI 配置目录 0700、文件 0600，原子写入并绑定 endpoint；支持环境变量避免落盘，令牌不作为命令行参数。

## 公共协议与唯一 owner

`@nextclaw/bibo-api` 0.1.0 是公共 SDK 和空间类型 owner；现有私有 bibo-client 从其根入口复用/转导出类型。`@nextclaw/bibo` 0.1.0 提供 `bibo` 命令。禁止导入内部 subpath、复制 action 状态或类型。

- `GET /api/v1/me`：当前账户 ID、integration 元数据和 scope，不返回平台身份令牌。
- `GET /api/v1/actions`：同一领域 owner 的动作目录及只读属性；补齐 `project.get`，其余保留现有语义。
- `POST /api/v1/space`：`{action,input}`；成功 `{result,requestId}`，错误 `{error:{code,message},requestId}`；requestId 是追踪 ID，输入 `input.requestId` 是调用方幂等键，两者文档区分。400/401/403/404/409/413/429/503 有稳定 code。
- `/api/v1/assets` POST 上传原始图片字节，GET `/api/v1/assets/:id` 下载；复用现有 PNG/JPEG/GIF/WebP/AVIF、10 MiB、租户前缀校验，不宣称任意二进制文件已支持。URL 返回当前授权 API 路径，笔记引用可使用网页资产路径。
- `POST /api/v1/auth/revoke`：只撤销当前 key。
- JSON 请求边界 1.1 MB，有界读取；未知动作 400；输入必须是对象。读写冲突沿原 owner 的版本规则。

幂等修正在原空间 owner：收据 key 绑定 actor（integration/session/user）、action 和调用方 requestId；记录输入指纹，重复同参数返回原结果，不同参数 409。旧 replay 原始条目保留但不作为新 key 命中，容量同样有界。调用方未提供幂等键时不承诺网络失败重试安全，SDK 不自动重试写入。新增 actor.integrationId 用于可信来源标识。

实现前补充核对：云端文件当前在 workspace facade 直接执行、绕过领域收据。文件执行委托改为在原 BiboSpaceService 队列与收据边界内调用 workspace owner；不复制文件逻辑或创建第二份收据。普通领域动作仍走原分支，overview 继续补真实 workspace 笔记。该修订已对文件/版本/重试/旧数据反例复审通过。R2 与 DO 不是跨服务事务；如果内容已写入但收据持久化失败，重试可能得到版本或路径冲突，客户端须先读确认，不能宣称任意故障下 exactly-once。

21:16 容量复审：文件结果含文本，仅按 100 条收据可累积约 100 MiB，影响 Worker 内存。收据保留改为最近至多 100 条且总 JSON 编码不超过 2 MiB，超限从最旧淘汰；大结果会缩短去重窗口。它不是永久去重合同。该更改只收紧内部缓存，不删除用户资产；方案反例 Review 通过，验证容量边界并同步 Skill/文档。

清空空间会调用原 DO storage.deleteAll，因此也撤销全部授权。reset 的整个过程纳入同一 spaceQueue，防止异步清理过程中鉴权/自撤销把已删除 key 写回。排队在 reset 后的旧 key 一律 401；专门验证 reset 阻塞期间并发 revoke 等待，并确认没有 key 被恢复。此生命周期补充已复审通过。

## CLI 与网页入口

CLI 覆盖 auth login/status/logout、actions、overview、project/task/event/inbox/file/note 对象命令、assets upload/download、call 与 skill install/path/print。常用操作具有对象级入口；复杂字段支持 JSON 输入。更新/删除先读版本，用户可显式提供版本；文件可由 path 解析 id。输出默认为 JSON，内容读取可 raw；错误 stderr 和非零退出，不将失败包装成成功。

网页账户菜单新增接入入口；复用现有 UI 和 responsive 布局。manager/store 负责列表/创建/撤销/错误/忙状态，组件负责展示。一次性令牌用组件临时状态管理并支持复制/关闭；创建/撤销完成刷新列表；错误可重试；手机不横向溢出。

Skill 唯一源码 `skills/bibo-space/`，遵循标准 SKILL.md 与 agents/openai.yaml；构建复制到 CLI 包并在文档提供下载。写入前确认用户意图、读版本、写后读取验证；只用实际返回结果，不自动外发消息。安装拒绝静默覆盖已有目录。

## 目录与依赖预检

新增公共包 `packages/bibo-api`（fetch/types）与 `packages/bibo-cli`（Node/bin）；授权/API 路由和服务归 `apps/bibo-hosted/src/app/{routes,services,utils}`；授权 UI 归 `features/integrations`；文档源码 `apps/bibo-docs`；可分发 Skill 归根 `skills/bibo-space`；发布入口归 `scripts/release` 和 `.github/workflows`。每个目录具有明确消费者，不新增泛化 service/adapter 层。已检查工作区：仅本任务 framework 安装改动，无产品 WIP；没有现成 planned-path 脚本，按以上角色手工 preflight。

## 发布、恢复与验证矩阵

实现分批但统一交付。CI 完成类型/单元/真实 Worker/包烟测/文档构建；发布 workflow 从冻结 main 构建测试后，先发 API 再发 CLI，pnpm pack 转换 workspace 依赖，验证 tarball 文件、版本和声明。发布相同版本仅在完整性相同时跳过，不覆盖不可变版本。NPM Secret 只通过 stdin 注入 GitHub，不入仓库。

官方应用/文档部署从远程 main 干净 checkout 执行，保留 Worker/DO/R2 标识与 containers-rollout=none。发布后验证 NPM registry、新目录安装、CLI/API 真实创建读改删、撤销、文档及原应用。线上 smoke 使用已有测试账户和独立命名前缀，清理只限本次资产。

矩阵覆盖：无/坏/过期/撤销 token、只读写入、跨租户对象与资产、并发撤销、坏 JSON/超限、限流、幂等同异参数、版本冲突、持久化重启、CLI 安全配置与 endpoint、断网退出、安装 Skill、桌面/手机 UI、两种构建、Worker dry-run、发布包和线上 docs。

暂不实现第三方 OAuth、任意 Agent 消息总线、调度平台、公开用户数据、全量导入导出或独立运行时。这些属于长期愿景；不影响本次外部 Agent 管理已有空间的完整链路。

## 抽象与方案审查

保留现有空间/资产 owner 和账户 DO 队列；新增 key 存储是授权状态，SDK 是网络合同，CLI 是用户入口，各有实际消费者。删除类型重复、避免多套 replay 和存储。没有提前建设插件总线或多层转发。方案 Review 以用户原始要求、三条黄金链路、旧能力双向对账审查：公开入口、使用文档、Skill、NPM CI 和生产验证均包含；机密不进入记录。结论：design-review: passed（本方案 r1，单代理独立审查，无未关闭 finding）。


## r2：独立文档站与功能目录（2026-10-22 22:12）

来源：用户指出文档不应部署到 App，要求专用 docs 子域；随后要求像 Vue/Vite 一样按功能明确展开笔记、文件、待办等。现有正式主域是 bibo.bot，采用 docs.bibo.bot。原 API/AUTH/对象模型继续复用，不改变业务协议。

- 冻结方案：沿用 VitePress；独立静态 Worker bibo-docs/custom_domain=docs.bibo.bot，base=/；无业务绑定、无账户数据。构建仅产出 apps/bibo-docs/.vitepress/dist，App 构建不再打包文档。旧 App /docs 与所有后代 308 到新域同路径，保留 query。
- 信息架构：首页呈现八类功能；侧栏分「开始接入」「空间功能」「工具与参考」。八类为笔记、文件与目录、待办与任务、项目、日程、收件箱、图片资产、空间概览。每类独立可搜索页面，包含用途、支持操作、CLI、HTTP 示例、输入字段、返回语义与限制。note 是 file kind 别名，不能虚构 note API。
- 单一事实 owner：领域动作及字段仍由 BiboSpaceService.listActions() 生成总表与各领域表。手写文档拥有任务说明/正确示例/边界，不复制另一份动作注册树。图片为 /assets 端点，任务是空间任务 CRUD，不声称执行调度或 Agent 通信。
- 用户链路：匿名进入新域首页→直接看见功能→点击笔记/任务→CLI 或 HTTP 保存→读取并在 App 核验；侧栏可切换功能；搜索 task.create 或文件能找到对应内容；手机菜单可展开所有功能。
- 候选：只扩展原动作表仍缺任务学习路径；把指南移到 App 下不满足域名隔离；新建文档框架无收益。选择独立部署现有 VitePress，并补功能指南。
- 链接迁移：App/README/CLI help/Skill/NPM homepage 都指向新域，API origin 保持 app.bibo.bot。已有 npm0.1.0 不覆盖，发布0.1.1 修正文档入口。文档发布与应用发布脚本独立；CI 显式验证两份部署产物。
- 验证：类型检查、路由重定向测试、完整测试/Worker dry-run；文档构建校验全部内部链接；八类页面字段源自运行目录；本地与生产桌面/390/320 手机导航/搜索/代码块/下载/404；新域 TLS、旧址308路径query、App无文档资产；新发布CLI+Skill链接及生产黄金链路。
- 目录 preflight：无项目 planned-path 脚本；新页面只在 apps/bibo-docs/features，新部署配置在 apps/bibo-docs，生成目录仍 .generated，构建逻辑仍 scripts/docs，不另建治理/业务 owner。

### r2 方案 Review

mode=design；按用户两条原始纠正核对独立域名、功能可发现性及真实使用链路；未知域名/DNS状态留给部署前只读检查，失败时保留现有站可用。独立 Worker 不带业务绑定，旧 URL 保留兼容，参数来自现有 owner。无未关闭 finding；design-review: passed；适用本节 r2；plan: required，沿原计划增加修正批次。

## 接入管理体验重构（2026-10-23；方案待实施）

### 用户后续澄清：本轮首先解决视觉设计

用户明确「不是授权逻辑奇怪，是这个页面……非常奇怪，丑陋……根本就没设计过」。因此本轮交付视觉设计稿，保留现有授权逻辑；下文导航/流程建议属于待实施建议，不能冒充用户要求重做授权协议。

- 视觉基线：沿用现有Bibo经典主题的#e8ece5框架、#fffefa画布、#303a30正文、#42624a操作色；相同图标语言、44px顶栏、32–34px按钮与紧凑输入框。保留工作区圆角，删除内层重复大卡片和装饰性巨型钥匙。
- 构图：正常页面标题与一句描述，操作右对齐；授权列表直接铺在工作区，以细线区分条目；名称、权限、最近使用、期限建立固定列关系，收起过期项，教程缩为底部轻量入口。手机重排为紧凑纵向条目。
- 表单：点击现有「创建访问令牌」操作打开480px紧凑Dialog；名称独占一行，权限/期限并排，说明退后，取消/提交右对齐。改变表单展现，不改变已有字段、scope、接口或凭据生命周期。
- 本地可交互稿：[index.html](../../.local/integrations-design/index.html)；桌面desktop.png、创建令牌create-token.png、手机mobile.png与mobile-token.png均在同目录。数据为演示，不调用API、不创建凭据；没有替换生产页面。
- 浏览器实际渲染1440/390/320、检查横向溢出与打开/关闭Dialog；人工查看桌面、表单及手机截图，修正取消按钮样式继承。仅视觉自查，未独立评审，用户偏好未确认。

- 用户要求：截图中「接入与授权」与其他页面不一致，入口难找；本轮明确要求最佳实践方案，不修改产品实现或部署。design-document: required；plan: not-required（单批界面与导航调整，沿用原owner；实际实施前按最终范围确认）。
- 来源：用户附件codex-clipboard-c7c67529-4c48-4a76-9da8-38c356defe25.png。只作当前页面证据；对照现有笔记1440截图、tasks-view及workspace样式、account-menu、workspace-router和IntegrationsPage/store/API公共类型。沿用oil-ui视觉诊断；单代理自审，未做独立视觉评审或新版渲染，不冒报视觉验收。

### 事实与根因

1. 入口存在于「账号与帮助→接入与授权」，没有常驻明确入口。路由handle借用overview，导致首页高亮；非笔记页面默认展示SessionNavigation，授权页也出现最近对话。不是单纯图标或颜色问题。
2. 页面绕过workspace-page/toolbar布局，自己限定1100px居中、最大48px内边距、左右双卡片，原生input/select另写样式；与现有任务/收件箱的共享工具栏、列表、表单组件不同。共享颜色变量不足以保证产品一致性。
3. 默认大表单要求创建PAT，与已上线的默认浏览器授权主链路冲突。已有授权在下方；教程与管理同等重量。第二条命令被CSS强制块级导致后面的逗号和说明另起行，进一步割裂阅读。
4. 当前能力只有list/create/revoke；BiboIntegration包含id/name/scopes/createdAt/expiresAt/lastUsedAt，无已验证应用身份、设备类型、IP、来源或访问审计。不能凭名称推断官方身份，也不能把PAT与设备授权伪分成可精确分类的两种连接。

### 推荐结构与选择

选择「工作区原生接入管理页＋独立授权页＋外部文档」。/integrations负责回看、添加和撤销连接，保持应用布局；/authorize负责一次授权，保持独立精简页面；docs.bibo.bot负责完整教程与API。三者复用Bibo品牌、控件和文案，布局按任务区分。

不选继续修饰双卡片：保留错误主次。不选单独开发者控制台/新域名：增加跳转和另一套导航。不选本轮建立全套设置中心：现有产品没有统一设置路由，为一个入口扩建设置系统没有必要；将来出现完整设置中心时可把本页归入「设置→接入与授权」，保留直达快捷入口和旧URL。

### 导航与页面骨架

- 桌面导航栏下部、账号按钮上方增加常驻「接入与授权」，展开模式显示文字，收起模式使用统一图标与tooltip。页面打开时此项高亮，首页不高亮；本页不展示最近对话。手机「更多」菜单提供同名可见项；保留账号菜单旧入口、/integrations书签和授权成功后的管理链接。避免为本页新增无用次级侧栏。
- 沿用现有主内容画布、顶部栏、workspace工具栏、主题变量与共享Button/Field/Input/Select/ListRow/Dialog/Sheet；桌面常规内边距16–24px，手机12–16px。移除独立窄版白纸、巨型钥匙和营销标题。保持应用现有文字、按钮、圆角及行密度；不重写全局主题。
- 页标题「接入与授权」，一句说明「管理能够访问你空间的工具」，右侧主按钮「连接工具」；「开发者文档」为弱链接。默认首屏主角为授权列表，非创建表单。
- 列表每行：名称、只读/读写、有效/已过期、最近使用/尚未使用、到期时间、更多操作。已有字段直接呈现；不伪造在线状态、机器名称、官方认证、访问日志。点行打开详情Sheet，展示创建时间、范围和到期信息；撤销放详情危险区和行操作菜单，二次确认，完成后同步列表。没有当前不支持的改名、续期或就地修改权限按钮。
- 默认有效项优先，已过期项独立折叠分组；空态只显示「还没有工具连接到你的空间」和「连接工具」。加载、读取失败+重试分别呈现；不能把读取失败显示成零连接。列表较多时客户端搜索名称；没有证据不新增分页服务或应用市场。

结构草图（布局说明，非已渲染设计稿）：

```text
接入与授权                          开发者文档  [连接工具]
管理能够访问你空间的工具
──────────────────────────────────────────────────────
已授权的工具（2）
Bibo CLI       读写 · 有效     最近使用…     到期…   ⋯
我的编程助手   只读 · 有效     尚未使用      到期…   ⋯
──────────────────────────────────────────────────────
已过期的授权 ▸
使用 API 或无人值守脚本？创建访问令牌
```

### 操作链路

1. **普通CLI/Agent接入**：从常驻入口进入→「连接工具」打开同产品Sheet→显示安装CLI和bibo auth login两个独立可复制命令→CLI打开/authorize→登录后核对码和权限→用户明确同意→CLI自动领取并显示登录成功→管理页重新聚焦时刷新列表，新增项可见。网页不能只因复制命令就显示已连接。VPS/SSH入口展开--no-browser说明及「输入设备码」链接；短码仍由CLI申请，不让网页替CLI制造无消费者的请求。Skill安装说明为可选展开/文档链接，不强迫所有用户配置Codex。
2. **开发者与无人值守脚本**：页面次级「创建访问令牌」→Dialog收集名称、只读/读写和到期→默认只读30天→明确提示当前覆盖整个空间→提交成功仅此一次展示可复制秘密→关闭清除明文→返回同一授权列表。失败保留字段；重复提交禁用；复制失败保留手动选择方式。用户主动创建并保存凭据，不要求普通CLI用户执行这条支线。
3. **回看与撤销**：桌面/手机正常导航进入→看到当前有效授权→详情确认工具、权限、时间→撤销二次确认→等待期间防重复→成功后列表移除且原凭据请求401；失败保持原条目与对话框并可重试。撤销保留空间内容，不能提供虚假的撤销后恢复或token回显。

### Owner、状态与边界

- 现有integrations store/client/API/账户DO仍是唯一数据主链路；筛选、详情选择和表单展现留当前feature，不增并行凭据服务，不迁移数据、不要求重新授权。明文只在创建Dialog瞬态保留，账号变化/关闭后清除。
- 导航要表达当前是integrations而非overview，使用最窄路由元信息/页面判断；不为非资源页面把授权对象混入笔记/任务数据模型。返回其他工作区后原导航和侧栏正常恢复。
- 列表刷新不覆盖未提交表单；切换账号清除旧列表/详情/秘密，丢弃旧异步响应。页面聚焦刷新反映另一标签页的CLI授权；过期状态在聚焦/有效期边界重新计算。撤销中、失败、空、过期和读取失败分开表达。
- 当前scope仅全空间读取/读写；按目录、单笔记、特定项目授权需要协议单独设计。本轮界面必须讲清范围，不展示尚不支持的勾选。只有后续有可靠来源元数据时，才区分OAuth应用/设备/手工令牌等类型。

### 验收与方案自审

- 从普通工作区首次进入即可找到入口；桌面展开/收起、手机更多均能直达；选中态正确，无最近对话混入。
- 已有连接在1440×900与390×844首屏直接可见；320px无横向溢出，200%缩放仍能读到权限、状态并操作；两种现有主题一致，使用共享控件和键盘焦点行为。
- 真实CLI授权→返回管理列表→撤销→原CLI401；PAT创建→仅一次显示→实际读请求→撤销401。只读写请求403、拒绝/取消、复制失败、错误重试、账号切换、刷新后保留真实授权结果均验证。
- 源码改动后运行匹配tsc、现有store/路由测试和真实桌面/手机浏览器链路；沿原烟测增加从真实导航进入、列表位于默认主视区的断言。用户判断新版视觉偏好，AI负责可用性与权限正确性；不以测试通过代替看图。
- 自审结论：复用现有资源与协议能闭环，不需要新增后端、设备注册或设置框架；入口、管理列表、接入引导、一次确认各自有明确职责。代价是新用户首次连接多打开一次Sheet，换来日常管理清晰；空态主按钮与简短步骤减少该成本。此节为可执行建议，尚未实施、未获用户视觉确认。

依据：[Notion连接管理](https://www.notion.com/help/add-and-manage-connections-with-the-api)将发现、配置和管理放入稳定Connections入口；[GitHub已授权应用管理](https://docs.github.com/en/apps/oauth-apps/using-oauth-apps/reviewing-your-authorized-oauth-apps)提供可回看的应用列表与撤销；[GitHub访问令牌](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)将PAT定位为特定认证方式。上述支持组织原则；Bibo的具体布局与入口为基于产品愿景和现有代码的设计建议，不声称已有相同能力。
