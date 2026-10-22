# Bibo 独立开发交付合同

- contract-id：bibo-independent-development-20261022
- parent-goal：用户可以在现有 Bibo 仓库独立继续开发新方向，保留与 NextClaw 的公共依赖关系，并能找回原始想法与已确认决策。
- scope-revision：1；scope-confirmation：user-confirmed。
- 来源：本次会话 2026-10-22，用户确认沿用已有 Bibo 仓库成为独立主项目，随后要求“可以。你来落地并沉淀想法文档”。完整背景见本仓想法文档，执行依据见[设计](../../designs/2026-10-22-bibo-independent-development.design.md)。
- 单阶段交付；不新建产品、不重写 runtime、不实现尚未确认的开放平台功能。

| ID | Required | 结果 | Status | 当前证据 |
| --- | --- | --- | --- | --- |
| BI-01 | true | 原始想法、已确认产品关系、开发归属在 Bibo 仓库沉淀且区分设想与现状 | passed | thought 原话保留，2026-10-22 确认单列；愿景、README、AGENTS 与 CONTRIBUTING 一致 |
| BI-02 | true | 现有应用、client/UI 和官网输入在独立仓库完整可开发，公共内核通过精确 NPM 依赖使用 | passed | 274 份冻结文件逐项审计；官网根页及六个候选构建成功；外部包全为精确版本 |
| BI-03 | true | 独立安装、匹配范围类型检查、测试、构建和 Worker dry-run 成功 | passed | frozen install、全部 tsc、205 项测试和 1 项真实 SQLite DO 集成、两种构建与 dry-run 通过 |
| BI-04 | true | 独立产物的桌面与手机真实浏览器主链路通过 | passed | 1440/390px 无凭据开发预览：发送对话、笔记自动保存、刷新读回，pageErrors=[] |
| BI-05 | true | 两仓入口指向唯一 owner，旧 exporter 与活跃副本退出，NextClaw 无关 WIP 字节保持 | passed | NextClaw 撤掉活跃源码与导出模板，保留迁移入口及缓存 ignore；exporter 退出且不生成目录；七份 WIP 摘要一致 |
| BI-06 | true | 两仓精确提交推送、Bibo 云端 CI 通过，最终文档与本地恢复入口一致 | passed | Bibo 最终源码 ba9bfea 已推 main，Linux CI 39776652120 全绿；NextClaw 802b1fe0c 已推 master 并返回 LOCAL_MAINLINE_SYNCED；最终说明随本记录同步 |

部署边界：保留官方资源配置并验证打包，不变更生产资源和数据；没有用户可见功能改动，无需 NPM、桌面、NextClaw 文档站或产品部署。
