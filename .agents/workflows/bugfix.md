# 问题修复 Workflow

## 进入条件

恢复已有合同行为。预期未知先调查，不把新增需求当 bug。

## 顺序与门

预期/异常 → 复现取证与根因 → 修复和回归判定 → 必要设计/方案 Review → 修复 → 原触发与相邻行为验证、Review → 交付 → 复盘。

只有根因、路径与修后判定明确，L0-L1、单 owner、局部可逆且不改变跨层合同/状态/持久化/兼容/迁移/fallback 的 bugfix，才可内联修复设计并跳过独立方案 Review。记录 skip-design 与依据；其它 bugfix 走正式设计门。复现由理解阶段选择 reproduce 或 skip-reproduction 并说明证据，不新增 phase。

## 调度与返回

由 [Development Lifecycle](../skills/development-lifecycle/SKILL.md) 选择当前阶段 Skill、处理返工并检查完成门；本文件只定义本流程路径，不复制阶段方法。

单项任务按其目标范围交付；嵌套在[大型交付](major-delivery.md)时，返回本工作项的结果、证据、风险与未闭合项，由外层集成并核对整体目标。子流程结束不关闭 parent-goal，仍保留 Lifecycle 的适用复盘与完成要求。
