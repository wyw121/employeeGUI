// 小红书自动化模块 - 模块化重构版本
//
// 本模块采用 DDD (领域驱动设计) 原则进行重构，将原本臃肿的单文件
// 分解为职责清晰、高内聚低耦合的子模块。
//
// 模块结构：
// - types: 核心类型定义和枚举
// - core: 自动化器核心结构体和基础功能
// - app_status: 应用状态管理和检测
// - navigation: 页面导航和界面操作
// - page_recognition: 页面识别和解析
// - screen_utils: 屏幕适配和坐标工具
// - follow_automation: 自动关注核心业务逻辑

pub mod types;
pub mod core;
pub mod app_status;
pub mod navigation;
pub mod page_recognition;
pub mod screen_utils;
pub mod follow_automation;

// 重新导出主要类型和结构体，保持向后兼容
pub use types::*;
pub use core::XiaohongshuAutomator;

// 重新导出扩展 trait，便于使用（按需导入以减少警告）
// 外部使用时需要显式导入需要的 trait
// pub use app_status::AppStatusExt;
// pub use navigation::NavigationExt;
// pub use page_recognition::PageRecognitionExt;
// pub use screen_utils::ScreenUtilsExt;
// pub use follow_automation::FollowAutomationExt;

/// 创建小红书自动化器实例的便捷函数
pub fn create_automator(device_id: String) -> XiaohongshuAutomator {
    XiaohongshuAutomator::new(device_id)
}

/// 模块版本信息
pub const MODULE_VERSION: &str = "2.0.0";
pub const MODULE_NAME: &str = "xiaohongshu_automator";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_automator() {
        let device_id = "test_device".to_string();
        let automator = create_automator(device_id.clone());
        assert_eq!(automator.device_id, device_id);
    }

    #[test]
    fn test_module_info() {
        assert_eq!(MODULE_VERSION, "2.0.0");
        assert_eq!(MODULE_NAME, "xiaohongshu_automator");
    }
}