# Bibo 独立账号与 CLI 浏览器授权

## 用户目标与来源

2026-10-22 用户追加要求：Bibo 账号与 NextClaw 分开，老用户尽量无感迁移；指出 `auth login` 要手工创建/粘贴 Token 难用；确认本机浏览器和 VPS 轮询均需支持；提出网页输入 CLI 短码；最后明确默认采用用户介入最少、最简单的方式。

当前证据：Bibo 的注册/登录/me 在 bibo-auth.utils.ts 转发到 ai-gateway-api.nextclaw.io/platform/auth；Cookie 名已独立但凭据和身份仍共享。模型调用直接使用 Bibo 自己的 DeepSeek key 和 BiboModelBudget，分离账号不需要搬迁 NextClaw 余额。空间 DO 使用 `user:<原userId>`，保留该 ID 就保留聊天、文件、任务与现有 API 授权。NextClaw users 保存 PBKDF2-SHA256 盐与 verifier，可在不取得用户明文密码的情况下迁移；旧 Cookie 要独立验证后才能交换，不信任 JWT 未验证字段。

## CLI 授权方案

采用 RFC 8628 设备授权的一条状态链。默认 `bibo auth login` 自动打开含预填短码的授权网页；已登录用户只需核对设备码和权限、点击授权，CLI 按服务器 interval 自动轮询。`--no-browser` 或 SSH/无桌面环境显示网址、短码和完整链接，用户可在任意设备打开；网页提供手工输入短码入口。两种体验共用协议，不启动 localhost callback 服务；浏览器失败自动保留手工入口。`--token-stdin` 保留自动化兼容，普通登录不再要求粘贴 Token。

- 设备码为高熵秘密，只在 CLI/HTTPS token 请求中传递；短 user_code 为易读、排除歧义字符的八位码，仅用于定位授权，不是凭据。
- 请求有10分钟期限，client_id 固定 bibo-cli，默认请求空间读写；`--read-only` 可只读，网页允许降权。网页必须认证、校验 Origin、明确显示 CLI 名称/短码/账户/权限并显式同意或拒绝。预填不等于自动同意。
- 服务端处理 pending、approved、denied、expired，轮询至少5秒；过快 slow_down，CLI递增退避；网络故障保持有界重试，SIGINT取消，不回显 access_token。
- 新 BiboDeviceAuthorization DO 按 user_code 拥有短期授权状态，串行化其状态迁移；用户 key 仍由 BiboIntegrationKeys 唯一拥有，生成现有 PAT，既有 API/CLI/SDK合同不分叉。仅内部 DO 路由允许确定性 grant ID/secret；重复领取同一授权返回同一 key，撤销短期墓碑防止重试复活。密钥只保存 hash，短期 DO 不保存明文 PAT。
- 不引入全新 OAuth Provider/ORM/token owner。Better Auth 的 device plugin适合全站替换，但当前会引入第二套 session/access token 与数据库适配，不能仅为 CLI UX 替换已有空间授权。复用现有 Cloudflare/React/Node 工具链，并按 RFC 端点状态与安全边界验证；不声称已实现通用 OAuth 提供商。

## 独立账号方案与前置条件

建立 Bibo 自己的账号库、密码 verifier、会话与邮箱验证码；新注册不再创建 NextClaw 用户。迁移保留 legacy userId，复制必要身份与密码 verifier，不复制余额、API key 或平台签名密钥，不改 NextClaw 源账号。相同邮箱在迁移后两边独立修改密码、登录与退出。

正常登录/读取空间不依赖 NextClaw；旧有效 Bibo Cookie 在有限兼容窗口内经原服务验证后交换本地会话。无效/过期 Cookie 正常重新登录，用户不必重新注册或搬数据。切换前完成迁移 dry-run、计数与身份映射审计，切换后验证老用户空间、现有 PAT、新注册与跨产品密码隔离。邮件传输可复用基础设施，但验证码与注册事实归 Bibo；目前已确认生产邮件在 NextClaw Resend Secret，本机没有该 key，须定位可授权的独立邮件认证入口，不能以继续代理 NextClaw 注册冒充完成。

## 验证、交付与回退

