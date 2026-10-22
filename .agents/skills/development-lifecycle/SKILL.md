---
name: development-lifecycle
description: 通用开发流程的唯一 Meta Skill；理解后选择外层大型交付与适用的 initialization、standard、trivial 或 bugfix，管理阶段门、返工、验收与整体完成；阶段 Skill 提供方法，知识库提供事实。
---

# Development Lifecycle

## 职责与入口

只管理流程、阶段状态与完成判断，不复制阶段方法或动态项目事实。项目定义了意图宏时按其权威登记展开；解释、引用不执行。仅调查、设计、Review 等请求止于指定产物，不自动扩展为实现或发布。

worktree/主线并发遵守项目 Git 合同，保护既有改动并迁移本任务草稿。用户明确要求省 Token 且指定子代理时才读[委派合同](references/token-efficient-delegation.md)。

Task Understanding 给出目标、授权、验收、证据/未知、owner、风险与分类依据；仅澄清影响目标或关键选择的缺口。

## 可选插件

安装/升级默认初始化开发阶段标记；开始及恢复时核对根 `AGENTS.md` 项目自有段落的独立配置行 `- Qingtian 插件 development-step-tracing：开启`。开启时读取[开发阶段标记](../../wiki/skills/process/development-step-tracing/SKILL.md)，每条用户可见开发工作消息都沿真实阶段展示，同阶段也不省略。明确关闭时保留选择；缺配置、重复或冲突时说明接入未完成，使用共享 AGENTS 的轻量 step 兜底并继续开发，不擅改开关。开启只增加可见性，不改变阶段门或完成标准；限定调查/单阶段任务不扩范围。其它可选模块尚未定义，不能猜测启用。

## 分类与风险

先判断外层：用户委托完整大型成果，且需跨工作项/上下文保持整体责任时进入[大型交付 workflow](../../workflows/major-delivery.md)，记录 `delivery-mode: major`。规模或文件数本身不触发；它可嵌套基础流程，不取代当前工作项分类。

再按顺序选择当前工作项的 `flow`：

1. 新建独立产品，或目标目录仅有管理脚手架、没有服务本次目标的产品运行链路 → `initialization`；读取[项目初始化](references/project-initialization.md)，复用现有阶段并增加初始化门。仅规则接入/升级或已有产品新增功能不命中。
2. 恢复已有合同行为 → `bugfix`；预期未知先调查，不把新增需求当 bug。
3. 非 bug，且局部可逆、范围清楚、惯例路径、验证直接、无真实设计分叉或高风险边界 → `trivial`。
4. 其它变更 → `standard`。

风险独立：L0 普通文档/元信息；L1 局部低风险；L2 行为/交互；L3 跨 owner、持久化、协议或高影响规则；L4 发布、迁移、生产或不可逆操作。按内容而非扩展名或行数判断。trivial 仅 L0-L1；发现跨层影响或设计分叉升级 standard，复用有效证据。bugfix 有设计缺口时使用正式设计与方案 Review，保留修复目标。

`task-type`（feature/bugfix/small-change）与 flow 分别记录。observer 沿用七阶段；方案审查为 review，AI 验收为 validation/review。

风险 L3-L4 或用户要求大型、多阶段、低监督交付/验收时读取[验收合同方法](../../wiki/skills/process/acceptance-contract-governance/SKILL.md)，登记 active contract 与稳定 ID；普通任务不普遍建 ledger。

## Workflow 目录与路由

[Workflow 目录](../../workflows/README.md)提供五个显式入口，顺序与专属门由对应文件拥有：

| Workflow | 层级 | 路径 |
| --- | --- | --- |
| 大型交付 | 外层组合 | [major-delivery](../../workflows/major-delivery.md) |
| 项目初始化 | 基础任务 | [initialization](../../workflows/initialization.md) |
| 标准需求开发 | 基础任务 | [standard](../../workflows/standard.md) |
| 简单改动 | 基础任务 | [trivial](../../workflows/trivial.md) |
| 问题修复 | 基础任务 | [bugfix](../../workflows/bugfix.md) |

进入后只读取所选 workflow；大型交付每次选择一个当前工作项及其基础 workflow，子结果返回外层集成与整体验收。所有流程共用下面的阶段 owner、返工状态与完成门，不新增 Meta Skill；只要设计/调查的请求仍止于指定产物。

## 当前阶段路由

