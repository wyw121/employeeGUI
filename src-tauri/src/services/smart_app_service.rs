use tauri::{command, State};
use tokio::sync::Mutex;
use std::collections::HashMap;
use crate::services::smart_app_manager::{SmartAppManager, AppInfo, AppLaunchResult};
use tracing::{info, error};

/// 全局应用管理器状态
pub struct SmartAppManagerState {
    managers: Mutex<HashMap<String, SmartAppManager>>,
}

impl SmartAppManagerState {
    pub fn new() -> Self {
        Self {
            managers: Mutex::new(HashMap::new()),
        }
    }
}

/// 获取设备应用列表
#[command]
pub async fn get_device_apps(
    device_id: String,
    state: State<'_, SmartAppManagerState>,
) -> Result<Vec<AppInfo>, String> {
    info!("📱 获取设备 {} 的应用列表", device_id);
    
    let mut managers = state.managers.lock().await;
    let manager = managers
        .entry(device_id.clone())
        .or_insert_with(|| SmartAppManager::new(device_id.clone()));

    manager.get_installed_apps().await.map_err(|e| {
        error!("获取应用列表失败: {}", e);
        format!("获取应用列表失败: {}", e)
    })
}

/// 搜索设备应用
#[command]
pub async fn search_device_apps(
    device_id: String,
    query: String,
    state: State<'_, SmartAppManagerState>,
) -> Result<Vec<AppInfo>, String> {
    info!("🔍 在设备 {} 上搜索应用: {}", device_id, query);
    
    let managers = state.managers.lock().await;
    if let Some(manager) = managers.get(&device_id) {
        Ok(manager.search_apps(&query))
    } else {
        Err("设备管理器未初始化，请先获取应用列表".to_string())
    }
}

/// 启动应用
#[command]
pub async fn launch_device_app(
    device_id: String,
    package_name: String,
    state: State<'_, SmartAppManagerState>,
) -> Result<AppLaunchResult, String> {
    info!("🚀 在设备 {} 上启动应用: {}", device_id, package_name);
    
    let managers = state.managers.lock().await;
    if let Some(manager) = managers.get(&device_id) {
        manager.launch_app(&package_name).await.map_err(|e| {
            error!("启动应用失败: {}", e);
            format!("启动应用失败: {}", e)
        })
    } else {
        Err("设备管理器未初始化".to_string())
    }
}

/// 获取缓存的应用列表
#[command]
pub async fn get_cached_device_apps(
    device_id: String,
    state: State<'_, SmartAppManagerState>,
) -> Result<Vec<AppInfo>, String> {
    let managers = state.managers.lock().await;
    if let Some(manager) = managers.get(&device_id) {
        Ok(manager.get_cached_apps())
    } else {
        Ok(Vec::new())
    }
}

/// 预设的常用应用列表
#[command]
pub async fn get_popular_apps() -> Result<Vec<AppInfo>, String> {
    Ok(vec![
        AppInfo {
            package_name: "com.xingin.xhs".to_string(),
            app_name: "小红书".to_string(),
            version_name: None,
            version_code: None,
            is_system_app: false,
            is_enabled: true,
            main_activity: Some("com.xingin.xhs.index.v2.IndexActivityV2".to_string()),
            icon_path: None,
        },
        AppInfo {
            package_name: "com.tencent.mm".to_string(),
            app_name: "微信".to_string(),
            version_name: None,
            version_code: None,
            is_system_app: false,
            is_enabled: true,
            main_activity: Some("com.tencent.mm.ui.LauncherUI".to_string()),
            icon_path: None,
        },
        AppInfo {
            package_name: "com.tencent.mobileqq".to_string(),
            app_name: "QQ".to_string(),
            version_name: None,
            version_code: None,
            is_system_app: false,
            is_enabled: true,
            main_activity: None,
            icon_path: None,
        },
        AppInfo {
            package_name: "com.taobao.taobao".to_string(),
            app_name: "淘宝".to_string(),
            version_name: None,
            version_code: None,
            is_system_app: false,
            is_enabled: true,
            main_activity: None,
            icon_path: None,
        },
        AppInfo {
            package_name: "com.jingdong.app.mall".to_string(),
            app_name: "京东".to_string(),
            version_name: None,
            version_code: None,
            is_system_app: false,
            is_enabled: true,
            main_activity: None,
            icon_path: None,
        },
        AppInfo {
            package_name: "com.ss.android.ugc.aweme".to_string(),
            app_name: "抖音".to_string(),
            version_name: None,
            version_code: None,
            is_system_app: false,
            is_enabled: true,
            main_activity: None,
            icon_path: None,
        },
    ])
}