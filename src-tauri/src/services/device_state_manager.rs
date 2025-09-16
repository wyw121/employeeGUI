use crate::services::safe_adb_manager::SafeAdbManager;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::Mutex as AsyncMutex;
use std::sync::{Arc, OnceLock};
use std::time::{Duration, SystemTime};
use tracing::{debug, info};

/// 设备状态快照，用于检测变化
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceSnapshot {
    pub id: String,
    pub status: String,
    pub model: Option<String>,
    pub version: Option<String>,
    pub last_updated: SystemTime,
}

impl DeviceSnapshot {
    /// 检测设备状态是否有显著变化
    pub fn has_significant_change(&self, other: &DeviceSnapshot) -> bool {
        if self.id != other.id {
            return true;
        }
        
        // 检查关键状态变化
        if self.status != other.status {
            return true;
        }
        
        // 检查设备信息变化
        if self.model != other.model || self.version != other.version {
            return true;
        }
        
        false
    }
}

/// 智能设备状态响应
#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceStateResponse {
    pub devices: Vec<DeviceSnapshot>,
    pub version: u64,
    pub has_changes: bool,
    pub last_updated: SystemTime,
}

/// 设备属性类型
pub type DeviceProperties = HashMap<String, String>;

/// 设备状态管理器 - 实现ADB命令行工具最佳实践
pub struct DeviceStateManager {
    pub adb_manager: SafeAdbManager,
    last_devices: Vec<DeviceSnapshot>,
    state_version: u64,
    last_full_scan: Option<SystemTime>,
}

impl DeviceStateManager {
    /// 创建新的设备状态管理器
    pub fn new() -> Self {
        Self {
            adb_manager: SafeAdbManager::new(),
            last_devices: Vec::new(),
            state_version: 0,
            last_full_scan: None,
        }
    }

    /// 初始化ADB连接
    pub async fn initialize_adb(&mut self) -> Result<(), String> {
        debug!("初始化ADB连接...");
        
        // 查找并验证ADB路径
        self.adb_manager.find_safe_adb_path()
            .map_err(|e| format!("ADB路径查找失败: {}", e))?;
        
        info!("ADB连接初始化完成");
        Ok(())
    }

    /// 智能设备更新 - 核心最佳实践实现
    pub async fn update_devices_smart(&mut self) -> Result<DeviceStateResponse, String> {
        let now = SystemTime::now();
        
        // 智能间隔控制：避免频繁扫描
        if let Some(last_scan) = self.last_full_scan {
            if let Ok(elapsed) = now.duration_since(last_scan) {
                if elapsed < Duration::from_secs(3) {
                    debug!("距离上次扫描不足3秒，返回缓存结果");
                    return Ok(DeviceStateResponse {
                        devices: self.last_devices.clone(),
                        version: self.state_version,
                        has_changes: false,
                        last_updated: last_scan,
                    });
                }
            }
        }

        // 执行设备发现
        let new_devices = self.scan_devices().await?;
        
        // 检测变化
        let has_changes = self.detect_changes(&new_devices);
        
        if has_changes {
            self.state_version += 1;
            self.last_devices = new_devices.clone();
            info!("检测到设备状态变化，版本更新至: {}", self.state_version);
        }
        
        self.last_full_scan = Some(now);
        
        Ok(DeviceStateResponse {
            devices: new_devices,
            version: self.state_version,
            has_changes,
            last_updated: now,
        })
    }

    /// 扫描连接的设备
    async fn scan_devices(&mut self) -> Result<Vec<DeviceSnapshot>, String> {
        debug!("开始扫描ADB设备...");
        
        // 确保ADB已初始化
        self.initialize_adb().await?;
        
        // 执行adb devices命令
        let output = self.adb_manager
            .execute_adb_command(&["devices", "-l"])
            .map_err(|e| format!("执行adb devices失败: {}", e))?;
        
        let mut devices = Vec::new();
        let now = SystemTime::now();
        
        for line in output.lines().skip(1) { // 跳过"List of devices attached"
            if let Some(device) = self.parse_device_line(line, now).await {
                devices.push(device);
            }
        }
        
        debug!("扫描完成，发现{}个设备", devices.len());
        Ok(devices)
    }

    /// 解析设备信息行
    async fn parse_device_line(&self, line: &str, timestamp: SystemTime) -> Option<DeviceSnapshot> {
        let parts: Vec<&str> = line.trim().split_whitespace().collect();
        if parts.len() < 2 {
            return None;
        }
        
        let device_id = parts[0].to_string();
        let status = parts[1].to_string();
        
        // 如果设备在线，获取额外信息
        let (model, version) = if status == "device" {
            self.get_device_info(&device_id).await.unwrap_or((None, None))
        } else {
            (None, None)
        };
        
        Some(DeviceSnapshot {
            id: device_id,
            status,
            model,
            version,
            last_updated: timestamp,
        })
    }

