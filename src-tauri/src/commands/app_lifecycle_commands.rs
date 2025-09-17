// 应用生命周期管理的 Tauri 命令接口
// 提供应用检测和启动的前端调用接口

use serde::{Deserialize};
use tauri::command;

use crate::services::app_lifecycle_manager::{
    AppLifecycleManager, AppLifecycleResult, AppLaunchConfig, LaunchMethod
};
use crate::services::adb_service::AdbService;

/// 前端调用的应用启动配置
#[derive(Debug, Deserialize)]
pub struct FrontendAppLaunchConfig {
    pub max_retries: Option<u32>,
    pub launch_timeout_secs: Option<u64>,
    pub ready_check_interval_ms: Option<u64>,
    pub launch_method: Option<String>, // "auto", "activity_manager", "monkey", "desktop_icon"
    pub package_name: Option<String>,
}

impl From<FrontendAppLaunchConfig> for AppLaunchConfig {
    fn from(config: FrontendAppLaunchConfig) -> Self {
        let launch_method = match config.launch_method.as_deref() {
            Some("activity_manager") => LaunchMethod::ActivityManager,
            Some("monkey") => LaunchMethod::MonkeyRunner,
            Some("desktop_icon") => LaunchMethod::DesktopIcon,
            _ => LaunchMethod::Auto,
        };

        AppLaunchConfig {
            max_retries: config.max_retries.unwrap_or(3),
            launch_timeout_secs: config.launch_timeout_secs.unwrap_or(15),
            ready_check_interval_ms: config.ready_check_interval_ms.unwrap_or(500),
            launch_method,
            package_name: config.package_name,
        }
    }
}

/// 检测并启动应用（Tauri 命令）
/// 
/// 这是核心的应用生命周期管理命令，确保应用处于运行状态
/// 
/// # 参数
/// - device_id: 设备ID
/// - app_name: 应用名称（如："小红书", "微信"）
/// - config: 启动配置（可选）
/// 
/// # 返回
/// - AppLifecycleResult: 包含详细的执行结果、日志和状态信息
#[command]
pub async fn ensure_app_running(
    device_id: String,
    app_name: String,
    config: Option<FrontendAppLaunchConfig>,
    adb_service: tauri::State<'_, std::sync::Mutex<AdbService>>,
) -> Result<AppLifecycleResult, String> {
    // 获取ADB服务实例
    let adb_svc = {
        let lock = adb_service.lock().map_err(|e| format!("Failed to acquire ADB service lock: {}", e))?;
        lock.clone()
    };

    // 创建应用生命周期管理器
    let manager = AppLifecycleManager::new(adb_svc);

    // 转换配置
    let launch_config = config.map(AppLaunchConfig::from);

    // 执行应用检测和启动
    let result = manager.ensure_app_running(&device_id, &app_name, launch_config).await;

    // 输出结果日志到控制台（便于调试）
    if result.success {
        println!("✅ 应用生命周期管理成功: {} -> {:?} ({}ms, {} 次重试)", 
            result.app_name, result.final_state, result.execution_time_ms, result.retry_count);
    } else {
        println!("❌ 应用生命周期管理失败: {} -> {:?} ({}ms, {} 次重试) - {}", 
            result.app_name, result.final_state, result.execution_time_ms, result.retry_count,
            result.error_message.as_deref().unwrap_or("未知错误"));
    }

    Ok(result)
}

/// 快速检测应用状态（不启动）
#[command]
pub async fn detect_app_state(
    device_id: String,
    app_name: String,
    adb_service: tauri::State<'_, std::sync::Mutex<AdbService>>,
) -> Result<AppLifecycleResult, String> {
    let adb_svc = {
        let lock = adb_service.lock().map_err(|e| format!("Failed to acquire ADB service lock: {}", e))?;
        lock.clone()
    };

    let manager = AppLifecycleManager::new(adb_svc);

    // 创建一个只检测不启动的配置
    let config = AppLaunchConfig {
        max_retries: 0, // 不重试，只检测
        ..AppLaunchConfig::default()
    };

    let mut result = manager.ensure_app_running(&device_id, &app_name, Some(config)).await;
    
    // 修改操作类型为检测
    result.operation = "detect_only".to_string();

    Ok(result)
}