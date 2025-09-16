use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::services::adb_shell_session::AdbShellSession;
use crate::services::app_state_detector::{AppStateDetector, AppStateResult, DetectionConfig};
use crate::utils::adb_utils::get_adb_path;
use tracing::{info, warn, error};

/// 应用信息结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppInfo {
    pub package_name: String,      // 包名 (com.xingin.xhs)
    pub app_name: String,          // 显示名称 (小红书)
    pub version_name: Option<String>, // 版本名
    pub version_code: Option<String>, // 版本号
    pub is_system_app: bool,       // 是否系统应用
    pub is_enabled: bool,          // 是否启用
    pub main_activity: Option<String>, // 主Activity
    pub icon_path: Option<String>, // 图标路径
}

/// 应用启动结果（增强版）
#[derive(Debug, Serialize, Deserialize)]
pub struct AppLaunchResult {
    pub success: bool,
    pub message: String,
    pub package_name: String,
    pub launch_time_ms: u64,
    pub app_state: Option<AppStateResult>,  // 新增：详细的应用状态
    pub ready_time_ms: Option<u64>,        // 新增：应用就绪时间
    pub startup_issues: Vec<String>,       // 新增：启动过程中的问题记录
}

/// 智能应用管理器
pub struct SmartAppManager {
    shell_session: AdbShellSession,
    apps_cache: HashMap<String, AppInfo>,
    cache_valid: bool,
}

impl SmartAppManager {
    pub fn new(device_id: String) -> Self {
        // 使用智能ADB路径检测
        let adb_path = get_adb_path();
        info!("🛠️ SmartAppManager使用ADB路径: {}", adb_path);
        
        Self {
            shell_session: AdbShellSession::new(device_id, adb_path),
            apps_cache: HashMap::new(),
            cache_valid: false,
        }
    }

    /// 获取设备上所有已安装的应用
    pub async fn get_installed_apps(&mut self) -> Result<Vec<AppInfo>> {
        info!("📱 开始获取设备已安装应用列表");
        info!("🔍 SmartAppManager 使用的ADB路径: {}", self.shell_session.get_adb_path().await);

        // 首先确保 ADB Shell 连接已建立
        if let Err(e) = self.shell_session.connect().await {
            error!("ADB Shell 连接失败: {}", e);
            return Err(anyhow::anyhow!("ADB Shell 连接失败: {}", e));
        }

        // 1. 获取所有包名
        let packages_output = self.shell_session.execute_command("pm list packages").await?;
        let mut apps = Vec::new();

        for line in packages_output.lines() {
            if let Some(package_name) = line.strip_prefix("package:") {
                // 过滤掉一些系统包，专注用户应用
                if self.should_include_package(package_name) {
                    if let Ok(app_info) = self.get_app_detailed_info(package_name).await {
                        apps.push(app_info);
                    }
                }
            }
        }

        // 按应用名称排序
        apps.sort_by(|a, b| a.app_name.cmp(&b.app_name));

        info!("📊 成功获取 {} 个用户应用", apps.len());
        
        // 更新缓存
        self.apps_cache.clear();
        for app in &apps {
            self.apps_cache.insert(app.package_name.clone(), app.clone());
        }
        self.cache_valid = true;

        Ok(apps)
    }

