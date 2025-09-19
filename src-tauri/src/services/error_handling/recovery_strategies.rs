/// 恢复策略系统 - 针对不同错误类型提供具体的恢复行动
use crate::services::error_handling::ErrorType;
use anyhow::Result;
use std::process::Command;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, warn, debug, error};

/// 恢复动作结果
#[derive(Debug)]
pub enum RecoveryResult {
    Success(String),           // 恢复成功，包含描述信息
    PartialRecovery(String),   // 部分恢复，可能需要进一步处理
    Failed(String),            // 恢复失败，包含错误信息
    NotApplicable,             // 不适用的恢复策略
}

/// 恢复策略管理器
pub struct RecoveryStrategies {
    pub adb_path: String,
    pub device_id: Option<String>,
    pub recovery_timeout: Duration,
}

impl RecoveryStrategies {
    pub fn new(adb_path: String, device_id: Option<String>) -> Self {
        Self {
            adb_path,
            device_id,
            recovery_timeout: Duration::from_secs(30),
        }
    }

    /// 执行恢复策略
    pub async fn execute_recovery(&self, error_type: &ErrorType, error_message: &str) -> Result<RecoveryResult> {
        info!("🔧 开始执行恢复策略: {:?}", error_type);
        debug!("错误信息: {}", error_message);

        let result = match error_type {
            ErrorType::UiDumpFailed => self.recover_ui_dump().await,
            ErrorType::DeviceNotFound => self.recover_device_connection().await,
            ErrorType::DeviceBusy => self.recover_device_busy().await,
            ErrorType::PermissionDenied => self.recover_permission_denied().await,
            ErrorType::TemporaryConnectionLoss => self.recover_connection_loss().await,
            ErrorType::ServiceTemporarilyUnavailable => self.recover_service_unavailable().await,
            ErrorType::AdbCommandFailed => self.recover_adb_command_failed(error_message).await,
            ErrorType::ElementNotFound => self.recover_element_not_found().await,
            ErrorType::Unknown => self.recover_unknown_error(error_message).await,
            _ => {
                warn!("⚠️  没有可用的恢复策略: {:?}", error_type);
                Ok(RecoveryResult::NotApplicable)
            }
        };

        match &result {
            Ok(RecoveryResult::Success(msg)) => info!("✅ 恢复成功: {}", msg),
            Ok(RecoveryResult::PartialRecovery(msg)) => warn!("⚠️  部分恢复: {}", msg),
            Ok(RecoveryResult::Failed(msg)) => error!("❌ 恢复失败: {}", msg),
            Ok(RecoveryResult::NotApplicable) => debug!("🚫 恢复策略不适用"),
            Err(e) => error!("💥 恢复过程出错: {}", e),
        }

        result
    }

    /// 恢复 UI dump 失败
    async fn recover_ui_dump(&self) -> Result<RecoveryResult> {
        info!("🔄 尝试恢复 UI dump 功能...");
        
        let device_arg = self.get_device_arg();
        
        // 策略 1: 清理旧的 UI dump 文件
        debug!("清理旧的 UI dump 文件...");
        let cleanup_result = Command::new(&self.adb_path)
            .args(&[&device_arg, "shell", "rm", "-f", "/sdcard/ui_dump.xml"])
            .output();

        match cleanup_result {
            Ok(output) if output.status.success() => {
                debug!("✅ 旧文件清理成功");
            }
            _ => {
                debug!("⚠️  旧文件清理失败或无需清理");
            }
        }

        // 策略 2: 等待设备稳定
        debug!("等待设备稳定...");
        sleep(Duration::from_millis(500)).await;

        // 策略 3: 检查 UI Automator 服务状态
        debug!("检查 UI Automator 服务状态...");
        let service_check = Command::new(&self.adb_path)
            .args(&[&device_arg, "shell", "dumpsys", "activity", "services", "com.android.commands.uiautomator"])
            .output();

        let service_available = match service_check {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                !output_str.contains("Unable to find service")
            }
            Err(_) => false,
        };

        if !service_available {
            warn!("⚠️  UI Automator 服务可能不可用");
            return Ok(RecoveryResult::PartialRecovery(
                "UI Automator 服务状态异常，但可以继续尝试".to_string()
            ));
        }

        // 策略 4: 重新启动 UI Automator (如果需要)
        debug!("准备重新尝试 UI dump...");
        sleep(Duration::from_millis(200)).await;

