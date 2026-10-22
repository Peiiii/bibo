# Workflow 目录

流程约束的命名入口；[Development Lifecycle](../skills/development-lifecycle/SKILL.md) 负责分类、阶段调度、返工与完成。Skills 提供阶段方法，Wiki 提供事实与共享知识。

| Workflow | 层级与用途 |
| --- | --- |
| [大型交付（major-delivery）](major-delivery.md) | 外层组合流程：跨工作项/上下文维护完整成果，嵌套下列基础流程，持续集成与整体验收 |
| [项目初始化（initialization）](initialization.md) | 基础任务：新建产品的技术栈、最小完整项目与首条真实链路 |
| [标准需求开发（standard）](standard.md) | 基础任务：先方案与审查，再实现、验证和交付 |
| [简单改动（trivial）](trivial.md) | 基础任务：局部可逆低风险改动的短路径 |
| [问题修复（bugfix）](bugfix.md) | 基础任务：预期、复现根因、修复与回归 |

先理解用户目标与授权，判断是否需要外层大型交付（`delivery-mode: major`），再为当前工作项选择 `flow`。四种基础 flow 与外层组合流程不是互斥的五选一。只加载命中的 workflow 和当前阶段方法；目录存在不意味着工具会自动加载每个 Markdown 文件。
