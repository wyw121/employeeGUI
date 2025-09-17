// 应用生命周期管理服务
// 负责应用的检测、启动、状态监控等核心功能
// 
// 功能包括：
// 1. 检测应用是否运行
// 2. 启动应用（多种方式）
// 3. 等待应用就绪
// 4. 应用状态监控
// 5. 重试机制和详细日志

use serde::Serialize;
use std::time::{Duration, Instant};
use tokio::time::sleep;

use crate::services::adb_service::AdbService;

/// 应用生命周期操作结果
#[derive(Debug, Serialize, Clone)]
pub struct AppLifecycleResult {
    pub success: bool,
    pub app_name: String,
    pub device_id: String,
    pub operation: String,           // "detect", "launch", "wait_ready"
    pub execution_time_ms: u64,
    pub retry_count: u32,
    pub max_retries: u32,
    pub final_state: AppState,
    pub logs: Vec<String>,
    pub error_message: Option<String>,
}

/// 应用状态枚举
#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum AppState {
    NotInstalled,     // 未安装
    Installed,        // 已安装但未运行
    Background,       // 在后台运行
    Foreground,       // 在前台运行
    Starting,         // 正在启动
    Unknown,          // 未知状态
}

/// 应用启动配置
#[derive(Debug, Clone)]
pub struct AppLaunchConfig {
    pub max_retries: u32,           // 最大重试次数，默认3
    pub launch_timeout_secs: u64,   // 启动超时秒数，默认10
    pub ready_check_interval_ms: u64, // 就绪检查间隔，默认500ms
    pub launch_method: LaunchMethod, // 启动方法
    pub package_name: Option<String>, // 包名（可选，自动推断）
}

/// 应用启动方法
#[derive(Debug, Clone)]
pub enum LaunchMethod {
    ActivityManager,  // 使用 am start
    MonkeyRunner,    // 使用 monkey 命令
    DesktopIcon,     // 点击桌面图标（需要UI自动化）
    Auto,            // 自动选择最适合的方法
}

impl Default for AppLaunchConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            launch_timeout_secs: 15,
            ready_check_interval_ms: 500,
            launch_method: LaunchMethod::Auto,
            package_name: None,
        }
    }
}

/// 应用生命周期管理器
pub struct AppLifecycleManager {
    adb_service: AdbService,
}

impl AppLifecycleManager {
    /// 创建新的应用生命周期管理器
    pub fn new(adb_service: AdbService) -> Self {
        Self { adb_service }
    }

    /// 检测并启动应用（主要入口方法）
    /// 这是其他模块调用的核心方法
    pub async fn ensure_app_running(
        &self,
        device_id: &str,
        app_name: &str,
        config: Option<AppLaunchConfig>
    ) -> AppLifecycleResult {
        let config = config.unwrap_or_default();
        let start_time = Instant::now();
        let mut logs = Vec::new();
        let mut retry_count = 0;

        logs.push(format!("🎯 开始应用生命周期管理: {}", app_name));
        logs.push(format!("📋 配置: 最大重试{}次, 启动超时{}秒", 
            config.max_retries, config.launch_timeout_secs));

        // Step 1: 检测应用状态
        let mut current_state = self.detect_app_state(device_id, app_name, &mut logs).await;
        
        if current_state == AppState::Foreground {
            logs.push(format!("✅ 应用 {} 已在前台运行", app_name));
            return self.create_result(
                true, app_name, device_id, "detect", start_time,
                retry_count, config.max_retries, current_state, logs, None
            );
        }

        // Step 2: 需要启动应用，开始重试循环
        while retry_count <= config.max_retries && current_state != AppState::Foreground {
            retry_count += 1;
            
            if retry_count > 1 {
                logs.push(format!("🔄 第 {}/{} 次重试启动", retry_count, config.max_retries + 1));
            }

            // Step 2.1: 启动应用
            match self.launch_app(device_id, app_name, &config, &mut logs).await {
                Ok(_) => {
                    logs.push(format!("📱 启动命令执行成功，等待应用就绪..."));
                    
                    // Step 2.2: 等待应用就绪
                    match self.wait_for_app_ready(device_id, app_name, &config, &mut logs).await {
                        Ok(final_state) => {
                            if final_state == AppState::Foreground {
                                logs.push(format!("🎉 应用 {} 启动成功并已就绪 (第{}次尝试)", app_name, retry_count));
                                return self.create_result(
                                    true, app_name, device_id, "launch", start_time,
                                    retry_count, config.max_retries, final_state, logs, None
                                );
                            } else {
                                logs.push(format!("⚠️ 应用启动但未进入前台状态: {:?}", final_state));
                                current_state = final_state;
                            }
                        }
                        Err(e) => {
                            logs.push(format!("❌ 等待应用就绪失败: {}", e));
                        }
                    }
                }
                Err(e) => {
                    logs.push(format!("❌ 启动应用失败: {}", e));
                }
            }

            // 重试间隔
            if retry_count <= config.max_retries {
                let delay = Duration::from_millis(1000 + retry_count as u64 * 500);
                logs.push(format!("⏳ 等待 {}ms 后重试...", delay.as_millis()));
                sleep(delay).await;
                
                // 重新检测状态
                current_state = self.detect_app_state(device_id, app_name, &mut logs).await;
            }
        }

        // 所有重试都失败
        let error_msg = format!("应用 {} 启动失败，已重试 {} 次", app_name, retry_count);
        logs.push(format!("💥 {}", error_msg));

        self.create_result(
            false, app_name, device_id, "launch", start_time,
            retry_count, config.max_retries, current_state, logs, Some(error_msg)
        )
    }