    /// 获取应用详细信息
    async fn get_app_detailed_info(&self, package_name: &str) -> Result<AppInfo> {
        // 获取应用基本信息
        let info_output = self.shell_session.execute_command(&format!("dumpsys package {}", package_name)).await?;
        
        let mut app_name = package_name.to_string();
        let mut version_name = None;
        let mut version_code = None;
        let mut main_activity = None;
        let mut is_system_app = false;
        let mut is_enabled = true;

        // 解析dumpsys输出
        for line in info_output.lines() {
            let line = line.trim();
            
            if line.starts_with("versionName=") {
                version_name = Some(line.replace("versionName=", ""));
            } else if line.starts_with("versionCode=") {
                version_code = Some(line.replace("versionCode=", ""));
            } else if line.contains("android.intent.action.MAIN") {
                // 查找主Activity
                if let Some(activity_line) = info_output.lines().find(|l| l.contains(package_name) && l.contains("filter")) {
                    main_activity = Some(self.extract_main_activity(activity_line, package_name));
                }
            } else if line.contains("system=true") {
                is_system_app = true;
            } else if line.contains("enabled=false") {
                is_enabled = false;
            }
        }

        // 尝试获取应用显示名称
        if let Ok(label_output) = self.shell_session.execute_command(&format!("pm list packages -f {} | head -1", package_name)).await {
            if let Some(apk_path) = self.extract_apk_path(&label_output) {
                if let Ok(label) = self.shell_session.execute_command(&format!("aapt dump badging {} | grep application-label", apk_path)).await {
                    if let Some(extracted_name) = self.extract_app_name(&label) {
                        app_name = extracted_name;
                    }
                }
            }
        }

        // 如果无法获取显示名称，使用包名的最后部分
        if app_name == package_name {
            app_name = self.generate_friendly_name(package_name);
        }

        Ok(AppInfo {
            package_name: package_name.to_string(),
            app_name,
            version_name,
            version_code,
            is_system_app,
            is_enabled,
            main_activity,
            icon_path: None, // 暂不获取图标路径
        })
    }

    /// 智能启动应用（增强版 - 包含完整状态检测）
    pub async fn launch_app(&self, package_name: &str) -> Result<AppLaunchResult> {
        let overall_start_time = std::time::Instant::now();
        let mut startup_issues = Vec::new();
        
        info!("🚀 智能启动应用: {}", package_name);

        // 第一步：执行启动命令
        let launch_start_time = std::time::Instant::now();
        let launch_success = self.execute_launch_commands(package_name, &mut startup_issues).await;
        let launch_time_ms = launch_start_time.elapsed().as_millis() as u64;

        if !launch_success {
            return Ok(AppLaunchResult {
                success: false,
                message: "应用启动命令执行失败".to_string(),
                package_name: package_name.to_string(),
                launch_time_ms,
                app_state: None,
                ready_time_ms: None,
                startup_issues,
            });
        }

        // 第二步：等待应用进入可操作状态
        info!("⏳ 等待应用完全启动并进入可操作状态...");
        let state_detector = AppStateDetector::new(
            self.shell_session.clone(), 
            package_name.to_string()
        );

        // 针对不同应用调整检测配置
        let config = self.get_detection_config_for_app(package_name);
        let state_detector = state_detector.with_config(config);

        let ready_start_time = std::time::Instant::now();
        let app_state_result = state_detector.wait_for_app_ready().await?;
        let ready_time_ms = ready_start_time.elapsed().as_millis() as u64;

        // 分析结果
        let is_ready = app_state_result.is_functional;
        let total_time_ms = overall_start_time.elapsed().as_millis() as u64;

        // 记录状态检测过程中的问题
        if !app_state_result.message.is_empty() && !is_ready {
            startup_issues.push(app_state_result.message.clone());
        }

        let result = AppLaunchResult {
            success: is_ready,
            message: self.generate_launch_message(&app_state_result, launch_time_ms, ready_time_ms, total_time_ms),
            package_name: package_name.to_string(),
            launch_time_ms,
            app_state: Some(app_state_result),
            ready_time_ms: if is_ready { Some(ready_time_ms) } else { None },
            startup_issues,
        };

        if is_ready {
            info!("✅ 应用启动成功: {} (总计{}ms, 就绪{}ms)", package_name, total_time_ms, ready_time_ms);
        } else {
            warn!("⚠️ 应用启动异常: {} - {}", package_name, result.message);
        }

        Ok(result)
    }

