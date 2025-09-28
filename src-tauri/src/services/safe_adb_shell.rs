use tauri::command;
use tracing::{info, error};
use crate::services::safe_adb_manager::SafeAdbManager;

/// 安全的ADB Shell命令执行器
/// 
/// 提供安全的ADB shell命令执行功能，
/// 自动处理ADB路径发现和设备连接验证
#[tauri::command]
#[allow(non_snake_case)]
pub async fn safe_adb_shell_command(
    deviceId: String,
    shellCommand: String,
) -> Result<String, String> {
    info!(
        "🔧 开始执行安全Shell命令: {} (设备: {})",
        shellCommand, deviceId
    );

    let mut adb_manager = SafeAdbManager::new();

    // 确保ADB路径可用
    if let Err(e) = adb_manager.find_safe_adb_path() {
        return Err(format!("未找到安全的ADB路径: {}", e));
    }

    // 检查设备是否在线
    match adb_manager.is_device_online(&deviceId) {
        Ok(true) => {
            info!("✅ 设备 {} 在线", deviceId);
        }
        Ok(false) => {
            return Err(format!("设备 {} 不在线或未连接", deviceId));
        }
        Err(e) => {
            return Err(format!("检查设备状态失败: {}", e));
        }
    }

    // 执行shell命令
    let args = vec!["-s", &deviceId, "shell", &shellCommand];
    match adb_manager.execute_adb_command(&args.iter().map(|s| *s).collect::<Vec<_>>()) {
        Ok(output) => {
            info!("🎉 Shell命令执行成功");
            Ok(output)
        }
        Err(e) => {
            error!("💥 Shell命令执行失败: {}", e);
            Err(format!("Shell命令执行失败: {}", e))
        }
    }
}