    /// 获取设备详细信息
    async fn get_device_info(&self, device_id: &str) -> Result<(Option<String>, Option<String>), String> {
        // 获取设备型号
        let model = self.adb_manager
            .execute_adb_command(&["-s", device_id, "shell", "getprop", "ro.product.model"])
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        
        // 获取Android版本
        let version = self.adb_manager
            .execute_adb_command(&["-s", device_id, "shell", "getprop", "ro.build.version.release"])
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        
        Ok((model, version))
    }

    /// 检测设备状态变化
    fn detect_changes(&self, new_devices: &[DeviceSnapshot]) -> bool {
        // 检查设备数量变化
        if self.last_devices.len() != new_devices.len() {
            return true;
        }
        
        // 检查每个设备的变化
        for new_device in new_devices {
            let old_device = self.last_devices.iter()
                .find(|d| d.id == new_device.id);
                
            match old_device {
                None => return true, // 新设备
                Some(old) => {
                    if new_device.has_significant_change(old) {
                        return true;
                    }
                }
            }
        }
        
        // 检查是否有设备断开连接
        for old_device in &self.last_devices {
            if !new_devices.iter().any(|d| d.id == old_device.id) {
                return true; // 设备断开
            }
        }
        
        false
    }

    /// 获取设备详细属性
    pub async fn get_device_properties(&mut self, device_id: String) -> Result<DeviceProperties, String> {
        debug!("获取设备{}的详细属性", device_id);
        
        // 确保ADB已初始化
        self.initialize_adb().await?;
        
        // 执行属性获取命令
        let output = self.adb_manager
            .execute_adb_command(&["-s", &device_id, "shell", "getprop"])
            .map_err(|e| format!("获取设备属性失败: {}", e))?;
        
        // 解析属性
        let mut properties = HashMap::new();
        for line in output.lines() {
            if let Some((key, value)) = parse_property_line(line) {
                properties.insert(key, value);
            }
        }
        
        debug!("获取到{}个设备属性", properties.len());
        Ok(properties)
    }
}

/// 解析属性行
fn parse_property_line(line: &str) -> Option<(String, String)> {
    let line = line.trim();
    if line.is_empty() || !line.starts_with('[') {
        return None;
    }
    
    // 格式: [ro.product.model]: [SM-G973F]
    if let Some(close_bracket) = line.find("]: [") {
        let key = line[1..close_bracket].to_string();
        let value_part = &line[close_bracket + 4..];
        if let Some(end) = value_part.rfind(']') {
            let value = value_part[..end].to_string();
            return Some((key, value));
        }
    }
    
    None
}

/// 全局设备状态管理器类型
pub type GlobalDeviceStateManager = Arc<AsyncMutex<DeviceStateManager>>;

/// 全局单例实例
static GLOBAL_DEVICE_STATE_MANAGER: OnceLock<GlobalDeviceStateManager> = OnceLock::new();

/// 初始化全局设备状态管理器
pub fn initialize_global_device_manager() -> Result<(), String> {
    let manager = Arc::new(AsyncMutex::new(DeviceStateManager::new()));
    
    if GLOBAL_DEVICE_STATE_MANAGER.set(manager).is_err() {
        return Err("全局设备状态管理器已经初始化".to_string());
    }
    
    info!("全局设备状态管理器初始化完成");
    Ok(())
}

/// 获取全局设备状态管理器
fn get_global_manager() -> Result<Arc<AsyncMutex<DeviceStateManager>>, String> {
    GLOBAL_DEVICE_STATE_MANAGER
        .get()
        .cloned()
        .ok_or_else(|| "设备状态管理器未初始化".to_string())
}


/// 智能ADB设备获取命令 - 实现最佳实践
#[tauri::command]
pub async fn get_devices_smart() -> Result<DeviceStateResponse, String> {
    let manager = get_global_manager()?;
    let mut device_manager = manager.lock().await;
    device_manager.update_devices_smart().await
}

/// 获取设备详细属性命令 - 优化版
#[tauri::command]
pub async fn get_device_properties_optimized(
    device_id: String,
) -> Result<HashMap<String, String>, String> {
    let manager = get_global_manager()?;
    let mut device_manager = manager.lock().await;
    device_manager.get_device_properties(device_id).await
}