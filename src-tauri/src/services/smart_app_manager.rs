use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::services::adb_shell_session::AdbShellSession;
use crate::services::adb_session_manager::get_device_session;
use crate::services::app_detection_framework::{
    DetectorFactory, DetectionResult, AppLaunchState
};
use crate::utils::adb_utils::get_adb_path;
use tracing::{info, warn, error};
use futures::{stream, StreamExt};

use crate::services::smart_app::cache::{AppCache, CacheConfig};
use crate::services::smart_app::fetch::{list_packages, fetch_app_info};

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
    pub app_state: Option<DetectionResult>,  // 使用新框架：详细的检测结果
    pub ready_time_ms: Option<u64>,        // 新增：应用就绪时间
    pub startup_issues: Vec<String>,       // 新增：启动过程中的问题记录
}

/// 智能应用管理器
pub struct SmartAppManager {
    device_id: String,
    cache: AppCache,
}

impl SmartAppManager {
    pub fn new(device_id: String) -> Self {
        info!("🛠️ SmartAppManager初始化 - 设备: {}", device_id);
        
        Self {
            device_id,
            cache: AppCache::new(Some(CacheConfig { ttl_ms: 5 * 60 * 1000 })),
        }
    }

    /// 获取设备上所有已安装的应用
    pub async fn get_installed_apps(&mut self, include_system_apps: bool, force_refresh: bool) -> Result<Vec<AppInfo>> {
        info!("📱 获取设备应用列表: include_system_apps={}, force_refresh={}", include_system_apps, force_refresh);

        if !force_refresh && self.cache.is_valid() {
            let apps = self.cache.get_all();
            if !apps.is_empty() {
                info!("✅ 返回缓存的应用列表: {} 项", apps.len());
                return Ok(self.filter_and_sort(apps, include_system_apps));
            }
        }

        let packages = list_packages(&self.device_id).await?;
        let filtered: Vec<String> = packages
            .into_iter()
            .filter(|p| self.should_include_package(p) || include_system_apps)
            .collect();

        // 并发拉取应用详情，限制并发度
        let concurrency = 8usize;
        let mut apps: Vec<AppInfo> = stream::iter(filtered)
            .map(|pkg| async move { fetch_app_info(&self.device_id, &pkg).await })
            .buffer_unordered(concurrency)
            .filter_map(|res| async move { res.ok() })
            .collect()
            .await;

        apps = self.filter_and_sort(apps, include_system_apps);

        info!("📊 成功获取 {} 个应用（并发）", apps.len());
        self.cache.set_apps(apps.clone());
        Ok(apps)
    }

    /// 获取应用详细信息
    // get_app_detailed_info is replaced by smart_app::fetch::fetch_app_info

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
        
        // 使用新的检测框架
        let detector = DetectorFactory::create_detector_for(package_name, &self.device_id)?;

        let ready_start_time = std::time::Instant::now();
        let app_state_result = detector.wait_for_app_ready().await?;
        let ready_time_ms = ready_start_time.elapsed().as_millis() as u64;

        // 分析结果
        let is_ready = matches!(app_state_result.state, AppLaunchState::Ready);
        let total_time_ms = overall_start_time.elapsed().as_millis() as u64;

        // 记录状态检测过程中的问题
        if !app_state_result.is_functional {
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
        // 使用会话管理器获取ADB Shell会话
        let session = match get_device_session(&self.device_id).await {
            Ok(session) => session,
            Err(e) => {
                startup_issues.push(format!("获取ADB会话失败: {}", e));
                return false;
            }
        };
        
        // 方法1: 使用monkey命令启动（推荐）
        info!("📱 尝试使用monkey命令启动应用");
        let monkey_result = session.execute_command(&format!(
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
        if let Some(app_info) = self.cache.apps_by_package.get(package_name) {
            if let Some(main_activity) = &app_info.main_activity {
                let am_result = session.execute_command(&format!(
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
        let generic_result = session.execute_command(&format!(
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

    /// 生成启动结果消息
    fn generate_launch_message(&self, detection_result: &DetectionResult, launch_time_ms: u64, ready_time_ms: u64, total_time_ms: u64) -> String {
        match &detection_result.state {
            AppLaunchState::Ready => {
                format!("✅ 应用启动成功并就绪 (启动: {}ms, 就绪: {}ms, 总计: {}ms)", 
                       launch_time_ms, ready_time_ms, total_time_ms)
            }
            AppLaunchState::PermissionDialog => {
                "⚠️ 应用启动成功，但停留在权限弹窗页面".to_string()
            }
            AppLaunchState::LoginRequired => {
                "⚠️ 应用启动成功，但需要用户登录".to_string()
            }
            AppLaunchState::SplashScreen => {
                "⚠️ 应用可能卡在启动画面".to_string()
            }
            AppLaunchState::Loading => {
                "⚠️ 应用正在加载中，未完全就绪".to_string()
            }
            AppLaunchState::NetworkCheck => {
                "⚠️ 应用停留在网络检查页面".to_string()
            }
            AppLaunchState::Error(msg) => {
                format!("❌ 应用启动过程出错: {}", msg)
            }
            AppLaunchState::NotStarted => {
                "⚠️ 应用尚未启动".to_string()
            }
            AppLaunchState::Starting => {
                "⚠️ 应用正在启动中".to_string()
            }
            AppLaunchState::UpdateCheck => {
                "⚠️ 应用正在检查更新".to_string()
            }
            AppLaunchState::Advertisement => {
                "⚠️ 应用停留在广告页面".to_string()
            }
            AppLaunchState::Tutorial => {
                "⚠️ 应用停留在引导页面".to_string()
            }
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
    pub fn get_cached_apps(&self) -> Vec<AppInfo> { self.cache.get_all() }

    /// 搜索应用
    pub fn search_apps(&self, query: &str) -> Vec<AppInfo> {
        let query_lower = query.to_lowercase();
        self.cache.apps_by_package.values()
            .filter(|app| {
                app.app_name.to_lowercase().contains(&query_lower) ||
                app.package_name.to_lowercase().contains(&query_lower)
            })
            .cloned()
            .collect()
    }

    fn filter_and_sort(&self, mut apps: Vec<AppInfo>, include_system_apps: bool) -> Vec<AppInfo> {
        if !include_system_apps {
            apps.retain(|a| !a.is_system_app);
        }
        apps.sort_by(|a, b| a.app_name.cmp(&b.app_name));
        apps
    }
}