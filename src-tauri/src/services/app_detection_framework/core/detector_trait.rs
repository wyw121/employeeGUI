use async_trait::async_trait;
use std::time::Duration;
use anyhow::Result;
use super::detection_result::{DetectionResult, AppLaunchState};
use super::detection_config::DetectionConfig;
use crate::services::adb_shell_session::AdbShellSession;

/// 应用状态检测器的核心trait
/// 所有具体的应用检测器都需要实现这个接口
#[async_trait]
pub trait AppDetector: Send + Sync {
    /// 获取应用包名
    fn package_name(&self) -> &str;
    
    /// 获取应用显示名称
    fn app_name(&self) -> &str;
    
    /// 获取检测配置
    fn detection_config(&self) -> DetectionConfig;
    
    /// 等待应用完全就绪
    /// 这是主要的检测方法，会循环检测直到应用就绪或超时
    async fn wait_for_app_ready(&self) -> Result<DetectionResult>;
    
    /// 分析当前应用状态
    /// 根据UI内容和Activity信息判断应用当前状态
    async fn analyze_app_state(&self, ui_content: &str, current_activity: &Option<String>) -> AppLaunchState;
    
    /// 检测应用是否在首页/主要功能页面
    /// 每个应用需要实现自己的首页检测逻辑
    async fn is_homepage_ready(&self, ui_content: &str) -> bool;
    
    /// 检测是否在启动画面
    async fn is_splash_screen(&self, ui_content: &str) -> bool {
        // 默认实现 - 通用启动画面检测
        let splash_indicators = [
            "正在加载", "Loading", "启动中", "加载中",
            "欢迎", "Welcome", "请稍等", "Please wait"
        ];
        
        splash_indicators.iter().any(|&indicator| ui_content.contains(indicator))
    }
    
    /// 检测是否有权限弹窗
    async fn has_permission_dialog(&self, ui_content: &str) -> bool {
        // 默认实现 - 通用权限弹窗检测
        let permission_indicators = [
            "允许", "拒绝", "权限", "位置信息", "定位",
            "相机", "麦克风", "存储", "通知", "联系人",
            "Allow", "Deny", "Permission", "Location",
            "Camera", "Microphone", "Storage", "Contacts"
        ];
        
        permission_indicators.iter().any(|&indicator| ui_content.contains(indicator)) &&
        (ui_content.contains("允许") || ui_content.contains("Allow"))
    }
    
    /// 检测是否需要登录
    async fn needs_login(&self, ui_content: &str) -> bool {
        // 默认实现 - 通用登录检测
        let login_indicators = [
            "登录", "Login", "登陆", "Sign in", "账号", "Account",
            "用户名", "密码", "Password", "手机号", "验证码"
        ];
        
        login_indicators.iter().any(|&indicator| ui_content.contains(indicator))
    }
    
    /// 检测网络连接状态
    async fn check_network_status(&self, ui_content: &str) -> bool {
        // 默认实现 - 通用网络检测
        let network_indicators = [
            "网络连接", "Network", "无网络", "No network",
            "连接失败", "Connection failed", "检查网络", "Check network",
            "网络异常", "Network error", "请检查网络", "Please check network"
        ];
        
        !network_indicators.iter().any(|&indicator| ui_content.contains(indicator))
    }
    
    /// 自动处理权限弹窗（可选实现）
    async fn handle_permission_dialog(&self) -> Result<bool> {
        // 默认不处理，子类可以覆盖
        Ok(false)
    }
    
    /// 获取ADB Shell会话（由基础检测器提供）
    fn get_shell_session(&self) -> &AdbShellSession;
    
    /// 快速状态检查（用于轮询）
    async fn quick_state_check(&self) -> Result<AppLaunchState> {
        // 获取当前UI内容
        let ui_content = match self.get_shell_session().execute_command("uiautomator dump /data/local/tmp/ui.xml && cat /data/local/tmp/ui.xml").await {
            Ok(content) => content,
            Err(_) => return Ok(AppLaunchState::Error("UI内容获取失败".to_string())),
        };

        // 获取当前Activity
        let current_activity = self.get_shell_session()
            .execute_command("dumpsys activity activities | grep mResumedActivity")
            .await
            .ok();

        // 分析应用状态
        Ok(self.analyze_app_state(&ui_content, &current_activity).await)
    }
}

/// 应用检测器的基础实现
/// 提供通用的检测逻辑，具体应用检测器可以继承使用
pub struct BaseAppDetector {
    pub package_name: String,
    pub app_name: String,
    pub shell_session: AdbShellSession,
    pub config: DetectionConfig,
}

impl BaseAppDetector {
    pub fn new(package_name: String, app_name: String, shell_session: AdbShellSession) -> Self {
        let config = DetectionConfig::default();
        Self {
            package_name,
            app_name,
            shell_session,
            config,
        }
    }
    
    pub fn with_config(mut self, config: DetectionConfig) -> Self {
        self.config = config;
        self
    }
    
    /// 通用的应用就绪等待逻辑
    pub async fn generic_wait_for_ready<T: AppDetector>(&self, detector: &T) -> Result<DetectionResult> {
        let start_time = std::time::Instant::now();
        let config = detector.detection_config();
        let mut check_count = 0;
        let mut state_history = Vec::new();
        
        tracing::info!("🔍 开始检测应用状态: {} ({})", detector.app_name(), detector.package_name());
        
        loop {
            check_count += 1;
            let current_state = detector.quick_state_check().await?;
            state_history.push(current_state.clone());
            
            tracing::debug!("📊 状态检测 #{}: {:?}", check_count, current_state);
            
            // 检查是否已就绪
            if matches!(current_state, AppLaunchState::Ready) {
                let elapsed = start_time.elapsed();
                tracing::info!("✅ 应用已就绪: {} (耗时: {:?}, 检测次数: {})", detector.app_name(), elapsed, check_count);
                
                return Ok(DetectionResult {
                    state: current_state,
                    is_functional: true,
                    message: format!("应用已完全就绪 (检测{}次)", check_count),
                    checked_elements: check_count,
                    total_checks: check_count,
                    elapsed_time: elapsed,
                    state_history,
                });
            }
            
            // 检查错误状态
            if let AppLaunchState::Error(error_msg) = current_state.clone() {
                let elapsed = start_time.elapsed();
                tracing::error!("❌ 应用状态检测出错: {} - {}", detector.app_name(), error_msg);
                
                return Ok(DetectionResult {
                    state: current_state,
                    is_functional: false,
                    message: format!("检测出错: {}", error_msg),
                    checked_elements: check_count,
                    total_checks: check_count,
                    elapsed_time: elapsed,
                    state_history,
                });
            }
            
            // 检查超时
            if start_time.elapsed() > config.max_wait_time {
                let elapsed = start_time.elapsed();
                let current_state_str = format!("{:?}", current_state);
                tracing::warn!("⏱️ 应用状态检测超时: {} (耗时: {:?})", detector.app_name(), elapsed);
                
                return Ok(DetectionResult {
                    state: current_state,
                    is_functional: false,
                    message: format!("检测超时，当前状态: {}", current_state_str),
                    checked_elements: check_count,
                    total_checks: check_count,
                    elapsed_time: elapsed,
                    state_history,
                });
            }
            
            // 等待下次检测
            tokio::time::sleep(config.check_interval).await;
        }
    }
}