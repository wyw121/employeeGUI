use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio::time::{sleep, timeout};
use tracing::{debug, error, info, warn};

use super::adb_shell_session::AdbShellSession;

/// 应用启动状态枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AppLaunchState {
    NotStarted,           // 未启动
    Starting,            // 启动中
    SplashScreen,        // 启动画面
    PermissionDialog,    // 权限弹窗
    NetworkCheck,        // 网络检查
    LoginRequired,       // 需要登录
    Loading,            // 加载中
    Ready,              // 准备就绪（可操作）
    Error(String),      // 启动失败
}

/// 应用状态检测结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AppStateResult {
    pub state: AppLaunchState,
    pub current_activity: Option<String>,
    pub ui_elements: Vec<String>,
    pub is_functional: bool,
    pub detection_time_ms: u64,
    pub message: String,
}

/// 应用状态检测器
pub struct AppStateDetector {
    shell_session: AdbShellSession,
    package_name: String,
    detection_config: DetectionConfig,
}

/// 检测配置
#[derive(Debug, Clone)]
pub struct DetectionConfig {
    pub max_wait_time: Duration,     // 最大等待时间
    pub check_interval: Duration,    // 检查间隔
    pub splash_timeout: Duration,    // 启动画面超时时间
    pub ui_load_timeout: Duration,   // UI加载超时时间
}

impl Default for DetectionConfig {
    fn default() -> Self {
        Self {
            max_wait_time: Duration::from_secs(30),
            check_interval: Duration::from_millis(1000),
            splash_timeout: Duration::from_secs(10),
            ui_load_timeout: Duration::from_secs(15),
        }
    }
}

impl AppStateDetector {
    pub fn new(shell_session: AdbShellSession, package_name: String) -> Self {
        Self {
            shell_session,
            package_name,
            detection_config: DetectionConfig::default(),
        }
    }

    pub fn with_config(mut self, config: DetectionConfig) -> Self {
        self.detection_config = config;
        self
    }

    /// 等待应用启动并进入可操作状态
    pub async fn wait_for_app_ready(&self) -> Result<AppStateResult> {
        info!("🔍 开始检测应用启动状态: {}", self.package_name);
        let start_time = Instant::now();

        // 使用超时机制
        let result = timeout(
            self.detection_config.max_wait_time,
            self.detect_app_state_loop()
        ).await;

        match result {
            Ok(state_result) => {
                let detection_time = start_time.elapsed().as_millis() as u64;
                info!("✅ 应用状态检测完成: {:?} ({}ms)", state_result.state, detection_time);
                Ok(AppStateResult {
                    detection_time_ms: detection_time,
                    ..state_result
                })
            }
            Err(_) => {
                let detection_time = start_time.elapsed().as_millis() as u64;
                warn!("⏰ 应用启动检测超时: {}ms", detection_time);
                Ok(AppStateResult {
                    state: AppLaunchState::Error("应用启动超时".to_string()),
                    current_activity: None,
                    ui_elements: vec![],
                    is_functional: false,
                    detection_time_ms: detection_time,
                    message: "应用启动检测超时，可能卡在启动画面或权限弹窗".to_string(),
                })
            }
        }
    }

    /// 检测应用状态的主循环
    async fn detect_app_state_loop(&self) -> AppStateResult {
        let mut consecutive_ready_checks = 0;
        let required_stable_checks = 3; // 需要连续3次检查都是ready状态

        loop {
            let state_result = self.detect_current_state().await;
            
            match &state_result.state {
                AppLaunchState::Ready => {
                    consecutive_ready_checks += 1;
                    if consecutive_ready_checks >= required_stable_checks {
                        info!("✅ 应用已稳定进入可操作状态");
                        return state_result;
                    } else {
                        debug!("🔄 应用接近就绪状态 ({}/{})", consecutive_ready_checks, required_stable_checks);
                    }
                }
                AppLaunchState::Error(_) => {
                    error!("❌ 检测到应用启动错误: {}", state_result.message);
                    return state_result;
                }
                AppLaunchState::PermissionDialog => {
                    info!("🔐 检测到权限弹窗，尝试处理...");
                    if let Err(e) = self.handle_permission_dialog().await {
                        warn!("权限弹窗处理失败: {}", e);
                    }
                    consecutive_ready_checks = 0;
                }
                _ => {
                    debug!("🔄 当前状态: {:?}", state_result.state);
                    consecutive_ready_checks = 0;
                }
            }

            sleep(self.detection_config.check_interval).await;
        }
    }

