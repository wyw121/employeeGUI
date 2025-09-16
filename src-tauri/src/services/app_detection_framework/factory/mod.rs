//! 检测器工厂模块
//! 
//! 提供检测器的创建和管理功能：
//! - `detector_factory`: 检测器工厂实现

pub mod detector_factory;

// 重新导出主要类型
pub use detector_factory::{DetectorFactory, DetectorRegistry, create_app_detector, is_specialized_app};