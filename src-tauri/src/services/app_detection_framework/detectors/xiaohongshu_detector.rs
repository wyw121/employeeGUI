use async_trait::async_trait;
use anyhow::Result;
use tracing::{info, debug, warn};

use crate::services::adb_shell_session::AdbShellSession;
use super::super::core::{
    AppDetector, BaseAppDetector, DetectionResult, AppLaunchState, 
    DetectionConfig, DetectionKeywords
};

/// 小红书应用检测器
/// 专门针对小红书应用的状态检测逻辑
pub struct XiaohongshuDetector {
    base: BaseAppDetector,
}

impl XiaohongshuDetector {
    pub fn new(shell_session: AdbShellSession) -> Self {
        let mut base = BaseAppDetector::new(
            "com.xingin.xhs".to_string(),
            "小红书".to_string(),
            shell_session,
        );
        
        // 设置小红书专用配置
        base = base.with_config(Self::create_config());
        
        Self { base }
    }
    
    /// 创建小红书专用检测配置
    fn create_config() -> DetectionConfig {
        DetectionConfig {
            max_wait_time: std::time::Duration::from_secs(45),
            check_interval: std::time::Duration::from_millis(1500),
            splash_timeout: std::time::Duration::from_secs(15),
            ui_load_timeout: std::time::Duration::from_secs(20),
            permission_timeout: std::time::Duration::from_secs(25),
            network_timeout: std::time::Duration::from_secs(30),
            auto_handle_permissions: true,
            skip_advertisements: true,
            max_retries: 3,
            detection_keywords: DetectionKeywords {
                homepage_indicators: vec![
                    "首页".to_string(), "发现".to_string(), "购物".to_string(),
                    "消息".to_string(), "我".to_string(), "关注".to_string(),
                    "推荐".to_string(), "附近".to_string(), 
                    "com.xingin.xhs:id/tab_".to_string(),
                    "TabLayout".to_string(), "BottomNavigationView".to_string(),
                ],
                splash_indicators: vec![
                    "小红书".to_string(), "正在加载".to_string(), "Loading".to_string(),
                    "启动中".to_string(), "欢迎使用小红书".to_string(),
                    "REDsplash".to_string(), "SplashActivity".to_string(),
                ],
                loading_indicators: vec![
                    "加载中".to_string(), "正在加载".to_string(), "Loading".to_string(),
                    "内容加载中".to_string(), "数据刷新中".to_string(),
                ],
                permission_indicators: vec![
                    "允许".to_string(), "拒绝".to_string(), "权限".to_string(),
                    "位置信息".to_string(), "定位".to_string(), "相机".to_string(),
                    "麦克风".to_string(), "存储".to_string(), "通知".to_string(),
                    "联系人".to_string(), "Allow".to_string(), "Deny".to_string(),
                ],
                advertisement_indicators: vec![
                    "广告".to_string(), "跳过".to_string(), "Skip".to_string(),
                    "关闭".to_string(), "Close".to_string(), "Ad".to_string(),
                    "推广".to_string(), "Sponsored".to_string(),
                ],
                ..DetectionKeywords::default()
            },
        }
    }
    
    /// 小红书专用的首页检测逻辑
    async fn check_xiaohongshu_homepage(&self, ui_content: &str) -> bool {
        // 检查底部导航标识
        let has_bottom_nav = ui_content.contains("首页") || 
                            ui_content.contains("发现") || 
                            ui_content.contains("购物") ||
                            ui_content.contains("消息") ||
                            ui_content.contains("我");

        // 检查顶部标签栏
        let has_top_tabs = ui_content.contains("关注") || 
                          ui_content.contains("推荐") || 
                          ui_content.contains("附近");

        // 检查关键UI元素
        let has_navigation_elements = ui_content.contains("com.xingin.xhs:id/") && 
                                    (ui_content.contains("TabLayout") || 
                                     ui_content.contains("BottomNavigationView") ||
                                     ui_content.contains("tab_"));

        // 检查内容区域
        let has_content = ui_content.contains("RecyclerView") ||
                         ui_content.contains("ListView") ||
                         ui_content.contains("ScrollView");

        debug!("🔍 小红书首页检测 - 底部导航: {}, 顶部标签: {}, UI元素: {}, 内容区域: {}", 
               has_bottom_nav, has_top_tabs, has_navigation_elements, has_content);

        // 必须有底部导航和UI元素，其他作为加分项
        has_bottom_nav && has_navigation_elements
    }
    