- 设备流程用真实 Worker/DO 覆盖成功、匿名/CSRF拒绝、码与秘密不匹配、降权、拒绝、过期、slow_down、重复领取、撤销后不复活；CLI 用 HTTP fixture证明轮询和退避，用生产浏览器+正式安装包证明默认和无浏览器使用路径。
- 桌面/390/320px 真实网页：未登录→登录回到同一授权请求；预填/手填、权限、授权/拒绝、过期及返回终端提示。令牌不得进入浏览器 URL、页面或日志。
- 新文件按现有 owner 分别进入 app/services、app/routes、features/integrations、CLI src；项目无 planned-path 脚本，已检查目录职责，不新增治理工具。新增 DO migration只追加，不重命名既有业务类/数据资源；原 Worker 可按 deployment version回退。
- NPM0.1.0/0.1.1 不覆盖，CLI 新功能发布0.2.0；同步 docs、Skill、快速开始与 App引导。文档域名修正0.1.1仍在独立 CI发布，不因本项取消已接受版本。

## 方案 Review

2026-10-22；mode=design；已核对用户最新的最少介入默认方式、远程轮询、手工短码及账号分离；成功路径与失败状态均有可观察验收。设备授权部分无未关闭 finding，design-review: passed。账号部分的邮件认证与生产源数据可用性尚需调查，不得宣称账号已经独立，也不在未知条件下切换登录。plan: required，按原整体计划追加设备授权→独立账号→完整验收批次；设备授权可先实现并复用现有网页登录。

## 账号方案冻结（用户确认复用原邮件服务后）

- 用户明确「复用nextclaw不行吗」「你全权处理」。复用现有网关的命名 Service Binding `TransactionalEmail`，Bibo通过私有fetch /send只借用邮件传输；验证码、模板与身份归Bibo，密钥留原Worker。上游改动在独立managed worktree，源区WIP不触碰，不增加公网发信路由。
- 使用独立D1 `bibo-accounts`。迁移前共享平台的既有账户本来都可登录Bibo，因此按固定快照导入最小身份字段及PBKDF2-SHA256(100000)盐/verifier，保留原userId/邮箱/角色。不复制余额、第三方key或签名密钥，不修改源DB；迁移脚本dry-run、冲突检查、幂等导入与计数校验，不将邮箱/verifier打印到日志或文件。
- 新账号使用同一已验证的WebCrypto密码格式及随机盐；Bibo本地随机opaque session只保存SHA256，HttpOnly/Secure/SameSite cookie，30天期限与本地撤销。密码重置只改Bibo并撤销其会话；账户失败锁定与IP限流保留。
- 邮箱验证码6位、10分钟期限、60秒重发间隔、最多5次错误；以独立服务端Secret做HMAC，数据库不存明文。注册/重置使用原子D1 batch避免验证码重放。Secret由程序生成并经stdin写入Worker，禁止回显。
- 迁移兼容窗口到2026-11-22 00:00 Asia/Shanghai。旧有效Cookie仅经原服务验证后交换Bibo会话；已消费指纹留短期墓碑，防止退出后拿旧Token重新交换。源快照完整导入、切换时再追平身份；密码登录始终只验证本地，不以失败回落到NextClaw。新注册不创建平台账号。原密码/笔记/授权ID不变，过期Cookie正常重新登录。
- 正常原生会话、登录、注册、空间管理不查询NextClaw身份库；只在有限旧会话/遗漏用户迁移分支访问旧服务，窗口后自动拒绝。共享邮件传输不拥有身份或验证码校验。
- 验收：真实D1/Worker原生注册→登录→空间，旧身份保留数据与PAT，旧Cookie交换/重放拒绝，密码重置隔离、过期/失败锁定/验证码竞争与重放；生产迁移计数和原用户登录/空间；已有应用版本和源D1均保留回退入口。源平台数据库只读，不执行财务迁移。

账号方案Review：用户授权已覆盖复用邮件；原代码/密码格式与空间路由证据齐全。D1独立资源、邮箱传输capability及有期限迁移桥各有唯一owner；无未关闭设计finding，design-review: passed（账号部分），允许实现；在资源/迁移验证成立前不切换生产登录。

23:32收窄复核：源快照140个账号全部具有支持的verifier，无需额外密码代理fallback；改为迁移快照完整导入与切换追平，避免新NextClaw用户在Bibo隐式注册。兼容仅保留旧有效会话交换，正常身份链独立。design-review: passed（该收窄），验收保留同ID空间/PAT与原密码连续性。
