use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::{command, State};
use tokio::sync::Mutex;
use tracing::{error, info};

use super::xiaohongshu_automator::{
    AppStatusResult, NavigationResult, XiaohongshuAutomator, XiaohongshuFollowOptions,
    XiaohongshuFollowResult,
};
use super::xiaohongshu_automator::app_status::AppStatusExt;
use super::xiaohongshu_automator::navigation::NavigationExt;
use super::xiaohongshu_automator::follow_automation::FollowAutomationExt;


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
        // 🔍 操作前预检查
        match perform_pre_operation_check(automator).await {
            Ok(_) => info!("✅ 操作前检查通过"),
            Err(e) => {
                error!("❌ 操作前检查失败: {}", e);
                return Err(format!("操作前检查失败: {}", e));
            }
        }

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

/// 批量关注通讯录页面中的所有联系人（优化版本）
#[command]
pub async fn batch_follow_all_contacts(
    service: State<'_, Mutex<XiaohongshuService>>,
    max_follows: Option<usize>,
) -> Result<BatchFollowResult, String> {
    info!("🚀 开始批量关注通讯录中的所有联系人");
    
    let service = service.lock().await;
    
    if let Some(automator) = &service.automator {
        let max_count = max_follows.unwrap_or(10);
        
        match automator.batch_follow_all_contacts_in_page(max_count).await {
            Ok(results) => {
                let successful_count = results.iter()
                    .filter(|r| matches!(r.status, super::xiaohongshu_automator::types::FollowStatus::Success))
                    .count();
                
                Ok(BatchFollowResult {
                    success: true,
                    total_processed: results.len(),
                    successful_follows: successful_count,
                    failed_follows: results.len() - successful_count,
                    results: results.into_iter().map(|r| FollowResultSummary {
                        user_name: r.user_name,
                        status: format!("{:?}", r.status),
                        message: r.message,
                        timestamp: r.timestamp.to_rfc3339(),
                    }).collect(),
                    message: format!("批量关注完成，成功关注 {} 个联系人", successful_count),
                })
            }
            Err(e) => {
                error!("批量关注执行失败: {}", e);
                Ok(BatchFollowResult {
                    success: false,
                    total_processed: 0,
                    successful_follows: 0,
                    failed_follows: 0,
                    results: vec![],
                    message: format!("批量关注失败: {}", e),
                })
            }
        }
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

/// 批量关注结果
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchFollowResult {
    pub success: bool,
    pub total_processed: usize,
    pub successful_follows: usize,
    pub failed_follows: usize,
    pub results: Vec<FollowResultSummary>,
    pub message: String,
}

/// 关注结果摘要
#[derive(Debug, Serialize, Deserialize)]
pub struct FollowResultSummary {
    pub user_name: String,
    pub status: String,
    pub message: String,
    pub timestamp: String,
}

/// 🔍 操作前预检查：确保设备和应用状态正常
async fn perform_pre_operation_check(automator: &XiaohongshuAutomator) -> Result<()> {
    info!("🔍 执行操作前预检查...");
    
    // 检查1: 设备连接状态
    if let Err(e) = automator.execute_adb_command(&["devices"]) {
        return Err(anyhow::anyhow!("设备连接检查失败: {}", e));
    }
    
    // 检查2: 应用状态
    let app_status = automator.check_app_status().await.map_err(|e| {
        anyhow::anyhow!("应用状态检查失败: {}", e)
    })?;
    
    if !app_status.app_running {
        return Err(anyhow::anyhow!("小红书应用未在运行"));
    }
    
    // 简化前台检查逻辑，因为app_status不包含is_foreground字段
    info!("⚠️ 确保小红书应用在前台");
    if let Err(e) = automator.execute_adb_command(&[
        "shell", "am", "start", "-n", "com.xingin.xhs/.index.IndexActivity"
    ]) {
        return Err(anyhow::anyhow!("切换应用到前台失败: {}", e));
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
    
    // 检查3: 页面状态基本验证
    use super::xiaohongshu_automator::page_recognition::PageRecognitionExt;
    let page_state = automator.recognize_current_page().await.map_err(|e| {
        anyhow::anyhow!("页面状态识别失败: {}", e)
    })?;
    
    if page_state.confidence < 0.5 {
        return Err(anyhow::anyhow!("页面识别置信度过低: {:.2}", page_state.confidence));
    }
    
    info!("✅ 操作前预检查全部通过");
    Ok(())
}