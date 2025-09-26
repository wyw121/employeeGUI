// Centralized Tauri command module
// 分领域子模块：确保 main.rs 精简

pub mod app_lifecycle_commands; // 现有（保留）
pub mod employees;
pub mod adb;
pub mod files;
pub mod page_analysis;
pub mod logging;
pub mod xml_cache;
pub mod metrics;

// 可选：统一 re-export，方便 main.rs 引入
pub use employees::*;
pub use adb::*;
pub use files::*;
pub use page_analysis::*;
pub use logging::*;
pub use xml_cache::*;
pub use metrics::*;