    /// 检测应用当前状态
    async fn detect_app_state(&self, device_id: &str, app_name: &str, logs: &mut Vec<String>) -> AppState {
        logs.push(format!("🔍 检测应用 {} 状态...", app_name));

        // 获取包名
        let package_name = match self.get_package_name(app_name) {
            Some(pkg) => pkg,
            None => {
                logs.push(format!("❌ 无法获取应用 {} 的包名", app_name));
                return AppState::Unknown;
            }
        };

        // 检查是否安装
        match self.is_app_installed(device_id, &package_name).await {
            Ok(false) => {
                logs.push(format!("📵 应用 {} 未安装", app_name));
                return AppState::NotInstalled;
            }
            Ok(true) => {
                logs.push(format!("📱 应用 {} 已安装", app_name));
            }
            Err(e) => {
                logs.push(format!("⚠️ 检查应用安装状态失败: {}", e));
                return AppState::Unknown;
            }
        }

        // 检查是否在前台
        match self.is_app_in_foreground(device_id, &package_name).await {
            Ok(true) => {
                logs.push(format!("✅ 应用 {} 在前台运行", app_name));
                AppState::Foreground
            }
            Ok(false) => {
                // 检查是否在后台
                match self.is_app_running(device_id, &package_name).await {
                    Ok(true) => {
                        logs.push(format!("🔄 应用 {} 在后台运行", app_name));
                        AppState::Background
                    }
                    Ok(false) => {
                        logs.push(format!("💤 应用 {} 已安装但未运行", app_name));
                        AppState::Installed
                    }
                    Err(e) => {
                        logs.push(format!("⚠️ 检查应用运行状态失败: {}", e));
                        AppState::Unknown
                    }
                }
            }
            Err(e) => {
                logs.push(format!("⚠️ 检查应用前台状态失败: {}", e));
                AppState::Unknown
            }
        }
    }

    /// 启动应用
    async fn launch_app(
        &self, 
        device_id: &str, 
        app_name: &str, 
        config: &AppLaunchConfig, 
        logs: &mut Vec<String>
    ) -> Result<(), String> {
        let package_name = self.get_package_name(app_name)
            .ok_or_else(|| format!("无法获取应用 {} 的包名", app_name))?;

        let method = match &config.launch_method {
            LaunchMethod::Auto => self.choose_best_launch_method(app_name),
            other => other.clone(),
        };

        logs.push(format!("🚀 启动应用 {} (方法: {:?})", app_name, method));

        match method {
            LaunchMethod::ActivityManager => {
                self.launch_via_activity_manager(device_id, &package_name, logs).await
            }
            LaunchMethod::MonkeyRunner => {
                self.launch_via_monkey(device_id, &package_name, logs).await
            }
            LaunchMethod::DesktopIcon => {
                self.launch_via_desktop_icon(device_id, app_name, logs).await
            }
            LaunchMethod::Auto => unreachable!(), // 已经在上面处理了
        }
    }

    /// 等待应用就绪
    async fn wait_for_app_ready(
        &self,
        device_id: &str,
        app_name: &str,
        config: &AppLaunchConfig,
        logs: &mut Vec<String>
    ) -> Result<AppState, String> {
        logs.push(format!("⏳ 等待应用 {} 就绪 (超时: {}秒)...", app_name, config.launch_timeout_secs));
        
        let package_name = self.get_package_name(app_name)
            .ok_or_else(|| format!("无法获取应用 {} 的包名", app_name))?;

        let timeout_duration = Duration::from_secs(config.launch_timeout_secs);
        let check_interval = Duration::from_millis(config.ready_check_interval_ms);
        let start_time = Instant::now();

        while start_time.elapsed() < timeout_duration {
            // 检查应用状态
            if let Ok(true) = self.is_app_in_foreground(device_id, &package_name).await {
                let elapsed = start_time.elapsed().as_millis();
                logs.push(format!("✅ 应用 {} 已就绪 (耗时: {}ms)", app_name, elapsed));
                return Ok(AppState::Foreground);
            }

            sleep(check_interval).await;
        }

        // 超时，检查最终状态
        let final_state = self.detect_app_state(device_id, app_name, logs).await;
        Err(format!("等待应用就绪超时 ({}秒)，最终状态: {:?}", config.launch_timeout_secs, final_state))
    }