    /// 执行应用启动命令
    async fn execute_launch_commands(&self, package_name: &str, startup_issues: &mut Vec<String>) -> bool {
        // 方法1: 使用monkey命令启动（推荐）
        info!("📱 尝试使用monkey命令启动应用");
        let monkey_result = self.shell_session.execute_command(&format!(
            "monkey -p {} -c android.intent.category.LAUNCHER 1", package_name
        )).await;

        if monkey_result.is_ok() {
            // 短暂等待启动
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            return true;
        } else {
            startup_issues.push("monkey命令启动失败".to_string());
        }

        // 方法2: 使用am start命令
        info!("📱 尝试使用am start命令启动应用");
        if let Some(app_info) = self.apps_cache.get(package_name) {
            if let Some(main_activity) = &app_info.main_activity {
                let am_result = self.shell_session.execute_command(&format!(
                    "am start -n {}/{}", package_name, main_activity
                )).await;

                if am_result.is_ok() {
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                    return true;
                } else {
                    startup_issues.push("am start命令启动失败".to_string());
                }
            }
        }

        // 方法3: 通用启动方式
        info!("📱 尝试通用启动方式");
        let generic_result = self.shell_session.execute_command(&format!(
            "am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER {}", package_name
        )).await;

        if generic_result.is_ok() {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            true
        } else {
            startup_issues.push("所有启动方法都失败".to_string());
            false
        }
    }

    /// 为不同应用获取专用的检测配置
    fn get_detection_config_for_app(&self, package_name: &str) -> DetectionConfig {
        match package_name {
            "com.xingin.xhs" => DetectionConfig {
                max_wait_time: std::time::Duration::from_secs(45), // 小红书启动较慢
                check_interval: std::time::Duration::from_millis(1500),
                splash_timeout: std::time::Duration::from_secs(15),
                ui_load_timeout: std::time::Duration::from_secs(20),
            },
            "com.tencent.mm" => DetectionConfig {
                max_wait_time: std::time::Duration::from_secs(30), // 微信启动中等
                check_interval: std::time::Duration::from_millis(1000),
                splash_timeout: std::time::Duration::from_secs(8),
                ui_load_timeout: std::time::Duration::from_secs(12),
            },
            _ => DetectionConfig::default(), // 默认配置
        }
    }

    /// 生成启动结果消息
    fn generate_launch_message(&self, app_state: &AppStateResult, launch_time_ms: u64, ready_time_ms: u64, total_time_ms: u64) -> String {
        match &app_state.state {
            crate::services::app_state_detector::AppLaunchState::Ready => {
                format!("✅ 应用启动成功并就绪 (启动: {}ms, 就绪: {}ms, 总计: {}ms)", 
                       launch_time_ms, ready_time_ms, total_time_ms)
            }
            crate::services::app_state_detector::AppLaunchState::PermissionDialog => {
                "⚠️ 应用启动成功，但停留在权限弹窗页面".to_string()
            }
            crate::services::app_state_detector::AppLaunchState::LoginRequired => {
                "⚠️ 应用启动成功，但需要用户登录".to_string()
            }
            crate::services::app_state_detector::AppLaunchState::SplashScreen => {
                "⚠️ 应用可能卡在启动画面".to_string()
            }
            crate::services::app_state_detector::AppLaunchState::Loading => {
                "⚠️ 应用正在加载中，未完全就绪".to_string()
            }
            crate::services::app_state_detector::AppLaunchState::NetworkCheck => {
                "⚠️ 应用停留在网络检查页面".to_string()
            }
            crate::services::app_state_detector::AppLaunchState::Error(msg) => {
                format!("❌ 应用启动过程出错: {}", msg)
            }
            _ => format!("⚠️ 应用启动状态未知: {:?}", app_state.state)
        }
    }

