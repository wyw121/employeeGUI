/// 模块三：控制结构处理器
/// 
/// 职责：
/// - 定义统一的控制结构处理接口
/// - 实现各种控制结构的具体处理逻辑
/// - 支持控制结构的扩展和自定义

pub mod base;        // 基础处理器接口
pub mod loop_handler;     // 循环处理器
// pub mod conditional_handler; // 条件处理器（未来扩展）
// pub mod parallel_handler;    // 并行处理器（未来扩展）
// pub mod trycatch_handler;    // 异常处理器（未来扩展）

// 重新导出主要接口
pub use base::{ControlStructureHandler, HandlerResult, HandlerConfig, HandlerStats};
pub use loop_handler::LoopHandler;