一次只加载当前 owner，阶段只返回结果，不相互调用或回链：

- 理解、分类依据、事实与复现：`development-task-understanding`。
- 方案、验收设计与矩阵：`development-design`。
- 方案审查(mode=design)或实现审查(mode=implementation)：`development-review`。
- 按合同修改与迭代检查：`development-implementation`。
- 定向证明或最终 AI 验收(mode=acceptance)：`development-validation`。
- 可用入口、用户验收、授权内交付：`development-delivery`。
- 轻量反思与条件沉淀：`development-retrospective`。

跨会话或恢复读取[执行状态与恢复](../../wiki/skills/process/iteration-work-notes/SKILL.md)；需要自主发现并成批修复质量差距、质量迭代宏、反复评审至满意或同类质量纠偏读取[质量迭代收敛](../../wiki/skills/process/iterative-quality-convergence/SKILL.md)；建立或复查长期关注事项、创建/维护/执行周期事项、事实维护或资料冲突读取[项目知识治理](../../wiki/skills/process/project-knowledge-governance/SKILL.md)。只加载命中项。

AI 验收结合 Validation 合同证据与 Review 结论，不新增平行 Skill。方案 Review 不要求多代理。用户验收不适用于纯内部产物时说明依据，不强加产品运行环境。

## 状态与返工

完整开发或授权发布确定 flow 时将 `retrospective_state=pending`；限定单阶段任务不扩成完整交付。阶段返回 status(completed/skipped/rework/blocked)、结论、产物、证据、open_risks、rework_target、acceptance_updates 与 `parent_status`；无 active contract 时 updates 为空。阶段、Delivery、release 不返回整体 completed。

Delivery 完成后仅返回 `parent_status=ready-for-retrospective`。Lifecycle 随即路由 Retrospective，取得 `retrospective_decision`（原 owner 更新与证据，或 `no-increment` 及理由）才置 `retrospective_state=completed` 并检查完成；未完结果返工，进度汇报不改变状态。

- 理解或根因不明回 Task Understanding；模型缺口回 Design；编码偏差回 Implementation。
- 方案 Review 失败回 Design；实现 Review 有 finding 不得交付，修正后重验变化并复审。
- 验证失败按原因返工，受影响证据转 stale，不重复未变化风险的验证。
- 交付入口不完整留在 Delivery；外部失败由该阶段恢复，产物合同错误才回上游。
- 复盘发现结果不完整先返工，不将缺口改称后续优化。

有效合同形成或变化后，受影响设计与旧方案 Review 不再自动有效；若目标、Required 条件、能力边界或关键假设未被现行方案覆盖，先返回 Design 更新并复审，不能凭旧结论继续实现或发布。未变化部分不重跑。

跨会话、交接或上下文压缩前保存 flow、阶段/mode、`retrospective_state`、目标、授权、验收项、证据指针、open Required IDs 与 scope decisions；恢复先对账，不从版本或最新总结猜完成。

## 完成门

整体仅由本 Meta Skill 判定：最小完整结果成立；授权内无可关闭的必要缺口；适用验证有效、Review findings 清零；Delivery 已完成适用交接与用户验收合同；`retrospective_state=completed` 且有明确 `retrospective_decision`；未验证和主观项已披露。没有新增沉淀也要完成判断，但不为此创建空日志。包含复盘新增文件在内，本任务改动须全部归入交付范围；已切 worktree 时源区不得遗留本任务改动，未获提交授权时明确草稿位置与未提交状态。

完成判断分别核对实现、AI 验证和交付。用户验收适用时须有含本次改动的入口、完整使用链路、AI 先验与交接；缺项回 Delivery，擅自缩减目标回 Design。纯内部/限定产物按其范围核对。

区分已交付待用户验收、用户验收通过和任务关闭。约定必须用户确认时保持待验收；否则可结束开发交付。未回复不算通过，验收不新增已有授权之外的审批门。待验收可先做内部复盘，用户反馈更新同一记录。

active contract 的 Required acceptance IDs 必须全部 current passed，且 parent-goal 无未登记缺口；scope reduction（删减/降低标准或移出目标）须用户确认与 scope revision。局部发布、测试成功或写完文档不能替代此门。

未经明确授权不 commit、push、PR、发布、部署或不可逆操作。不得为形式制造无信息增量的文档、检查、审查或沉淀。