    /// 创建结果对象
    fn create_result(
        &self,
        success: bool,
        app_name: &str,
        device_id: &str,
        operation: &str,
        start_time: Instant,
        retry_count: u32,
        max_retries: u32,
        final_state: AppState,
        logs: Vec<String>,
        error_message: Option<String>
    ) -> AppLifecycleResult {
        AppLifecycleResult {
            success,
            app_name: app_name.to_string(),
            device_id: device_id.to_string(),
            operation: operation.to_string(),
            execution_time_ms: start_time.elapsed().as_millis() as u64,
            retry_count,
            max_retries,
            final_state,
            logs,
            error_message,
        }
    }

    // ========== 私有辅助方法 ==========

    /// 获取应用包名
    fn get_package_name(&self, app_name: &str) -> Option<String> {
        match app_name {
            "小红书" => Some("com.xingin.xhs".to_string()),
            "微信" => Some("com.tencent.mm".to_string()),
            "支付宝" => Some("com.eg.android.AlipayGphone".to_string()),
            "抖音" => Some("com.ss.android.ugc.aweme".to_string()),
            "淘宝" => Some("com.taobao.taobao".to_string()),
            _ => None,
        }
    }

    /// 选择最佳启动方法
    fn choose_best_launch_method(&self, app_name: &str) -> LaunchMethod {
        match app_name {
            "小红书" | "微信" | "支付宝" => LaunchMethod::ActivityManager,
            _ => LaunchMethod::ActivityManager, // 默认使用AM
        }
    }

    /// 通过Activity Manager启动
    async fn launch_via_activity_manager(&self, device_id: &str, package_name: &str, logs: &mut Vec<String>) -> Result<(), String> {
        // 获取应用的启动Activity
        let launch_activity = format!("{}/", package_name);
        let command = vec!["shell", "am", "start", "-n", &launch_activity];
        
        logs.push(format!("📱 执行AM启动命令: adb {}", command.join(" ")));
        
        match self.adb_service.execute_adb_command(device_id, &command.join(" ")).await {
            Ok(output) => {
                if output.contains("Starting") || output.contains("Success") {
                    logs.push("✅ AM启动命令执行成功".to_string());
                    Ok(())
                } else {
                    Err(format!("AM启动失败: {}", output))
                }
            }
            Err(e) => Err(format!("AM启动命令执行失败: {}", e))
        }
    }

    /// 通过Monkey启动
    async fn launch_via_monkey(&self, device_id: &str, package_name: &str, logs: &mut Vec<String>) -> Result<(), String> {
        let command = vec!["shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"];
        
        logs.push(format!("🐒 执行Monkey启动命令: adb {}", command.join(" ")));
        
        match self.adb_service.execute_adb_command(device_id, &command.join(" ")).await {
            Ok(output) => {
                if !output.contains("Error") && !output.contains("CRASH") {
                    logs.push("✅ Monkey启动命令执行成功".to_string());
                    Ok(())
                } else {
                    Err(format!("Monkey启动失败: {}", output))
                }
            }
            Err(e) => Err(format!("Monkey启动命令执行失败: {}", e))
        }
    }

    /// 通过桌面图标启动（需要UI自动化支持）
    async fn launch_via_desktop_icon(&self, device_id: &str, app_name: &str, logs: &mut Vec<String>) -> Result<(), String> {
        logs.push(format!("🖱️ 尝试通过桌面图标启动 {}", app_name));
        
        // 这里需要集成UI自动化逻辑来点击桌面图标
        // 暂时返回未实现错误
        Err("桌面图标启动方法暂未实现".to_string())
    }

    /// 检查应用是否安装
    async fn is_app_installed(&self, device_id: &str, package_name: &str) -> Result<bool, String> {
        let command = vec!["shell", "pm", "list", "packages", package_name];
        let output = self.adb_service.execute_adb_command(device_id, &command.join(" ")).await
            .map_err(|e| e.to_string())?;
        Ok(output.contains(&format!("package:{}", package_name)))
    }

    /// 检查应用是否在前台
    async fn is_app_in_foreground(&self, device_id: &str, package_name: &str) -> Result<bool, String> {
        let command = vec!["shell", "dumpsys", "window", "windows", "|", "grep", "-E", "'mCurrentFocus|mFocusedApp'"];
        let output = self.adb_service.execute_adb_command(device_id, &command.join(" ")).await
            .map_err(|e| e.to_string())?;
        Ok(output.contains(package_name))
    }

    /// 检查应用是否在运行（前台或后台）
    async fn is_app_running(&self, device_id: &str, package_name: &str) -> Result<bool, String> {
        let command = vec!["shell", "ps", "|", "grep", package_name];
        let output = self.adb_service.execute_adb_command(device_id, &command.join(" ")).await
            .map_err(|e| e.to_string())?;
        Ok(!output.trim().is_empty())
    }
}