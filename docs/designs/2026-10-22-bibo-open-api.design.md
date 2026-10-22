# Bibo 开放空间第一版方案

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
