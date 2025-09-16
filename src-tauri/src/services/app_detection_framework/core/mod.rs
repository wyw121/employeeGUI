//! 应用检测框架的核心模块
//! 
//! 本模块包含了应用状态检测的核心抽象和基础实现：
//! - `detector_trait`: 定义应用检测器的通用接口
//! - `detection_result`: 检测结果和状态的类型定义
//! - `detection_config`: 检测配置管理

pub mod detector_trait;
pub mod detection_result;
pub mod detection_config;

// 重新导出核心类型，便于外部使用
pub use detector_trait::{AppDetector, BaseAppDetector};
pub use detection_result::{AppLaunchState, DetectionResult, DetectionStats};
pub use detection_config::{DetectionConfig, DetectionKeywords, AppConfigManager};