    /// 检测当前应用状态
    async fn detect_current_state(&self) -> AppStateResult {
        let detection_start = Instant::now();
        
        // 1. 检查进程是否存在
        if !self.is_process_running().await {
            return AppStateResult {
                state: AppLaunchState::NotStarted,
                current_activity: None,
                ui_elements: vec![],
                is_functional: false,
                detection_time_ms: detection_start.elapsed().as_millis() as u64,
                message: "应用进程未运行".to_string(),
            };
        }

        // 2. 获取当前Activity
        let current_activity = self.get_current_activity().await;
        
        // 3. 获取UI内容
        let ui_content = match self.get_ui_content().await {
            Ok(content) => content,
            Err(e) => {
                return AppStateResult {
                    state: AppLaunchState::Error(format!("UI获取失败: {}", e)),
                    current_activity,
                    ui_elements: vec![],
                    is_functional: false,
                    detection_time_ms: detection_start.elapsed().as_millis() as u64,
                    message: format!("无法获取UI内容: {}", e),
                };
            }
        };

        // 4. 分析UI状态
        let state = self.analyze_ui_state(&ui_content, &current_activity).await;
        let ui_elements = self.extract_key_ui_elements(&ui_content);
        let is_functional = matches!(state, AppLaunchState::Ready);

        AppStateResult {
            state: state.clone(),
            current_activity,
            ui_elements,
            is_functional,
            detection_time_ms: detection_start.elapsed().as_millis() as u64,
            message: self.get_state_message(&state),
        }
    }

    /// 分析UI状态
    async fn analyze_ui_state(&self, ui_content: &str, current_activity: &Option<String>) -> AppLaunchState {
        // 检查权限弹窗
        if self.has_permission_dialog(ui_content) {
            return AppLaunchState::PermissionDialog;
        }

        // 检查网络检查页面
        if self.has_network_check(ui_content) {
            return AppLaunchState::NetworkCheck;
        }

        // 检查登录页面
        if self.has_login_screen(ui_content) {
            return AppLaunchState::LoginRequired;
        }

        // 检查启动画面
        if self.has_splash_screen(ui_content, current_activity) {
            return AppLaunchState::SplashScreen;
        }

        // 检查加载状态
        if self.has_loading_indicators(ui_content) {
            return AppLaunchState::Loading;
        }


        // 通用就绪状态检测
        if self.is_app_ready(ui_content, current_activity) {
            AppLaunchState::Ready
        } else {
            AppLaunchState::Starting
        }
    }


    /// 检查进程是否运行
    async fn is_process_running(&self) -> bool {
        if let Ok(processes) = self.shell_session.execute_command("ps | grep com.xingin.xhs").await {
            !processes.trim().is_empty() && processes.contains(&self.package_name)
        } else {
            false
        }
    }

    /// 获取当前Activity
    async fn get_current_activity(&self) -> Option<String> {
        if let Ok(activity) = self.shell_session.execute_command("dumpsys activity activities | grep mResumedActivity").await {
            if activity.contains(&self.package_name) {
                return Some(activity.trim().to_string());
            }
        }
        None
    }

    /// 获取UI内容
    async fn get_ui_content(&self) -> Result<String> {
        self.shell_session.dump_ui().await
    }

    /// 权限弹窗检测
    fn has_permission_dialog(&self, ui_content: &str) -> bool {
        let permission_indicators = [
            "允许", "拒绝", "Permission", "权限", 
            "访问位置", "访问相机", "访问存储", "访问麦克风",
            "android.permission"
        ];
        
        permission_indicators.iter().any(|indicator| ui_content.contains(indicator))
    }

    /// 网络检查页面检测
    fn has_network_check(&self, ui_content: &str) -> bool {
        let network_indicators = [
            "网络连接", "检查网络", "网络异常", "重试", "网络设置"
        ];
        
        network_indicators.iter().any(|indicator| ui_content.contains(indicator))
    }

