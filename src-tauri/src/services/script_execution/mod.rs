/// 脚本执行模块
///
/// 包含控制流处理系统和相关的执行组件
pub mod control_flow;

/// 滑动增强模块
///
/// 提供增强的滑动操作功能，包括诊断、验证和多重执行策略
pub mod swipe;

// 重新导出主要接口
pub use control_flow::{
    ControlFlowExecutor, ControlFlowNode, ControlFlowParser, ExecutionContext, ExecutionPlan,
    ScriptPreprocessor,
};

pub use swipe::{
    EnhancedSwipeExecutor, SwipeDiagnostics, SwipeValidator
};
