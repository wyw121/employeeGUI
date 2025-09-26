use tauri::{command, State};
use tokio::sync::Mutex;
use std::collections::HashMap;
use crate::services::smart_app_manager::{SmartAppManager, AppInfo, AppLaunchResult};
use tracing::{info, error};
use serde::Serialize;
use crate::services::smart_app::icon::{pull_apk_to_temp, extract_icon_from_apk};
use crate::services::smart_app::icon_cache::IconDiskCache;

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

#[derive(Serialize)]
pub struct PagedApps {
    pub items: Vec<AppInfo>,
    pub total: usize,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}

/// 获取设备应用列表
/// filter_mode: "all" | "only_user" | "only_system"
/// refresh_strategy: "cache_first" | "force_refresh"
#[command]
pub async fn get_device_apps(
    device_id: String,
    include_system_apps: Option<bool>, // backward compatibility
    force_refresh: Option<bool>, // backward compatibility
    filter_mode: Option<String>,
    refresh_strategy: Option<String>,
    state: State<'_, SmartAppManagerState>,
) -> Result<Vec<AppInfo>, String> {
    info!("📱 获取设备 {} 的应用列表", device_id);
    
    let mut managers = state.managers.lock().await;
    let manager = managers
        .entry(device_id.clone())
        .or_insert_with(|| SmartAppManager::new(device_id.clone()));

    // Back compat vs new params
    let include = include_system_apps.unwrap_or(false);
    let force = force_refresh.unwrap_or(false);
    let fm = filter_mode.unwrap_or_else(|| if include { "all".into() } else { "only_user".into() });
    let rs = refresh_strategy.unwrap_or_else(|| if force { "force_refresh".into() } else { "cache_first".into() });

    manager.get_installed_apps_with_modes(&fm, &rs).await.map_err(|e| {
        error!("获取应用列表失败: {}", e);
        format!("获取应用列表失败: {}", e)
    })
}

/// 分页获取应用列表
#[command]
pub async fn get_device_apps_paged(
    device_id: String,
    filter_mode: Option<String>,
    refresh_strategy: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
    query: Option<String>,
    state: State<'_, SmartAppManagerState>,
) -> Result<PagedApps, String> {
    info!("📱 分页获取设备 {} 的应用列表", device_id);
    let mut managers = state.managers.lock().await;
    let manager = managers
        .entry(device_id.clone())
        .or_insert_with(|| SmartAppManager::new(device_id.clone()));

    let fm = filter_mode.unwrap_or_else(|| "only_user".into());
    let rs = refresh_strategy.unwrap_or_else(|| "cache_first".into());
    let current_page = page.unwrap_or(1).max(1);
    let size = page_size.unwrap_or(60).max(1);

    let mut apps = manager.get_installed_apps_with_modes(&fm, &rs)
        .await
        .map_err(|e| format!("获取应用列表失败: {}", e))?;

    // 服务器端搜索过滤（跨全量列表）
    if let Some(q) = query.as_ref().map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty()) {
        apps = apps
            .into_iter()
            .filter(|a| {
                a.app_name.to_lowercase().contains(&q) || a.package_name.to_lowercase().contains(&q)
            })
            .collect();
    }

    let total = apps.len();
    let start = ((current_page - 1) as usize) * (size as usize);
    let end = (start + size as usize).min(total);
    let slice = if start < total { apps[start..end].to_vec() } else { Vec::new() };
    let has_more = end < total;

    Ok(PagedApps { items: slice, total, page: current_page, page_size: size, has_more })
}

/// 按需提取应用图标（PNG字节）
/// force_refresh: 是否跳过磁盘缓存强制重取
#[command]
pub async fn get_app_icon(
    device_id: String,
    package_name: String,
    force_refresh: Option<bool>,
) -> Result<Vec<u8>, String> {
    info!("🖼️ 提取应用图标: {} on {}", package_name, device_id);
    let force = force_refresh.unwrap_or(false);
    tokio::task::block_in_place(|| {
        let cache = IconDiskCache::new();
        let cache_key = package_name.clone(); // 可扩展加入版本信息
        if !force {
            if let Some(bytes) = cache.get(&cache_key) {
                return Ok(bytes);
            }
        }
        let apk = pull_apk_to_temp(&device_id, &package_name)
            .map_err(|e| format!("拉取APK失败: {}", e))?;
        let bytes = extract_icon_from_apk(&apk)
            .map_err(|e| format!("解析图标失败: {}", e))?;
        let _ = cache.put(&cache_key, &bytes);
        Ok(bytes)
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