    /// 检测是否在小红书启动画面
    async fn check_splash_screen(&self, ui_content: &str) -> bool {
        let splash_indicators = &self.base.config.detection_keywords.splash_indicators;
        
        let is_splash = splash_indicators.iter().any(|indicator| ui_content.contains(indicator)) ||
                       ui_content.contains("SplashActivity") ||
                       ui_content.contains("启动页") ||
                       (ui_content.contains("小红书") && !ui_content.contains("首页"));
        
        if is_splash {
            debug!("🎬 检测到小红书启动画面");
        }
        
        is_splash
    }
    
    /// 检测广告页面
    async fn check_advertisement(&self, ui_content: &str) -> bool {
        let ad_indicators = &self.base.config.detection_keywords.advertisement_indicators;
        
        let is_ad = ad_indicators.iter().any(|indicator| ui_content.contains(indicator)) ||
                   ui_content.contains("AdActivity") ||
                   ui_content.contains("广告页") ||
                   (ui_content.contains("跳过") && ui_content.contains("秒"));
        
        if is_ad {
            debug!("📺 检测到小红书广告页面");
        }
        
        is_ad
    }
    
    /// 自动处理小红书权限弹窗
    async fn handle_xiaohongshu_permissions(&self) -> Result<bool> {
        info!("🔐 尝试自动处理小红书权限弹窗");
        
        // 获取当前UI
        let ui_content = self.base.shell_session
            .execute_command("uiautomator dump /data/local/tmp/ui.xml && cat /data/local/tmp/ui.xml")
            .await?;
        
        // 查找"允许"按钮并点击
        if ui_content.contains("允许") || ui_content.contains("Allow") {
            // 尝试点击允许按钮的常见坐标区域
            let allow_coordinates = vec![
                (600, 800),   // 右下角允许按钮
                (540, 750),   // 中间偏右
                (500, 850),   // 底部中间
            ];
            
            for (x, y) in allow_coordinates {
                if let Ok(_) = self.base.shell_session
                    .execute_command(&format!("input tap {} {}", x, y))
                    .await 
                {
                    info!("✅ 已点击允许按钮坐标: ({}, {})", x, y);
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    return Ok(true);
                }
            }
        }
        
        Ok(false)
    }
}

#[async_trait]
impl AppDetector for XiaohongshuDetector {
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
        info!("🚀 开始等待小红书应用就绪");
        self.base.generic_wait_for_ready(self).await
    }
    
    async fn analyze_app_state(&self, ui_content: &str, _current_activity: &Option<String>) -> AppLaunchState {
        debug!("🔍 分析小红书应用状态 (UI内容长度: {}字符)", ui_content.len());
        
        // 检查错误状态
        if ui_content.is_empty() {
            return AppLaunchState::Error("UI内容为空".to_string());
        }
        
        // 检查是否已就绪（首页）
        if self.check_xiaohongshu_homepage(ui_content).await {
            info!("✅ 小红书已进入首页状态");
            return AppLaunchState::Ready;
        }
        
        // 检查各种中间状态
        if self.has_permission_dialog(ui_content).await {
            info!("🔐 检测到权限弹窗");
            return AppLaunchState::PermissionDialog;
        }
        
        if self.check_advertisement(ui_content).await {
            info!("📺 检测到广告页面");
            return AppLaunchState::Advertisement;
        }
        
        if self.check_splash_screen(ui_content).await {
            info!("🎬 检测到启动画面");
            return AppLaunchState::SplashScreen;
        }
        
        if self.needs_login(ui_content).await {
            info!("🔑 需要用户登录");
            return AppLaunchState::LoginRequired;
        }
        
        if !self.check_network_status(ui_content).await {
            info!("📶 网络连接检查中");
            return AppLaunchState::NetworkCheck;
        }
        
        // 默认为加载状态
        info!("⏳ 小红书正在加载中");
        AppLaunchState::Loading
    }
    
    async fn is_homepage_ready(&self, ui_content: &str) -> bool {
        self.check_xiaohongshu_homepage(ui_content).await
    }
    
    async fn is_splash_screen(&self, ui_content: &str) -> bool {
        self.check_splash_screen(ui_content).await
    }
    
    async fn handle_permission_dialog(&self) -> Result<bool> {
        if self.base.config.auto_handle_permissions {
            self.handle_xiaohongshu_permissions().await
        } else {
            Ok(false)
        }
    }
}