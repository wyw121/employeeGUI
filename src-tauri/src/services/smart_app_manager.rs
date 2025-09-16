use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::services::adb_shell_session::AdbShellSession;
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

/// 应用启动结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AppLaunchResult {
    pub success: bool,
    pub message: String,
    pub package_name: String,
    pub launch_time_ms: u64,
}

/// 智能应用管理器
pub struct SmartAppManager {
    shell_session: AdbShellSession,
    apps_cache: HashMap<String, AppInfo>,
    cache_valid: bool,
}

impl SmartAppManager {
    pub fn new(device_id: String) -> Self {
        // 使用默认的ADB路径
        let adb_path = "platform-tools/adb.exe".to_string();
        
        Self {
            shell_session: AdbShellSession::new(device_id, adb_path),
            apps_cache: HashMap::new(),
            cache_valid: false,
        }
    }

    /// 获取设备上所有已安装的应用
    pub async fn get_installed_apps(&mut self) -> Result<Vec<AppInfo>> {
        info!("📱 开始获取设备已安装应用列表");

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

    /// 智能启动应用
    pub async fn launch_app(&self, package_name: &str) -> Result<AppLaunchResult> {
        let start_time = std::time::Instant::now();
        info!("🚀 启动应用: {}", package_name);

        // 方法1: 使用monkey命令启动
        let monkey_result = self.shell_session.execute_command(&format!(
            "monkey -p {} -c android.intent.category.LAUNCHER 1", package_name
        )).await;

        if monkey_result.is_ok() {
            let launch_time = start_time.elapsed().as_millis() as u64;
            
            // 验证启动是否成功
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            
            if let Ok(current_activity) = self.shell_session.execute_command("dumpsys activity activities | grep mResumedActivity").await {
                if current_activity.contains(package_name) {
                    return Ok(AppLaunchResult {
                        success: true,
                        message: format!("应用启动成功 ({}ms)", launch_time),
                        package_name: package_name.to_string(),
                        launch_time_ms: launch_time,
                    });
                }
            }
        }

        // 方法2: 尝试使用am start命令
        if let Some(app_info) = self.apps_cache.get(package_name) {
            if let Some(main_activity) = &app_info.main_activity {
                let am_result = self.shell_session.execute_command(&format!(
                    "am start -n {}/{}", package_name, main_activity
                )).await;

                if am_result.is_ok() {
                    let launch_time = start_time.elapsed().as_millis() as u64;
                    return Ok(AppLaunchResult {
                        success: true,
                        message: format!("应用启动成功 (am命令, {}ms)", launch_time),
                        package_name: package_name.to_string(),
                        launch_time_ms: launch_time,
                    });
                }
            }
        }

        // 方法3: 通用启动方式
        let generic_result = self.shell_session.execute_command(&format!(
            "am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n {}", package_name
        )).await;

        let launch_time = start_time.elapsed().as_millis() as u64;
        
        if generic_result.is_ok() {
            Ok(AppLaunchResult {
                success: true,
                message: format!("应用启动成功 (通用方式, {}ms)", launch_time),
                package_name: package_name.to_string(),
                launch_time_ms: launch_time,
            })
        } else {
            Ok(AppLaunchResult {
                success: false,
                message: format!("应用启动失败: 未找到启动方式"),
                package_name: package_name.to_string(),
                launch_time_ms: launch_time,
            })
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
    fn extract_main_activity(&self, line: &str, package_name: &str) -> String {
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