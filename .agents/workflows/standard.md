# 标准需求开发 Workflow

展示名称为“标准需求开发工作流”；内部 `flow: standard` 与 `standard.md` 路径保持兼容，进入条件、阶段门和完成判断沿现有合同。

## 进入条件

非初始化、非 bugfix，且不满足 trivial 的变更；存在设计选择或较高风险时进入。

## 顺序与门

理解澄清 → 方案与验收设计 → Review(mode=design) → 实现与迭代检查 → Validation(mode=acceptance) → Review(mode=implementation) → 用户验收交付 → 复盘。

standard 不因 diff 小跳过设计：设计含验收标准、必要测试矩阵并完成方案 Review；轻量方案不等于必须建长文档。plan 只在跨批恢复需要时建立，不是新增 phase。

## 调度与返回

由 [Development Lifecycle](../skills/development-lifecycle/SKILL.md) 选择当前阶段 Skill、处理返工并检查完成门；本文件只定义本流程路径，不复制阶段方法。

单项任务按其目标范围交付；嵌套在[大型交付](major-delivery.md)时，返回本工作项的结果、证据、风险与未闭合项，由外层集成并核对整体目标。子流程结束不关闭 parent-goal，仍保留 Lifecycle 的适用复盘与完成要求。
