# Bibo 开放空间验收合同

- contract-id: bibo-open-api-v1；revision: r4；状态：in-progress（用户纠正授权页仍嵌入工作区；独立授权页重新验收，其余已发布合同保留）。
- [原始输入](../../logs/2026-10-22-bibo-open-api/README.md#原始输入与约束)；[设计与黄金验收](../../designs/2026-10-22-bibo-open-api.design.md)；[恢复入口](current-state.md)。

| ID | Required 结果 | 证据与状态 |
| --- | --- | --- |
| API | 外部 Agent 授权访问现有空间对象及图片，统一业务 owner，稳定版本化合同、租户隔离和错误 | passed：单元/真实 Worker/生产对象及图片读写，版本 1174dbc4；隔离、错误、限流和过期由组装/单元证明 |
| AUTH | 网页创建/列表/撤销、一次性显示、只读/读写/过期/限流；CLI 安全登录和自撤销 | passed：生产网页创建→正式 CLI 登录→只读拒绝→撤销 401；并发 reset/revoke、过期和限流回归通过 |
| CLI | @nextclaw/bibo 稳定公开发布，常用对象级 CRUD、版本/幂等、机器输出；@nextclaw/bibo-api SDK 可独立使用 | passed：两个包 0.1.0 公开发布；registry 全新安装、bin、SDK import、真实对象读改、冲突、幂等、图片和 Skill 安装通过 |
| DOCS | 独立 docs.bibo.bot 文档站；首页与侧栏按笔记、文件、待办、项目、日程、收件箱、图片、概览完整列出能力，每类有操作/参数/结果/CLI/API 示例；安装/SDK/安全/Skill 完整 | passed：独立域/八类指南/19页、搜索与手机导航/下载生产浏览器通过；文档HTTP示例交实际业务owner执行通过；版本640e7091 |
| CI | 独立仓库 NPM 发布 CI 完成真实发布并可核验，秘密不入仓库 | passed：[release run 39790168184](https://github.com/Peiiii/bibo/actions/runs/39790168184) success；[正式 Release](https://github.com/Peiiii/bibo/releases/tag/bibo-v0.1.0)；Secret 独立环境 |
| LOGIN | 默认自动开网页、最少介入确认；VPS/SSH手工短码/完整链接，CLI自动轮询；拒绝/过期/退避/取消与scope安全 | passed：正式NPM0.2.0+生产Worker f378b7f9+真实浏览器预填/手填/轮询/拒绝/只读通过；过期、退避与取消由Worker/CLI定向测试证明；本机打开器仅验证调用URL |
| ACCOUNTS | Bibo独立注册、登录、会话；老用户身份/密码/空间迁移；不再共享NextClaw账号变更 | passed：独立D1注册/密码重置/会话撤销与身份隔离测试通过；生产140身份同ID审计、旧密码/会话交换/空间/PAT连续性及真实邮件实收通过，Worker abbba208；生产密码重置E2E未执行，不要求用户重置或提供验证码 |
| AUTH-PAGE | /authorize为独立专门页面，登录/确认/成功/拒绝/过期完整；无工作区导航/聊天请求，1440/390/320清楚可操作，授权结果继续由CLI自动领取 | pending：r4纠正；设计见独立账号与CLI授权文档2026-10-23章节，生产待发布验收 |
| REGRESSION | 既有对话/编辑/空间不回归，TS/测试/Worker/包/桌面手机/生产黄金链路及实现 Review 通过 | passed：CI 217 项测试 + 2 项真实 Worker；本地完整工作区浏览器、授权 1440/390/320、两种构建/dry-run、Review、生产黄金链路通过 |

完成条件：以上全部 Required 有有效版本/环境证据；三条黄金验收在真实可用入口成立。文档、设计或自查不能替代实际发布、安装和线上结果。授权已含提交推送、稳定 NPM 发布、应用与文档部署；不重复求批。

生产证据：`.local/production-golden-retry.log`（脚本 exit 0，2026-10-22 21:58 Asia/Shanghai）；使用 NPM 正式包而非本地源码 CLI。所有测试 key 和可删除对象已清理；独立测试账户保留一个已处理收件箱回执及 68 字节测试图片。完整产物/来源/限制见[交付记录](../../logs/2026-10-22-bibo-open-api/README.md)。
