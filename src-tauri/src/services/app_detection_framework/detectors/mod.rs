//! 应用检测器实现模块
//! 
//! 包含各个具体应用的检测器实现：
//! - `wechat_detector`: 微信专用检测器  
//! - `generic_detector`: 通用检测器
//! 
//! 每个检测器都实现了 `AppDetector` trait，提供应用特定的状态检测逻辑

pub mod wechat_detector;
pub mod generic_detector;
pub mod xiaohongshu_detector;

// TODO: 添加更多应用的专用检测器
// pub mod qq_detector;
// pub mod douyin_detector;
// pub mod taobao_detector;
// pub mod alipay_detector;

// 重新导出检测器类型
pub use wechat_detector::WechatDetector;
pub use generic_detector::GenericDetector;
pub use xiaohongshu_detector::XiaohongshuDetector;