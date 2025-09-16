use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{command, State};
use tokio::sync::Mutex;
use tracing::{error, info};

use super::xiaohongshu_long_connection_automator::XiaohongshuLongConnectionAutomator;
use super::xiaohongshu_automator::{
    AppStatusResult, NavigationResult, XiaohongshuFollowOptions, XiaohongshuFollowResult,
};

/// 小红书长连接服务管理器
pub struct XiaohongshuLongConnectionService {
    automator: Option<Arc<XiaohongshuLongConnectionAutomator>>,
    current_device_id: Option<String>,
    is_connected: bool,
}

impl XiaohongshuLongConnectionService {
    pub fn new() -> Self {
        Self {
            automator: None,
            current_device_id: None,
            is_connected: false,
        }
    }

    /// 初始化并建立长连接
    pub async fn initialize(&mut self, device_id: String) -> Result<()> {
        info!("🔌 初始化小红书长连接服务，设备ID: {}", device_id);
        
        // 如果已有连接，先清理
        if let Some(automator) = &self.automator {
            let _ = automator.cleanup().await;
        }

        // 创建新的长连接自动化器
        let automator = Arc::new(XiaohongshuLongConnectionAutomator::new(device_id.clone()).await?);
        
        // 初始化连接
        automator.initialize().await?;
        
        self.automator = Some(automator);
        self.current_device_id = Some(device_id);
        self.is_connected = true;
        
        info!("✅ 小红书长连接服务初始化成功");
        Ok(())
    }

    pub fn is_initialized(&self) -> bool {
        self.automator.is_some() && self.is_connected
    }

    pub fn get_current_device_id(&self) -> Option<&String> {
        self.current_device_id.as_ref()
    }

    /// 清理连接
    pub async fn cleanup(&mut self) {
        if let Some(automator) = &self.automator {
            let _ = automator.cleanup().await;
        }
        self.automator = None;
        self.is_connected = false;
        info!("🧹 小红书长连接服务已清理");
    }
}

/// 初始化小红书长连接服务
#[command]
pub async fn initialize_xiaohongshu_long_connection_service(
    service: State<'_, Mutex<XiaohongshuLongConnectionService>>,
    device_id: String,
) -> Result<(), String> {
    info!("🚀 初始化小红书长连接服务，设备ID: {}", device_id);
    
    let mut service = service.lock().await;
    
    match service.initialize(device_id).await {
        Ok(()) => {
            info!("✅ 小红书长连接服务初始化成功");
            Ok(())
        }
        Err(e) => {
            error!("❌ 初始化小红书长连接服务失败: {}", e);
            Err(format!("初始化失败: {}", e))
        }
    }
}

/// 检查小红书应用状态（长连接版本）
#[command]
pub async fn check_xiaohongshu_app_status_long_connection(
    service: State<'_, Mutex<XiaohongshuLongConnectionService>>,
) -> Result<AppStatusResult, String> {
    let service = service.lock().await;
    
    if !service.is_initialized() {
        return Err("服务未初始化".to_string());
    }

    let automator = service.automator.as_ref().unwrap();
    
    match automator.check_app_status().await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("检查应用状态失败: {}", e);
            Err(format!("检查失败: {}", e))
        }
    }
}

/// 启动小红书应用（长连接版本）
#[command]
pub async fn launch_xiaohongshu_app_long_connection(
    service: State<'_, Mutex<XiaohongshuLongConnectionService>>,
) -> Result<NavigationResult, String> {
    let service = service.lock().await;
    
    if !service.is_initialized() {
        return Err("服务未初始化".to_string());
    }

    let automator = service.automator.as_ref().unwrap();
    
    match automator.launch_app().await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("启动应用失败: {}", e);
            Err(format!("启动失败: {}", e))
        }
    }
}

/// 导航到发现好友页面（长连接版本）
#[command]
pub async fn navigate_to_discover_friends_long_connection(
    service: State<'_, Mutex<XiaohongshuLongConnectionService>>,
) -> Result<NavigationResult, String> {
    let service = service.lock().await;
    
    if !service.is_initialized() {
        return Err("服务未初始化".to_string());
    }

    let automator = service.automator.as_ref().unwrap();
    
    match automator.navigate_to_discover_friends().await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("导航失败: {}", e);
            Err(format!("导航失败: {}", e))
        }
    }
}

