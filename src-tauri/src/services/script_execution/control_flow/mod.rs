// 控制流模块：模块化处理各种控制结构
// 
// 设计原则：
// 1. 单一职责：每个模块只负责一种控制结构
// 2. 开放封闭：易于扩展新的控制结构，无需修改现有代码
// 3. 依赖倒置：通过 trait 抽象，避免具体实现依赖

pub mod ast;           // 抽象语法树定义
pub mod parser;        // 控制流解析器
pub mod executor;      // 控制流执行引擎
pub mod handlers;      // 控制结构处理器
pub mod context;       // 执行上下文管理
pub mod preprocessor;  // 统一预处理器

// 重新导出主要接口
pub use ast::{ControlFlowNode, ControlFlowType, ExecutionPlan};
pub use parser::ControlFlowParser;
pub use executor::ControlFlowExecutor;
pub use context::{ExecutionContext, ExecutionScope};
pub use preprocessor::ScriptPreprocessor;