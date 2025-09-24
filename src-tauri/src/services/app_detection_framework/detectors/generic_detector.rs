use async_trait::async_trait;
use anyhow::Result;
use tracing::{info, debug};

use crate::services::adb_shell_session::AdbShellSession;
use super::super::core::{
    AppDetector, BaseAppDetector, DetectionResult, AppLaunchState, DetectionConfig
};

/// 通用应用检测器
/// 用于没有专门实现的应用的基础检测
pub struct GenericDetector {
    base: BaseAppDetector,
}

impl GenericDetector {
    pub fn new(package_name: String, app_name: String, shell_session: AdbShellSession) -> Self {
        let base = BaseAppDetector::new(package_name, app_name, shell_session);
        Self { base }
    }
    
    pub fn with_config(mut self, config: DetectionConfig) -> Self {
        self.base = self.base.with_config(config);
        self
    }
    
    /// 通用的首页检测逻辑
    async fn check_generic_homepage(&self, ui_content: &str) -> bool {
        // 基于通用指标判断是否在主页
        let homepage_indicators = &self.base.config.detection_keywords.homepage_indicators;
        
        // 检查是否包含首页标识符
        let has_homepage_indicators = homepage_indicators.iter()
            .any(|indicator| ui_content.contains(indicator));
        
        // 检查是否有主要UI元素
        let has_main_ui = ui_content.contains("RecyclerView") ||
                         ui_content.contains("ListView") ||
                         ui_content.contains("ScrollView") ||
                         ui_content.contains("ViewPager") ||
                         ui_content.contains("TabLayout");
        
        // 检查是否有导航元素
        let has_navigation = ui_content.contains("ActionBar") ||
                           ui_content.contains("Toolbar") ||
                           ui_content.contains("BottomNavigationView") ||
                           ui_content.contains("TabWidget");
        
        // 排除明显的非主页状态
        let not_loading = !ui_content.contains("正在加载") && !ui_content.contains("Loading");
        let not_splash = !ui_content.contains("SplashActivity") && !ui_content.contains("启动");
        
        debug!("🔍 通用首页检测 - 标识符: {}, 主UI: {}, 导航: {}, 非加载: {}, 非启动: {}", 
               has_homepage_indicators, has_main_ui, has_navigation, not_loading, not_splash);
        
        // 需要有基本的UI结构且不在加载或启动状态
        (has_homepage_indicators || (has_main_ui && has_navigation)) && not_loading && not_splash
    }
    
    /// 通用的启动画面检测
    async fn check_generic_splash(&self, ui_content: &str) -> bool {
        let splash_indicators = &self.base.config.detection_keywords.splash_indicators;
        
        let is_splash = splash_indicators.iter().any(|indicator| ui_content.contains(indicator)) ||
                       ui_content.contains("SplashActivity") ||
                       ui_content.contains("WelcomeActivity") ||
                       ui_content.contains("IntroActivity");
        
        if is_splash {
            debug!("🎬 检测到通用启动画面");
        }
        
        is_splash
    }
    
    /// 通用的加载状态检测
    async fn check_generic_loading(&self, ui_content: &str) -> bool {
        let loading_indicators = &self.base.config.detection_keywords.loading_indicators;
        
        let is_loading = loading_indicators.iter().any(|indicator| ui_content.contains(indicator)) ||
                        ui_content.contains("ProgressBar") ||
                        ui_content.contains("进度") ||
                        ui_content.contains("Progress");
        
        if is_loading {
            debug!("⏳ 检测到通用加载状态");
        }
        
        is_loading
    }
}

#[async_trait]
impl AppDetector for GenericDetector {
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
        info!("🚀 开始等待应用就绪: {} ({})", self.app_name(), self.package_name());
        self.base.generic_wait_for_ready(self).await
    }
    
    async fn analyze_app_state(&self, ui_content: &str, _current_activity: &Option<String>) -> AppLaunchState {
        debug!("🔍 分析应用状态: {} (UI内容长度: {}字符)", self.app_name(), ui_content.len());
        
        if ui_content.is_empty() {
            return AppLaunchState::Error("UI内容为空".to_string());
        }
        
        // 检查是否已就绪
        if self.check_generic_homepage(ui_content).await {
            info!("✅ {} 已进入就绪状态", self.app_name());
            return AppLaunchState::Ready;
        }
        
        // 检查各种状态
        if self.has_permission_dialog(ui_content).await {
            info!("🔐 {} 检测到权限弹窗", self.app_name());
            return AppLaunchState::PermissionDialog;
        }
        
        if self.needs_login(ui_content).await {
            info!("🔑 {} 需要用户登录", self.app_name());
            return AppLaunchState::LoginRequired;
        }
        
        if self.check_generic_splash(ui_content).await {
            info!("🎬 {} 检测到启动画面", self.app_name());
            return AppLaunchState::SplashScreen;
        }
        
        if self.check_generic_loading(ui_content).await {
            info!("⏳ {} 正在加载中", self.app_name());
            return AppLaunchState::Loading;
        }
        
        if !self.check_network_status(ui_content).await {
            info!("📶 {} 网络连接检查中", self.app_name());
            return AppLaunchState::NetworkCheck;
        }
        
        // 默认为加载状态
        info!("⏳ {} 状态未明确，默认为加载中", self.app_name());
        AppLaunchState::Loading
    }
    
    async fn is_homepage_ready(&self, ui_content: &str) -> bool {
        self.check_generic_homepage(ui_content).await
    }
    
    async fn is_splash_screen(&self, ui_content: &str) -> bool {
        self.check_generic_splash(ui_content).await
    }
    
    async fn handle_permission_dialog(&self) -> Result<bool> {
        if !self.base.config.auto_handle_permissions {
            return Ok(false);
        }
        
        info!("🔐 尝试自动处理 {} 的权限弹窗", self.app_name());
        
        // 通用的权限处理逻辑
        let ui_content = self.base.shell_session
            .execute_command("uiautomator dump /data/local/tmp/ui.xml && cat /data/local/tmp/ui.xml")
            .await?;
        
        if ui_content.contains("允许") || ui_content.contains("Allow") {
            // 尝试点击允许按钮的常见位置
            let allow_coordinates = vec![
                (600, 800),   // 右下角
                (540, 750),   // 中间偏右
                (500, 850),   // 底部中间
                (400, 900),   // 底部偏左
            ];
            
            for (x, y) in allow_coordinates {
                if let Ok(_) = self.base.shell_session.tap(x, y).await {
                    info!("✅ {} 已点击允许按钮坐标: ({}, {})", self.app_name(), x, y);
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    return Ok(true);
                }
            }
        }
        
        Ok(false)
    }
}