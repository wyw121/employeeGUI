//! 应用检测框架 (App Detection Framework)
//! 
//! 这是一个可扩展的应用状态检测框架，用于检测 Android 应用的启动状态和就绪情况。
//! 
//! ## 核心特性
//! 
//! - **可扩展架构**: 基于 trait 的设计，支持为不同应用实现专用检测器
//! - **通用检测能力**: 提供基础的应用状态检测功能，适用于大多数应用  
//! - **配置化管理**: 支持为每个应用配置专用的检测参数
//! - **异步支持**: 基于 tokio 的异步实现，性能优异
//! - **类型安全**: 完整的 Rust 类型系统支持
//! 
//! ## 架构设计
//! 
//! ```
//! AppDetectionFramework/
//! ├── core/                    # 核心抽象
//! │   ├── detector_trait       # 检测器接口定义
//! │   ├── detection_result     # 结果类型定义
//! │   └── detection_config     # 配置管理
//! ├── detectors/               # 具体检测器实现
//! │   ├── xiaohongshu_detector # 小红书检测器
//! │   ├── wechat_detector      # 微信检测器
//! │   └── generic_detector     # 通用检测器
//! └── factory/                 # 检测器工厂
//!     └── detector_factory     # 工厂实现
//! ```
//! 
//! ## 使用示例
//! 
//! ### 基本使用
//! 
//! ```rust
//! use app_detection_framework::factory::create_app_detector;
//! use crate::services::adb_shell_session::AdbShellSession;
//! 
//! let shell_session = AdbShellSession::new("device_id".to_string(), "adb_path".to_string());
//! let detector = create_app_detector("com.xingin.xhs", "小红书", shell_session);
//! 
//! let result = detector.wait_for_app_ready().await?;
//! if result.is_functional {
//!     println!("应用已就绪: {}", result.message);
//! }
//! ```
//! 
//! ### 使用工厂管理检测器
//! 
//! ```rust
//! use app_detection_framework::factory::DetectorFactory;
//! 
//! let factory = DetectorFactory::new();
//! let detector = factory.create_detector("com.tencent.mm", "微信", shell_session);
//! 
//! // 检查应用状态
//! let state = detector.quick_state_check().await?;
//! println!("应用当前状态: {:?}", state);
//! ```
//! 
//! ## 支持的应用
//! 
//! - **小红书** (com.xingin.xhs): 完整的专用检测器，支持首页识别、权限处理等
//! - **微信** (com.tencent.mm): 专用检测器，支持聊天界面检测
//! - **通用应用**: 使用通用检测器，支持基础的状态检测
//! 
//! ## 扩展新应用
//! 
//! 要为新应用添加专用检测器，需要：
//! 
//! 1. 在 `detectors/` 目录下创建新的检测器文件
//! 2. 实现 `AppDetector` trait
//! 3. 在工厂中注册新的检测器
//! 
//! ```rust
//! use async_trait::async_trait;
//! use super::super::core::{AppDetector, BaseAppDetector, DetectionResult, AppLaunchState, DetectionConfig};
//! 
//! pub struct CustomAppDetector {
//!     base: BaseAppDetector,
//! }
//! 
//! #[async_trait]
//! impl AppDetector for CustomAppDetector {
//!     // 实现所需的方法
//! }
//! ```

pub mod core;
pub mod detectors;
pub mod factory;

// 重新导出主要的公共接口
pub use core::{
    AppDetector, BaseAppDetector,
    DetectionResult, AppLaunchState, DetectionStats,
    DetectionConfig, DetectionKeywords, AppConfigManager
};

pub use detectors::{
    WechatDetector, GenericDetector
};

pub use factory::{
    DetectorFactory, DetectorRegistry, create_app_detector, is_specialized_app
};