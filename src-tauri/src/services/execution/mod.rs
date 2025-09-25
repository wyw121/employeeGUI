//! execution/mod.rs - 执行相关公共导出入口 (骨架)

pub mod model;
pub mod retry;
pub mod ui_snapshot;
pub mod adapter; // 旧 SmartScriptStep -> ExecStep 适配层
pub mod env; // ExecutionEnvironment 聚合
pub mod matcher; // MatcherService 草案
pub mod snapshot_real; // RealSnapshotProvider 实现
pub mod registry; // 全局执行环境注册表
pub mod matching; // 统一匹配与传统回退逻辑
pub mod orchestrator; // 智能脚本批量执行编排器
pub mod actions; // 智能脚本动作分发器

pub use model::*;
pub use retry::*;
pub use ui_snapshot::*;
pub use adapter::{adapt_step, adapt_steps, map_action_kind};
pub use env::ExecutionEnvironment;
pub use matcher::{MatcherService, MatchResult};
pub use snapshot_real::RealSnapshotProvider;
pub use registry::{register_execution_environment, collect_execution_metrics_json};
pub use matching::{
	run_unified_match,
	run_traditional_find,
	LegacyUiActions,
};
pub use orchestrator::SmartScriptOrchestrator;
pub use actions::SmartActionDispatcher;
