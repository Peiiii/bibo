# Bibo 独立开发主仓迁移设计

## 目标与来源

2026-10-22，用户确认“独立立项、用现有 Bibo 仓库承接新方向”，并要求“你来落地并沉淀想法文档”。本次交付是独立项目与开发链路落地，不把尚在头脑风暴的开放平台能力当作实现授权。

- Bibo：个人上下文、资产与开放协作空间；保留管理员助手。
- NextClaw：长期智能搭档与执行能力，未来作为重要接入方。
- 沿用 `Peiiii/bibo` 和本机 `/Users/peiwang/Projects/bibo`，默认分支 `main`。
- flow：standard；risk：L3（源码与规则 owner 跨仓迁移）；retrospective_state：pending。
- active contract：[验收合同](../work/2026-10-22-bibo-independent-development/acceptance-contract.md)。

## 事实与选择

现有 Bibo 仓库能独立安装、运行和自部署，但源码仍由 NextClaw 导出；贡献说明要求回流上游。NextClaw 中 Bibo 应用、client 与 personal-agent-ui 只有 Bibo 应用这个 workspace 消费者。官网构建依赖六个静态候选目录，因此需要整体迁移其真实输入。

采用现有仓库成为源码主仓。相比另建第三个仓库，它保留历史、用户入口和已有独立运行链路；相比继续导出，它消除两个活跃产品源码 owner。

继续沿用 React、TypeScript、Vite、Cloudflare Worker/DO/R2/Sandbox 与公共 NextClaw NPM 包。此次改变维护归属，重选运行栈与新建 Agent runtime 不服务当前目标。

## 唯一主链路

1. 从冻结的 NextClaw 已提交源码迁入 Bibo 应用、Bibo client、个人 UI，以及官网和六个候选静态源目录；不复制内核源码、凭据、node_modules、构建缓存或原工作区 WIP。
2. 应用依赖公共 NextClaw 包的精确已发布版本；Bibo 自有 client/UI 仍为本仓 workspace package。保留现有包名，避免无用户收益的全量重命名。
3. 保留自部署为默认入口；官方托管配置单列，维持原 Worker、DO 类、bucket、域名与迁移标签。此次不变更生产资源或数据，不以 dry-run 宣称线上已更新。
4. 本仓维护 README、贡献入口、AGENTS、愿景、原始想法、独立开发决策和 CI。`SOURCE.json` 保留历史导入依据，明确此后独立开发，不再由 exporter 覆盖。
5. 本仓 install/typecheck/test/build/Worker dry-run、真实桌面与手机浏览器通过后，提交推送 `origin/main`，核验云端 CI。
6. NextClaw 删除迁走的可执行产品副本及导出模板，保留原路径迁移说明；退休 exporter 明确拒绝生成新副本。NextClaw 规则、开发命令和交付路由同步指向 Bibo。

不引入 sibling-path 源码依赖、自动双向同步、临时私有包拷贝或第二套 Agent loop。

## 黄金验收

- 开发者进入 Bibo 仓库，按 README 安装并运行 `pnpm dev`，在独立浏览器预览里完成一次对话和笔记编辑；桌面与手机尺寸均能继续操作。
- 从独立仓库执行类型、测试、构建和 Worker dry-run，不需要 NextClaw checkout、未发布源码 alias 或私有配置；官网构建输出包含根页和六个候选。
- 下一位维护者从任一仓库入口都能找到同一个 Bibo 源码 owner；旧导出操作显式退出；用户原话与已确认关系可以从 Bibo 的文档直接找回。

## 保护与失败边界

- NextClaw 原有一个修改文档与六个未跟踪文档不属于本任务；记录字节摘要，提交与收尾核对，不迁移、不覆盖、不混入。
- 独立安装若发现未发布依赖，回到版本选择并验证，不复制内核源码来绕过依赖边界。
- Bibo 推送并验证前不撤掉原执行副本；CI 或验收失败先修复本仓。
- 新开放 API、CLI、Skill 与 Agent 通信功能仍归后续产品设计。本次只沉淀其方向，不声称产品转型已经实现。

## 方案 Review

Design review：passed。已核对原用户目标、完整官网输入、公共依赖边界、来源冻结、WIP 保护和删除时机。与源码 owner 迁移无关的 runtime 重构与产品功能不纳入本任务。plan：not-required；本设计按单批依次执行并由 current-state 记录恢复点。
