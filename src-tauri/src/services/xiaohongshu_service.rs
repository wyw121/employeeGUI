use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::{command, State};
use tokio::sync::Mutex;
use tracing::{error, info};

use super::xiaohongshu_automator::{
    AppStatusResult, NavigationResult, XiaohongshuAutomator, XiaohongshuFollowOptions,
    XiaohongshuFollowResult,
};

/// 小红书服务状态管理
pub struct XiaohongshuService {
    automator: Option<XiaohongshuAutomator>,
    current_device_id: Option<String>,
}

impl XiaohongshuService {
    pub fn new() -> Self {
        Self {
            automator: None,
            current_device_id: None,
        }
    }

    pub fn initialize(&mut self, device_id: String) {
        info!("初始化小红书服务，设备ID: {}", device_id);
        self.current_device_id = Some(device_id.clone());
        self.automator = Some(XiaohongshuAutomator::new(device_id));
    }

    pub fn is_initialized(&self) -> bool {
        self.automator.is_some()
    }

    pub fn get_current_device_id(&self) -> Option<&String> {
        self.current_device_id.as_ref()
    }
}

/// 初始化小红书自动化服务
#[command]
pub async fn initialize_xiaohongshu_service(
    service: State<'_, Mutex<XiaohongshuService>>,
    device_id: String,
) -> Result<(), String> {
    info!("🚀 初始化小红书服务，设备ID: {}", device_id);
    
    let mut service = service.lock().await;
    service.initialize(device_id);
    
    Ok(())
}

/// 检查小红书应用状态
#[command]
pub async fn check_xiaohongshu_status(
    service: State<'_, Mutex<XiaohongshuService>>,
) -> Result<AppStatusResult, String> {
    info!("📱 检查小红书应用状态");
    
    let service = service.lock().await;
    
    if let Some(automator) = &service.automator {
        automator
            .check_app_status()
            .await
            .map_err(|e| {
                error!("检查应用状态失败: {}", e);
                e.to_string()
            })
    } else {
        Err("小红书服务未初始化，请先调用初始化方法".to_string())
    }
}

/// 导航到小红书通讯录页面
#[command]
pub async fn navigate_to_contacts_page(
    service: State<'_, Mutex<XiaohongshuService>>,
) -> Result<NavigationResult, String> {
    info!("🧭 导航到小红书通讯录页面");
    
    let service = service.lock().await;
    
    if let Some(automator) = &service.automator {
        automator
            .navigate_to_contacts()
            .await
            .map_err(|e| {
                error!("导航到通讯录页面失败: {}", e);
                e.to_string()
            })
    } else {
        Err("小红书服务未初始化，请先调用初始化方法".to_string())
    }
}

/// 执行小红书自动关注
#[command]
pub async fn auto_follow_contacts(
    service: State<'_, Mutex<XiaohongshuService>>,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<XiaohongshuFollowResult, String> {
    info!("❤️ 开始执行小红书自动关注");
    
    let service = service.lock().await;
    
    if let Some(automator) = &service.automator {
        automator
            .auto_follow(options)
            .await
            .map_err(|e| {
                error!("自动关注执行失败: {}", e);
                e.to_string()
            })
    } else {
        Err("小红书服务未初始化，请先调用初始化方法".to_string())
    }
}

/// 获取当前服务状态
#[command]
pub async fn get_xiaohongshu_service_status(
    service: State<'_, Mutex<XiaohongshuService>>,
) -> Result<XiaohongshuServiceStatus, String> {
    let service = service.lock().await;
    
    Ok(XiaohongshuServiceStatus {
        initialized: service.is_initialized(),
        current_device_id: service.get_current_device_id().cloned(),
    })
}

/// 完整的小红书关注工作流程
/// 包含状态检查 -> 导航 -> 关注的完整流程
#[command]
pub async fn execute_complete_xiaohongshu_workflow(
    service: State<'_, Mutex<XiaohongshuService>>,
    device_id: String,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<CompleteWorkflowResult, String> {
    info!("🚀 执行完整的小红书关注工作流程");
    
    // 1. 初始化服务
    {
        let mut service_guard = service.lock().await;
        service_guard.initialize(device_id.clone());
    }
    
    let service_guard = service.lock().await;
    let automator = service_guard.automator.as_ref().unwrap();
    
    // 2. 检查应用状态
    let app_status = automator
        .check_app_status()
        .await
        .map_err(|e| format!("应用状态检查失败: {}", e))?;
    
    if !app_status.app_installed {
        return Ok(CompleteWorkflowResult {
            initialization: true,
            app_status,
            navigation: NavigationResult {
                success: false,
                message: "小红书应用未安装".to_string(),
            },
            follow_result: XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: "应用未安装，无法执行关注".to_string(),
            },
        });
    }
    
    // 3. 导航到通讯录页面
    let navigation = automator
        .navigate_to_contacts()
        .await
        .map_err(|e| format!("导航失败: {}", e))?;
    
    if !navigation.success {
        return Ok(CompleteWorkflowResult {
            initialization: true,
            app_status,
            navigation,
            follow_result: XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: "导航失败，无法执行关注".to_string(),
            },
        });
    }
    
    // 4. 执行自动关注
    let follow_result = automator
        .auto_follow(options)
        .await
        .map_err(|e| format!("自动关注失败: {}", e))?;
    
    Ok(CompleteWorkflowResult {
        initialization: true,
        app_status,
        navigation,
        follow_result,
    })
}

/// 小红书服务状态
#[derive(Debug, Serialize, Deserialize)]
pub struct XiaohongshuServiceStatus {
    pub initialized: bool,
    pub current_device_id: Option<String>,
}

/// 完整工作流程结果
#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteWorkflowResult {
    pub initialization: bool,
    pub app_status: AppStatusResult,
    pub navigation: NavigationResult,
    pub follow_result: XiaohongshuFollowResult,
}