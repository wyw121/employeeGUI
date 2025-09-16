use async_trait::async_trait;
use anyhow::Result;
use tracing::{info, debug};

use crate::services::adb_shell_session::AdbShellSession;
use super::super::core::{
    AppDetector, BaseAppDetector, DetectionResult, AppLaunchState, 
    DetectionConfig, DetectionKeywords
};

/// 微信应用检测器
/// 专门针对微信应用的状态检测逻辑
pub struct WechatDetector {
    base: BaseAppDetector,
}

impl WechatDetector {
    pub fn new(shell_session: AdbShellSession) -> Self {
        let mut base = BaseAppDetector::new(
            "com.tencent.mm".to_string(),
            "微信".to_string(),
            shell_session,
        );
        
        base = base.with_config(Self::create_config());
        
        Self { base }
    }
    
    /// 创建微信专用检测配置
    fn create_config() -> DetectionConfig {
        DetectionConfig {
            max_wait_time: std::time::Duration::from_secs(30),
            check_interval: std::time::Duration::from_millis(1000),
            splash_timeout: std::time::Duration::from_secs(8),
            ui_load_timeout: std::time::Duration::from_secs(12),
            permission_timeout: std::time::Duration::from_secs(15),
            network_timeout: std::time::Duration::from_secs(20),
            auto_handle_permissions: true,
            skip_advertisements: false, // 微信一般没有广告
            max_retries: 2,
            detection_keywords: DetectionKeywords {
                homepage_indicators: vec![
                    "微信".to_string(), "WeChat".to_string(), "聊天".to_string(),
                    "通讯录".to_string(), "发现".to_string(), "我".to_string(),
                    "消息".to_string(), "com.tencent.mm:id/".to_string(),
                    "TabWidget".to_string(), "MainTabUI".to_string(),
                ],
                splash_indicators: vec![
                    "微信".to_string(), "WeChat".to_string(), "正在加载".to_string(),
                    "Loading".to_string(), "SplashActivity".to_string(),
                    "启动中".to_string(),
                ],
                loading_indicators: vec![
                    "正在加载".to_string(), "Loading".to_string(), "数据同步中".to_string(),
                    "消息同步中".to_string(), "联系人同步中".to_string(),
                ],
                ..DetectionKeywords::default()
            },
        }
    }
    
    /// 微信专用的首页检测逻辑
    async fn check_wechat_homepage(&self, ui_content: &str) -> bool {
        // 检查底部四个主要标签
        let has_main_tabs = (ui_content.contains("微信") || ui_content.contains("聊天")) &&
                           ui_content.contains("通讯录") &&
                           ui_content.contains("发现") &&
                           ui_content.contains("我");

        // 检查微信特有的UI元素
        let has_wechat_elements = ui_content.contains("com.tencent.mm:id/") ||
                                 ui_content.contains("TabWidget") ||
                                 ui_content.contains("MainTabUI");

        // 检查聊天列表
        let has_chat_list = ui_content.contains("ListView") ||
                           ui_content.contains("RecyclerView") ||
                           ui_content.contains("对话");

        debug!("🔍 微信首页检测 - 主标签: {}, 微信元素: {}, 聊天列表: {}", 
               has_main_tabs, has_wechat_elements, has_chat_list);

        has_main_tabs && has_wechat_elements
    }
    
    /// 检测是否在微信启动画面
    async fn check_wechat_splash(&self, ui_content: &str) -> bool {
        let is_splash = ui_content.contains("SplashActivity") ||
                       ui_content.contains("微信启动") ||
                       (ui_content.contains("微信") && !ui_content.contains("聊天") && !ui_content.contains("通讯录"));
        
        if is_splash {
            debug!("🎬 检测到微信启动画面");
        }
        
        is_splash
    }
    
    /// 检测是否需要登录
    async fn check_wechat_login(&self, ui_content: &str) -> bool {
        let needs_login = ui_content.contains("登录") ||
                         ui_content.contains("手机号") ||
                         ui_content.contains("密码") ||
                         ui_content.contains("验证码") ||
                         ui_content.contains("LoginUI");
        
        if needs_login {
            debug!("🔑 检测到微信需要登录");
        }
        
        needs_login
    }
}

#[async_trait]
impl AppDetector for WechatDetector {
    fn package_name(&self) -> &str {
        &self.base.package_name
    }
    
    fn app_name(&self) -> &str {
        &self.base.app_name
    }
    
    fn detection_config(&self) -> DetectionConfig {
        self.base.config.clone()
    }
    
    fn get_shell_session(&self) -> &AdbShellSession {
        &self.base.shell_session
    }
    
    async fn wait_for_app_ready(&self) -> Result<DetectionResult> {
        info!("🚀 开始等待微信应用就绪");
        self.base.generic_wait_for_ready(self).await
    }
    
    async fn analyze_app_state(&self, ui_content: &str, _current_activity: &Option<String>) -> AppLaunchState {
        debug!("🔍 分析微信应用状态 (UI内容长度: {}字符)", ui_content.len());
        
        if ui_content.is_empty() {
            return AppLaunchState::Error("UI内容为空".to_string());
        }
        
        // 检查是否已就绪（首页）
        if self.check_wechat_homepage(ui_content).await {
            info!("✅ 微信已进入首页状态");
            return AppLaunchState::Ready;
        }
        
        // 检查各种状态
        if self.has_permission_dialog(ui_content).await {
            info!("🔐 检测到权限弹窗");
            return AppLaunchState::PermissionDialog;
        }
        
        if self.check_wechat_login(ui_content).await {
            info!("🔑 需要用户登录");
            return AppLaunchState::LoginRequired;
        }
        
        if self.check_wechat_splash(ui_content).await {
            info!("🎬 检测到启动画面");
            return AppLaunchState::SplashScreen;
        }
        
        if !self.check_network_status(ui_content).await {
            info!("📶 网络连接检查中");
            return AppLaunchState::NetworkCheck;
        }
        
        // 默认为加载状态
        info!("⏳ 微信正在加载中");
        AppLaunchState::Loading
    }
    
    async fn is_homepage_ready(&self, ui_content: &str) -> bool {
        self.check_wechat_homepage(ui_content).await
    }
    
    async fn is_splash_screen(&self, ui_content: &str) -> bool {
        self.check_wechat_splash(ui_content).await
    }
}