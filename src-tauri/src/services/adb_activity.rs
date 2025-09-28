use tauri::command;
use serde::{Deserialize, Serialize};
use crate::services::safe_adb_manager::SafeAdbManager;

#[derive(Debug, Serialize, Deserialize)]
pub struct AdbActivityResult {
    pub success: bool,
    pub message: String,
    pub output: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartActivityRequest {
    pub device_id: String,
    pub action: String,
    pub data_uri: Option<String>,
    pub mime_type: Option<String>,
    pub component: Option<String>,
}

/// 启动Android Activity
#[command]
pub async fn adb_start_activity(
    device_id: String,
    action: String,
    data_uri: Option<String>,
    mime_type: Option<String>,
    component: Option<String>,
) -> Result<AdbActivityResult, String> {
    tracing::info!("🚀 启动Activity: device={}, action={}", device_id, action);

    let mut safe_adb = SafeAdbManager::new();
    
    // 确保找到安全的ADB路径
    if let Err(e) = safe_adb.find_safe_adb_path() {
        return Ok(AdbActivityResult {
            success: false,
            message: format!("无法找到ADB路径: {}", e),
            output: String::new(),
        });
    }

    // 验证设备连接
    match safe_adb.is_device_online(&device_id) {
        Ok(false) | Err(_) => {
            return Ok(AdbActivityResult {
                success: false,
                message: format!("设备 {} 未连接或检测失败", device_id),
                output: String::new(),
            });
        }
        Ok(true) => {
            // 设备在线，继续执行
        }
    }

    // 构建 am start 命令参数
    let mut cmd_args = vec!["-s".to_string(), device_id.clone(), "shell".to_string(), "am".to_string(), "start".to_string()];

    // 添加 action
    if !action.is_empty() {
        cmd_args.push("-a".to_string());
        cmd_args.push(action);
    }

    // 添加 data URI
    if let Some(ref uri) = data_uri {
        if !uri.is_empty() {
            cmd_args.push("-d".to_string());
            cmd_args.push(uri.clone());
        }
    }

    // 添加 MIME type
    if let Some(ref mime) = mime_type {
        if !mime.is_empty() {
            cmd_args.push("-t".to_string());
            cmd_args.push(mime.clone());
        }
    }

    // 添加 component
    if let Some(ref comp) = component {
        if !comp.is_empty() {
            cmd_args.push("-n".to_string());
            cmd_args.push(comp.clone());
        }
    }

    tracing::debug!("🔧 ADB命令参数: {:?}", cmd_args);

    // 使用安全ADB执行命令
    let cmd_args_str: Vec<&str> = cmd_args.iter().map(|s| s.as_str()).collect();
    match safe_adb.execute_adb_command_async(&cmd_args_str).await {
        Ok(output) => {
            let success = !output.contains("Error") && !output.contains("error");
            
            tracing::info!("📱 Activity启动结果: success={}, output={}", 
                success, output.trim());

            Ok(AdbActivityResult {
                success,
                message: if success { 
                    "Activity启动成功".to_string() 
                } else { 
                    format!("Activity启动失败: {}", output.trim())
                },
                output: output.trim().to_string(),
            })
        }
        Err(e) => {
            let error_msg = format!("执行ADB命令失败: {}", e);
            tracing::error!("❌ {}", error_msg);
            
            Ok(AdbActivityResult {
                success: false,
                message: error_msg,
                output: String::new(),
            })
        }
    }
}

/// 启动联系人应用
#[command]
pub async fn adb_open_contacts_app(device_id: String) -> Result<AdbActivityResult, String> {
    tracing::info!("📱 打开联系人应用: device={}", device_id);
    
    adb_start_activity(
        device_id,
        "android.intent.action.MAIN".to_string(),
        None,
        None,
        Some("com.android.contacts/.activities.PeopleActivity".to_string()),
    ).await
}

/// 使用 VIEW Intent 打开文件
#[command]
pub async fn adb_view_file(
    device_id: String,
    file_path: String,
    mime_type: Option<String>,
) -> Result<AdbActivityResult, String> {
    tracing::info!("📄 打开文件: device={}, file={}", device_id, file_path);
    
    adb_start_activity(
        device_id,
        "android.intent.action.VIEW".to_string(),
        Some(format!("file://{}", file_path)),
        mime_type,
        None,
    ).await
}