# Bibo 开放空间验收合同

- contract-id: bibo-open-api-v1；revision: r1；状态：active。
- [原始输入](../../logs/2026-10-22-bibo-open-api/README.md#原始输入与约束)；[设计与黄金验收](../../designs/2026-10-22-bibo-open-api.design.md)；[恢复入口](current-state.md)。

| ID | Required 结果 | 证据与状态 |
| --- | --- | --- |
| API | 外部 Agent 授权访问现有空间对象及图片，统一业务 owner，稳定版本化合同、租户隔离和错误 | 本地单元/真实 Worker 通过，待生产 |
| AUTH | 网页创建/列表/撤销、一次性显示、只读/读写/过期/限流；CLI 安全登录和自撤销 | 安全/并发与真实浏览器通过，待生产 |
| CLI | @nextclaw/bibo 稳定公开发布，常用对象级 CRUD、版本/幂等、机器输出；@nextclaw/bibo-api SDK 可独立使用 | tarball 独立安装通过，待 NPM 发布 |
| DOCS | 公开文档网站实际部署，安装/使用/API/CLI/SDK/安全/自部署和可安装 Skill 完整准确 | 构建/下载/手机桌面通过，待部署 |
| CI | 独立仓库 NPM 发布 CI 完成真实发布并可核验，秘密不入仓库 | workflow 已编写，待执行 |
| REGRESSION | 既有对话/编辑/空间不回归，TS/测试/Worker/包/桌面手机/生产黄金链路及实现 Review 通过 | 本地回归与 Review 通过，待生产验收 |

完成条件：以上全部 Required 有有效版本/环境证据；三条黄金验收在真实可用入口成立。文档、设计或自查不能替代实际发布、安装和线上结果。授权已含提交推送、稳定 NPM 发布、应用与文档部署；不重复求批。