        Ok(RecoveryResult::Success(
            "UI dump 恢复策略执行完成，可以重新尝试".to_string()
        ))
    }

    /// 恢复设备连接
    async fn recover_device_connection(&self) -> Result<RecoveryResult> {
        info!("🔄 尝试恢复设备连接...");

        // 策略 1: 重新启动 ADB 服务
        debug!("重新启动 ADB 服务...");
        let kill_result = Command::new(&self.adb_path)
            .args(&["kill-server"])
            .output();

        if let Err(e) = kill_result {
            warn!("终止 ADB 服务失败: {}", e);
        }

        sleep(Duration::from_secs(1)).await;

        let start_result = Command::new(&self.adb_path)
            .args(&["start-server"])
            .output();

        match start_result {
            Ok(output) if output.status.success() => {
                debug!("✅ ADB 服务重启成功");
            }
            _ => {
                error!("❌ ADB 服务重启失败");
                return Ok(RecoveryResult::Failed("ADB 服务重启失败".to_string()));
            }
        }

        // 策略 2: 检查设备连接
        sleep(Duration::from_millis(500)).await;
        debug!("检查设备连接状态...");
        
        let devices_result = Command::new(&self.adb_path)
            .args(&["devices"])
            .output();

        match devices_result {
            Ok(output) => {
                let devices_output = String::from_utf8_lossy(&output.stdout);
                debug!("设备列表: {}", devices_output);
                
                if devices_output.contains("device") && !devices_output.contains("offline") {
                    Ok(RecoveryResult::Success("设备连接已恢复".to_string()))
                } else if devices_output.contains("offline") {
                    Ok(RecoveryResult::PartialRecovery("设备显示为离线状态".to_string()))
                } else {
                    Ok(RecoveryResult::Failed("未找到可用设备".to_string()))
                }
            }
            Err(e) => {
                error!("检查设备连接失败: {}", e);
                Ok(RecoveryResult::Failed(format!("设备检查失败: {}", e)))
            }
        }
    }

    /// 恢复设备忙碌状态
    async fn recover_device_busy(&self) -> Result<RecoveryResult> {
        info!("🔄 处理设备忙碌状态...");
        
        let device_arg = self.get_device_arg();

        // 策略 1: 等待设备空闲
        debug!("等待设备处理完当前任务...");
        sleep(Duration::from_secs(2)).await;

        // 策略 2: 检查是否有其他进程在使用设备
        debug!("检查设备进程状态...");
        let process_check = Command::new(&self.adb_path)
            .args(&[&device_arg, "shell", "ps", "|", "grep", "uiautomator"])
            .output();

        match process_check {
            Ok(output) => {
                let processes = String::from_utf8_lossy(&output.stdout);
                if processes.trim().is_empty() {
                    debug!("✅ 未发现冲突的 UI Automator 进程");
                } else {
                    debug!("⚠️  发现运行中的 UI Automator 进程: {}", processes);
                }
            }
            Err(_) => {
                debug!("⚠️  无法检查进程状态");
            }
        }

        // 策略 3: 短暂延迟后重试
        sleep(Duration::from_millis(800)).await;

        Ok(RecoveryResult::Success("设备忙碌状态处理完成".to_string()))
    }

    /// 恢复权限被拒绝错误
    async fn recover_permission_denied(&self) -> Result<RecoveryResult> {
        warn!("🔄 处理权限被拒绝错误...");
        
        let device_arg = self.get_device_arg();

        // 策略 1: 检查 ADB 调试权限
        debug!("检查 ADB 调试权限...");
        let auth_check = Command::new(&self.adb_path)
            .args(&[&device_arg, "shell", "getprop", "ro.debuggable"])
            .output();

        match auth_check {
            Ok(output) => {
                let prop_value = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if prop_value != "1" {
                    warn!("⚠️  设备调试属性异常: {}", prop_value);
                }
            }
            Err(_) => {
                warn!("⚠️  无法检查设备调试属性");
            }
        }

        // 策略 2: 尝试重新获取权限 (有限操作)
        debug!("尝试重新确认设备授权...");
        let reconnect_result = Command::new(&self.adb_path)
            .args(&["reconnect", "device"])
            .output();

        match reconnect_result {
            Ok(output) if output.status.success() => {
                debug!("✅ 设备重新连接成功");
                sleep(Duration::from_secs(1)).await;
                Ok(RecoveryResult::Success("权限问题已处理，设备重新连接".to_string()))
            }
            _ => {
                Ok(RecoveryResult::PartialRecovery(
                    "权限问题可能需要手动处理，请检查设备USB调试授权".to_string()
                ))
            }
        }
    }

    /// 恢复临时连接丢失
    async fn recover_connection_loss(&self) -> Result<RecoveryResult> {
        info!("🔄 处理临时连接丢失...");

        // 策略 1: 等待连接自动恢复
        debug!("等待连接自动恢复...");
        sleep(Duration::from_secs(3)).await;

        // 策略 2: 主动重连
        debug!("尝试主动重连...");
        let reconnect_result = Command::new(&self.adb_path)
            .args(&["reconnect"])
            .output();

        match reconnect_result {
            Ok(output) if output.status.success() => {
                sleep(Duration::from_secs(1)).await;
                
                // 验证连接恢复
                let verify_result = Command::new(&self.adb_path)
                    .args(&["devices"])
                    .output();
                
                match verify_result {
                    Ok(output) => {
                        let devices_output = String::from_utf8_lossy(&output.stdout);
                        if devices_output.contains("device") {
                            Ok(RecoveryResult::Success("连接已恢复".to_string()))
                        } else {
                            Ok(RecoveryResult::Failed("重连后仍无法找到设备".to_string()))
                        }
                    }
                    Err(e) => Ok(RecoveryResult::Failed(format!("连接验证失败: {}", e)))
                }
            }
            _ => Ok(RecoveryResult::Failed("设备重连失败".to_string()))
        }
    }

    /// 恢复服务临时不可用
    async fn recover_service_unavailable(&self) -> Result<RecoveryResult> {
        info!("🔄 处理服务临时不可用...");

        // 策略 1: 等待服务恢复
        debug!("等待服务自动恢复...");
        sleep(Duration::from_secs(5)).await;

        // 策略 2: 检查服务状态
        let device_arg = self.get_device_arg();
        let service_check = Command::new(&self.adb_path)
            .args(&[&device_arg, "shell", "service", "check", "activity"])
            .output();

        match service_check {
            Ok(output) => {
                let service_status = String::from_utf8_lossy(&output.stdout);
                if service_status.contains("found") {
                    Ok(RecoveryResult::Success("系统服务已恢复".to_string()))
                } else {
                    Ok(RecoveryResult::PartialRecovery("服务状态仍然异常".to_string()))
                }
            }
            Err(_) => Ok(RecoveryResult::PartialRecovery("无法检查服务状态".to_string()))
        }
    }

    /// 恢复 ADB 命令失败
    async fn recover_adb_command_failed(&self, error_message: &str) -> Result<RecoveryResult> {
        info!("🔄 处理 ADB 命令失败...");
        debug!("错误详情: {}", error_message);

        // 根据具体错误信息决定恢复策略
        if error_message.contains("device offline") {
            self.recover_device_connection().await
        } else if error_message.contains("no devices") {
            self.recover_device_connection().await
        } else if error_message.contains("permission denied") {
            self.recover_permission_denied().await
        } else if error_message.contains("device not found") {
            self.recover_device_connection().await
        } else {
            // 通用恢复策略
            debug!("应用通用 ADB 恢复策略...");
            sleep(Duration::from_millis(500)).await;
            Ok(RecoveryResult::PartialRecovery("应用了通用恢复策略".to_string()))
        }
    }

    /// 恢复元素未找到错误
    async fn recover_element_not_found(&self) -> Result<RecoveryResult> {
        info!("🔄 处理元素未找到错误...");

        // 策略 1: 等待界面稳定
        debug!("等待界面稳定...");
        sleep(Duration::from_millis(800)).await;

        // 策略 2: 建议刷新 UI dump
        Ok(RecoveryResult::PartialRecovery(
            "建议重新获取 UI 结构信息".to_string()
        ))
    }

    /// 处理未知错误
    async fn recover_unknown_error(&self, error_message: &str) -> Result<RecoveryResult> {
        warn!("🔄 处理未知错误类型...");
        debug!("错误信息: {}", error_message);

        // 通用恢复策略：短暂延迟
        sleep(Duration::from_millis(300)).await;

        Ok(RecoveryResult::PartialRecovery(
            format!("应用了通用恢复策略，原始错误: {}", error_message)
        ))
    }

    /// 获取设备参数
    fn get_device_arg(&self) -> String {
        match &self.device_id {
            Some(id) => format!("-s {}", id),
            None => "-d".to_string(),
        }
    }

    /// 设置恢复超时时间
    pub fn set_recovery_timeout(&mut self, timeout: Duration) {
        self.recovery_timeout = timeout;
    }

    /// 批量恢复策略 (用于复杂错误场景)
    pub async fn execute_multi_step_recovery(&self, error_types: Vec<ErrorType>) -> Result<Vec<RecoveryResult>> {
        info!("🔧 执行多步骤恢复策略，涉及 {} 种错误类型", error_types.len());
        
        let mut results = Vec::new();
        
        for (index, error_type) in error_types.iter().enumerate() {
            debug!("执行第 {} 步恢复: {:?}", index + 1, error_type);
            
            let result = self.execute_recovery(error_type, "多步骤恢复").await?;
            results.push(result);
            
            // 步骤间延迟
            if index < error_types.len() - 1 {
                sleep(Duration::from_millis(200)).await;
            }
        }
        
        info!("✅ 多步骤恢复完成，共 {} 个步骤", results.len());
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_recovery_strategies_creation() {
        let strategies = RecoveryStrategies::new("adb".to_string(), Some("test_device".to_string()));
        assert_eq!(strategies.adb_path, "adb");
        assert_eq!(strategies.device_id, Some("test_device".to_string()));
    }

    #[tokio::test]
    async fn test_device_arg_generation() {
        let strategies1 = RecoveryStrategies::new("adb".to_string(), Some("device123".to_string()));
        assert_eq!(strategies1.get_device_arg(), "-s device123");
        
        let strategies2 = RecoveryStrategies::new("adb".to_string(), None);
        assert_eq!(strategies2.get_device_arg(), "-d");
    }
}