    /// 判断是否应该包含这个包
    fn should_include_package(&self, package_name: &str) -> bool {
        // 排除系统应用和一些不重要的包
        let exclude_prefixes = [
            "android.",
            "com.android.",
            "com.google.android.",
            "com.qualcomm.",
            "com.samsung.",
            "com.sec.",
            "system.",
        ];

        let exclude_keywords = [
            "keyboard",
            "launcher3",
            "settings",
            "systemui",
            "packageinstaller",
        ];

        // 排除系统应用前缀
        for prefix in &exclude_prefixes {
            if package_name.starts_with(prefix) {
                return false;
            }
        }

        // 排除特定关键词
        for keyword in &exclude_keywords {
            if package_name.to_lowercase().contains(keyword) {
                return false;
            }
        }

        // 包含常见的用户应用
        let include_keywords = [
            "xiaohongshu", "xhs", "tencent", "baidu", "taobao", 
            "jingdong", "douyin", "kuaishou", "bilibili",
        ];

        for keyword in &include_keywords {
            if package_name.to_lowercase().contains(keyword) {
                return true;
            }
        }

        // 默认包含第三方应用
        !package_name.starts_with("com.android") && 
        !package_name.starts_with("android") && 
        package_name.split('.').count() >= 3
    }

    /// 从包名生成友好的应用名称
    fn generate_friendly_name(&self, package_name: &str) -> String {
        // 常见应用的映射
        let app_mappings = HashMap::from([
            ("com.xingin.xhs", "小红书"),
            ("com.tencent.mm", "微信"),
            ("com.tencent.mobileqq", "QQ"),
            ("com.taobao.taobao", "淘宝"),
            ("com.jingdong.app.mall", "京东"),
            ("com.ss.android.ugc.aweme", "抖音"),
            ("com.smile.gifmaker", "快手"),
            ("tv.danmaku.bili", "哔哩哔哩"),
            ("com.baidu.BaiduMap", "百度地图"),
            ("com.autonavi.minimap", "高德地图"),
        ]);

        if let Some(name) = app_mappings.get(package_name) {
            return name.to_string();
        }

        // 从包名提取可能的应用名
        let parts: Vec<&str> = package_name.split('.').collect();
        if parts.len() >= 2 {
            let potential_name = parts.last().unwrap_or(&parts[parts.len()-2]);
            // 首字母大写
            let mut chars: Vec<char> = potential_name.chars().collect();
            if !chars.is_empty() {
                chars[0] = chars[0].to_uppercase().next().unwrap_or(chars[0]);
                return chars.into_iter().collect();
            }
        }

        package_name.to_string()
    }

    /// 提取APK路径
    fn extract_apk_path(&self, output: &str) -> Option<String> {
        if let Some(start) = output.find("package:") {
            if let Some(end) = output[start..].find('=') {
                let apk_path = &output[start + 8..start + end]; // 8 = "package:".len()
                return Some(apk_path.to_string());
            }
        }
        None
    }

    /// 提取应用名称
    fn extract_app_name(&self, label_output: &str) -> Option<String> {
        if let Some(start) = label_output.find("application-label:'") {
            if let Some(end) = label_output[start + 19..].find('\'') {
                let app_name = &label_output[start + 19..start + 19 + end];
                return Some(app_name.to_string());
            }
        }
        None
    }

    /// 提取主Activity
    fn extract_main_activity(&self, _line: &str, package_name: &str) -> String {
        // 默认的主Activity模式
        format!("{}.MainActivity", package_name)
    }

    /// 获取缓存的应用信息
    pub fn get_cached_apps(&self) -> Vec<AppInfo> {
        if self.cache_valid {
            self.apps_cache.values().cloned().collect()
        } else {
            Vec::new()
        }
    }

    /// 搜索应用
    pub fn search_apps(&self, query: &str) -> Vec<AppInfo> {
        let query_lower = query.to_lowercase();
        self.apps_cache.values()
            .filter(|app| {
                app.app_name.to_lowercase().contains(&query_lower) ||
                app.package_name.to_lowercase().contains(&query_lower)
            })
            .cloned()
            .collect()
    }
}