/// 执行自动关注（长连接版本，性能大幅提升）
#[command]
pub async fn execute_auto_follow_long_connection(
    service: State<'_, Mutex<XiaohongshuLongConnectionService>>,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<XiaohongshuFollowResult, String> {
    let service = service.lock().await;
    
    if !service.is_initialized() {
        return Err("服务未初始化".to_string());
    }

    let automator = service.automator.as_ref().unwrap();
    
    info!("🚀 开始执行长连接自动关注");
    
    match automator.auto_follow(options).await {
        Ok(result) => {
            info!("✅ 长连接自动关注完成: 关注 {} 个用户，用时 {}ms", 
                  result.total_followed, result.duration);
            Ok(result)
        }
        Err(e) => {
            error!("❌ 长连接自动关注失败: {}", e);
            Err(format!("自动关注失败: {}", e))
        }
    }
}

/// 完整的长连接工作流程
#[command]
pub async fn execute_complete_workflow_long_connection(
    service: State<'_, Mutex<XiaohongshuLongConnectionService>>,
    device_id: String,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<CompleteWorkflowResult, String> {
    info!("🚀 执行完整的小红书长连接工作流程");
    
    // 初始化服务
    let mut service = service.lock().await;
    if !service.is_initialized() || service.get_current_device_id() != Some(&device_id) {
        service.initialize(device_id.clone()).await.map_err(|e| format!("初始化失败: {}", e))?;
    }
    
    let automator = service.automator.as_ref().unwrap().clone();
    drop(service); // 释放锁，允许其他操作
    
    // 执行完整流程
    match execute_full_workflow_steps(automator, options).await {
        Ok(result) => {
            info!("✅ 长连接工作流程执行完成");
            Ok(result)
        }
        Err(e) => {
            error!("❌ 长连接工作流程执行失败: {}", e);
            Err(format!("工作流程失败: {}", e))
        }
    }
}

/// 执行完整工作流程步骤
async fn execute_full_workflow_steps(
    automator: Arc<XiaohongshuLongConnectionAutomator>,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<CompleteWorkflowResult> {
    let workflow_start = std::time::Instant::now();
    
    // 1. 检查应用状态
    info!("📋 步骤 1: 检查应用状态");
    let app_status = automator.check_app_status().await?;
    
    if !app_status.app_installed {
        return Ok(CompleteWorkflowResult {
            success: false,
            message: "小红书应用未安装".to_string(),
            app_status: Some(app_status),
            navigation_result: None,
            follow_result: XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: workflow_start.elapsed().as_millis() as u64,
                details: vec![],
                message: "应用未安装".to_string(),
            },
        });
    }

    // 2. 启动应用（如果未运行）
    let navigation_result = if !app_status.app_running {
        info!("📋 步骤 2: 启动小红书应用");
        Some(automator.launch_app().await?)
    } else {
        info!("📋 步骤 2: 应用已运行，跳过启动");
        None
    };

    // 3. 导航到发现好友页面
    info!("📋 步骤 3: 导航到发现好友页面");
    automator.navigate_to_discover_friends().await?;

    // 4. 执行自动关注
    info!("📋 步骤 4: 开始自动关注流程");
    let follow_result = automator.auto_follow(options).await?;

    let total_duration = workflow_start.elapsed().as_millis() as u64;
    
    Ok(CompleteWorkflowResult {
        success: true,
        message: format!("长连接工作流程成功完成！关注了 {} 个用户，总用时 {}ms", 
                        follow_result.total_followed, total_duration),
        app_status: Some(app_status),
        navigation_result,
        follow_result,
    })
}

/// 清理长连接服务
#[command]
pub async fn cleanup_xiaohongshu_long_connection_service(
    service: State<'_, Mutex<XiaohongshuLongConnectionService>>,
) -> Result<(), String> {
    let mut service = service.lock().await;
    service.cleanup().await;
    Ok(())
}

/// 完整工作流程结果
#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteWorkflowResult {
    pub success: bool,
    pub message: String,
    pub app_status: Option<AppStatusResult>,
    pub navigation_result: Option<NavigationResult>,
    pub follow_result: XiaohongshuFollowResult,
}