    /// 登录页面检测
    fn has_login_screen(&self, ui_content: &str) -> bool {
        let login_indicators = [
            "登录", "注册", "手机号", "验证码", "密码", "微信登录", "QQ登录"
        ];
        
        login_indicators.iter().any(|indicator| ui_content.contains(indicator))
    }

    /// 启动画面检测
    fn has_splash_screen(&self, ui_content: &str, current_activity: &Option<String>) -> bool {
        // 检查Activity名称
        if let Some(activity) = current_activity {
            if activity.contains("Splash") || activity.contains("Launch") {
                return true;
            }
        }

        // 检查UI特征
        let splash_indicators = [
            "loading", "Loading", "启动中", "正在加载"
        ];
        
        // 启动画面通常UI内容较少
        ui_content.len() < 2000 && splash_indicators.iter().any(|indicator| ui_content.contains(indicator))
    }

    /// 加载指示器检测
    fn has_loading_indicators(&self, ui_content: &str) -> bool {
        let loading_indicators = [
            "ProgressBar", "loading", "加载中", "Loading", "请稍候"
        ];
        
        loading_indicators.iter().any(|indicator| ui_content.contains(indicator))
    }

    /// 应用就绪状态检测
    fn is_app_ready(&self, ui_content: &str, current_activity: &Option<String>) -> bool {
        // 基本检查：UI内容丰富，有可交互元素
        let has_rich_content = ui_content.len() > 5000;
        let has_clickable_elements = ui_content.contains("clickable=\"true\"");
        let has_main_activity = current_activity.as_ref()
            .map(|a| !a.contains("Splash") && !a.contains("Launch"))
            .unwrap_or(false);

        has_rich_content && has_clickable_elements && has_main_activity
    }

    /// 处理权限弹窗
    async fn handle_permission_dialog(&self) -> Result<()> {
        info!("🔐 自动处理权限弹窗");
        
        // 尝试点击"允许"按钮的常见位置
        let allow_positions = vec![
            (270, 400),  // 通用允许按钮位置
            (200, 450),  // 备选位置
            (300, 350),  // 备选位置
        ];

        for (x, y) in allow_positions {
            if let Err(e) = self.shell_session.tap(x, y).await {
                debug!("尝试点击允许按钮失败: ({}, {}) - {}", x, y, e);
            } else {
                sleep(Duration::from_millis(1000)).await;
                
                // 检查弹窗是否消失
                if let Ok(ui_content) = self.get_ui_content().await {
                    if !self.has_permission_dialog(&ui_content) {
                        info!("✅ 权限弹窗已处理");
                        return Ok(());
                    }
                }
            }
        }

        Err(anyhow::anyhow!("无法自动处理权限弹窗"))
    }

    /// 提取关键UI元素
    fn extract_key_ui_elements(&self, ui_content: &str) -> Vec<String> {
        let mut elements = Vec::new();
        
        // 提取重要的UI元素
        for line in ui_content.lines() {
            if line.contains("text=\"") && line.contains("clickable=\"true\"") {
                if let Some(text_start) = line.find("text=\"") {
                    if let Some(text_end) = line[text_start + 6..].find("\"") {
                        let text = &line[text_start + 6..text_start + 6 + text_end];
                        if !text.is_empty() && text.len() > 1 {
                            elements.push(text.to_string());
                        }
                    }
                }
            }
        }
        
        elements.truncate(10); // 限制元素数量
        elements
    }

    /// 获取状态描述信息
    fn get_state_message(&self, state: &AppLaunchState) -> String {
        match state {
            AppLaunchState::NotStarted => "应用未启动".to_string(),
            AppLaunchState::Starting => "应用启动中...".to_string(),
            AppLaunchState::SplashScreen => "显示启动画面".to_string(),
            AppLaunchState::PermissionDialog => "等待权限确认".to_string(),
            AppLaunchState::NetworkCheck => "检查网络连接".to_string(),
            AppLaunchState::LoginRequired => "需要用户登录".to_string(),
            AppLaunchState::Loading => "内容加载中...".to_string(),
            AppLaunchState::Ready => "应用已就绪，可以操作".to_string(),
            AppLaunchState::Error(msg) => format!("启动错误: {}", msg),
        }
    }

    /// 快速状态检查（不等待）
    pub async fn quick_state_check(&self) -> AppStateResult {
        self.detect_current_state().await
    }
}