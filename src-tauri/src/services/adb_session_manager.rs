use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info, warn};
use anyhow::Result;

use crate::services::adb_shell_session::AdbShellSession;

/// ADB Shell会话管理器
/// 负责维护设备到会话的映射，确保会话的生命周期管理
pub struct AdbSessionManager {
    /// 设备ID到会话的映射
    sessions: Arc<Mutex<HashMap<String, Arc<AdbShellSession>>>>,
    /// ADB路径
    adb_path: String,
}

impl AdbSessionManager {
    /// 创建新的会话管理器
    pub fn new() -> Self {
        let adb_path = crate::utils::adb_utils::get_adb_path();
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            adb_path,
        }
    }

    /// 获取设备的会话，如果不存在或无效则创建新会话
    pub async fn get_session(&self, device_id: &str) -> Result<Arc<AdbShellSession>> {
        let mut sessions = self.sessions.lock().await;
        
        // 检查是否已有会话
        if let Some(session) = sessions.get(device_id) {
            // 检查会话是否仍然有效
            if self.is_session_alive(session).await {
                info!("🔄 复用现有ADB Shell会话 - 设备: {}", device_id);
                return Ok(session.clone());
            } else {
                warn!("⚠️ 检测到无效会话，移除 - 设备: {}", device_id);
                sessions.remove(device_id);
            }
        }

        // 创建新会话
        info!("🆕 创建新的ADB Shell会话 - 设备: {}", device_id);
        let session = Arc::new(AdbShellSession::new(device_id.to_string(), self.adb_path.clone()));
        
        // 建立连接
        match session.connect().await {
            Ok(_) => {
                info!("✅ ADB Shell会话建立成功 - 设备: {}", device_id);
                sessions.insert(device_id.to_string(), session.clone());
                Ok(session)
            }
            Err(e) => {
                error!("❌ ADB Shell会话建立失败 - 设备: {}, 错误: {}", device_id, e);
                Err(e)
            }
        }
    }

    /// 检查会话是否仍然活跃
    async fn is_session_alive(&self, session: &Arc<AdbShellSession>) -> bool {
        // 执行简单的echo命令测试会话
        match session.execute_command("echo test").await {
            Ok(output) => {
                let result = output.trim() == "test";
                if !result {
                    warn!("🔍 会话健康检查失败: 预期'test'，实际'{}'", output);
                }
                result
            }
            Err(e) => {
                warn!("🔍 会话健康检查失败: {}", e);
                false
            }
        }
    }

    /// 主动移除设备的会话
    pub async fn remove_session(&self, device_id: &str) {
        let mut sessions = self.sessions.lock().await;
        if sessions.remove(device_id).is_some() {
            info!("🗑️ 移除设备会话 - 设备: {}", device_id);
        }
    }

    /// 清理所有会话
    pub async fn clear_all_sessions(&self) {
        let mut sessions = self.sessions.lock().await;
        let count = sessions.len();
        sessions.clear();
        info!("🧹 清理所有ADB Shell会话，共 {} 个", count);
    }

    /// 获取当前活跃会话数量
    pub async fn get_active_session_count(&self) -> usize {
        let sessions = self.sessions.lock().await;
        sessions.len()
    }

    /// 健康检查所有会话，移除无效会话
    pub async fn health_check(&self) {
        let sessions = self.sessions.lock().await;
        let device_ids: Vec<String> = sessions.keys().cloned().collect();
        drop(sessions);

        let mut invalid_devices = Vec::new();
        
        for device_id in device_ids {
            let sessions = self.sessions.lock().await;
            if let Some(session) = sessions.get(&device_id) {
                let session_clone = session.clone();
                drop(sessions);
                
                if !self.is_session_alive(&session_clone).await {
                    invalid_devices.push(device_id);
                }
            }
        }

        // 移除无效会话
        if !invalid_devices.is_empty() {
            let mut sessions = self.sessions.lock().await;
            for device_id in invalid_devices {
                sessions.remove(&device_id);
                warn!("🔄 健康检查移除无效会话 - 设备: {}", device_id);
            }
        }
    }
}

/// 全局会话管理器实例
lazy_static::lazy_static! {
    pub static ref GLOBAL_SESSION_MANAGER: AdbSessionManager = AdbSessionManager::new();
}

/// 获取设备的ADB Shell会话
pub async fn get_device_session(device_id: &str) -> Result<Arc<AdbShellSession>> {
    GLOBAL_SESSION_MANAGER.get_session(device_id).await
}

/// 移除设备会话
pub async fn remove_device_session(device_id: &str) {
    GLOBAL_SESSION_MANAGER.remove_session(device_id).await;
}

/// 执行定期健康检查
pub async fn perform_health_check() {
    GLOBAL_SESSION_MANAGER.health_check().await;
}