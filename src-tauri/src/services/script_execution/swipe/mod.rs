/// 滑动增强模块
/// 
/// 该模块专门负责增强滑动操作的可靠性，包括：
/// - 滑动前后的UI状态检测
/// - 滑动参数验证和优化
/// - 滑动执行监控和诊断
/// - 错误处理和重试机制

pub mod enhanced_executor;
pub mod diagnostics;
pub mod validator;

pub use enhanced_executor::EnhancedSwipeExecutor;
pub use diagnostics::{SwipeDiagnostics, SwipeValidationResult};
pub use validator::SwipeValidator;