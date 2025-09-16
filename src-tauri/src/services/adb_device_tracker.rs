use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, Mutex};
use tokio::time::sleep;
use tracing::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// ADB设备变化事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceChangeEvent {
    pub event_type: DeviceEventType,
    pub devices: Vec<TrackedDevice>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeviceEventType {
    DevicesChanged,
    DeviceConnected(String),
    DeviceDisconnected(String),
    InitialList,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackedDevice {
    pub id: String,
    pub status: String,
    pub connection_type: String,
}

/// 基于host:track-devices的实时ADB设备跟踪器
/// 完全替代轮询机制，实现事件驱动的设备监听
pub struct AdbDeviceTracker {
    sender: broadcast::Sender<DeviceChangeEvent>,
    is_running: Arc<Mutex<bool>>,
    last_devices: Arc<Mutex<Vec<TrackedDevice>>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
}

impl AdbDeviceTracker {
    /// 创建新的设备跟踪器
    pub fn new() -> Self {
        let (sender, _receiver) = broadcast::channel(100);
        
        Self {
            sender,
            is_running: Arc::new(Mutex::new(false)),
            last_devices: Arc::new(Mutex::new(Vec::new())),
            app_handle: Arc::new(Mutex::new(None)),
        }
    }

    /// 设置应用句柄（用于发送事件到前端）
    pub async fn set_app_handle(&self, handle: AppHandle) {
        let mut app_handle = self.app_handle.lock().await;
        *app_handle = Some(handle);
        info!("🎯 ADB设备跟踪器已设置应用句柄");
    }

    /// 启动设备跟踪 - 使用host:track-devices协议
    pub async fn start_tracking(&self) -> Result<(), String> {
        let mut is_running = self.is_running.lock().await;
        if *is_running {
            return Ok(());
        }
        *is_running = true;
        drop(is_running);

        info!("🎯 启动ADB设备实时跟踪 (host:track-devices协议)");

        let sender = self.sender.clone();
        let is_running_clone = self.is_running.clone();
        let last_devices_clone = self.last_devices.clone();
        let app_handle_clone = self.app_handle.clone();

        // 在后台任务中运行设备跟踪
        tokio::spawn(async move {
            Self::track_devices_loop(sender, is_running_clone, last_devices_clone, app_handle_clone).await;
        });

        Ok(())
    }

    /// 停止设备跟踪
    pub async fn stop_tracking(&self) {
        let mut is_running = self.is_running.lock().await;
        *is_running = false;
        info!("⏹️ 停止ADB设备跟踪");
    }

    /// 订阅设备变化事件
    pub fn subscribe(&self) -> broadcast::Receiver<DeviceChangeEvent> {
        self.sender.subscribe()
    }

    /// 获取当前设备列表（同步方法，用于初始化）
    pub async fn get_current_devices(&self) -> Vec<TrackedDevice> {
        self.last_devices.lock().await.clone()
    }

    /// 设备跟踪主循环
    async fn track_devices_loop(
        sender: broadcast::Sender<DeviceChangeEvent>,
        is_running: Arc<Mutex<bool>>,
        last_devices: Arc<Mutex<Vec<TrackedDevice>>>,
        app_handle: Arc<Mutex<Option<AppHandle>>>,
    ) {
        loop {
            // 检查是否应该停止
            {
                let running = is_running.lock().await;
                if !*running {
                    break;
                }
            }

            match Self::connect_and_track(&sender, &last_devices, &app_handle).await {
                Ok(_) => {
                    info!("🔄 ADB设备跟踪连接正常结束，准备重连");
                }
                Err(e) => {
                    error!("❌ ADB设备跟踪连接失败: {}", e);
                    // 等待一段时间后重试
                    sleep(Duration::from_secs(3)).await;
                }
            }

            // 检查是否应该停止（避免无限重连）
            {
                let running = is_running.lock().await;
                if !*running {
                    break;
                }
            }
        }

        info!("🏁 ADB设备跟踪循环结束");
    }

    /// 连接到ADB server并执行设备跟踪
    async fn connect_and_track(
        sender: &broadcast::Sender<DeviceChangeEvent>,
        last_devices: &Arc<Mutex<Vec<TrackedDevice>>>,
        app_handle: &Arc<Mutex<Option<AppHandle>>>,
    ) -> Result<(), String> {
        info!("🔌 连接到ADB server (127.0.0.1:5037)");

        // 连接到ADB server
        let mut stream = TcpStream::connect("127.0.0.1:5037")
            .map_err(|e| format!("无法连接到ADB server: {}", e))?;

        // 设置读取超时
        stream.set_read_timeout(Some(Duration::from_secs(30)))
            .map_err(|e| format!("设置读取超时失败: {}", e))?;

        // 发送host:track-devices协议命令
        let command = "host:track-devices";
        let command_bytes = format!("{:04X}{}", command.len(), command);
        
        debug!("📤 发送ADB协议命令: {}", command_bytes);
        stream.write_all(command_bytes.as_bytes())
            .map_err(|e| format!("发送跟踪命令失败: {}", e))?;

        // 读取ADB server的响应
        let mut response = vec![0u8; 4];
        stream.read_exact(&mut response)
            .map_err(|e| format!("读取ADB响应失败: {}", e))?;

        let status = String::from_utf8_lossy(&response);
        if status != "OKAY" {
            return Err(format!("ADB server响应错误: {}", status));
        }

        info!("✅ ADB server连接成功，开始监听设备变化");

        // 持续监听设备变化
        loop {
            match Self::read_device_list(&mut stream).await {
                Ok(devices) => {
                    // 检查设备变化
                    let mut last = last_devices.lock().await;
                    if Self::devices_changed(&last, &devices) {
                        info!("🔄 检测到设备变化: {} -> {} 个设备", last.len(), devices.len());
                        
                        // 分析具体变化
                        let event_type = Self::analyze_device_changes(&last, &devices);
                        
                        // 更新缓存
                        *last = devices.clone();
                        drop(last);

                        // 发送事件
                        let event = DeviceChangeEvent {
                            event_type,
                            devices,
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap()
                                .as_secs(),
                        };

                        // 发送内部事件
                        if let Err(e) = sender.send(event.clone()) {
                            warn!("发送设备变化事件失败: {}", e);
                        }

                        // 发送事件到前端
                        if let Some(handle) = app_handle.lock().await.as_ref() {
                            if let Err(e) = handle.emit("device-change", &event) {
                                warn!("发送设备变化事件到前端失败: {}", e);
                            }
                        }
                    } else {
                        debug!("📱 设备状态无变化 ({} 个设备)", devices.len());
                    }
                }
                Err(e) => {
                    error!("读取设备列表失败: {}", e);
                    break;
                }
            }
        }

        Ok(())
    }

    /// 从ADB server读取设备列表
    async fn read_device_list(stream: &mut TcpStream) -> Result<Vec<TrackedDevice>, String> {
        // 读取数据长度
        let mut length_bytes = vec![0u8; 4];
        stream.read_exact(&mut length_bytes)
            .map_err(|e| format!("读取数据长度失败: {}", e))?;

        let length_str = String::from_utf8_lossy(&length_bytes);
        let data_length = u32::from_str_radix(&length_str, 16)
            .map_err(|e| format!("解析数据长度失败: {}", e))?;

        if data_length == 0 {
            return Ok(Vec::new());
        }

        // 读取设备数据
        let mut device_data = vec![0u8; data_length as usize];
        stream.read_exact(&mut device_data)
            .map_err(|e| format!("读取设备数据失败: {}", e))?;

        let device_text = String::from_utf8_lossy(&device_data);
        debug!("📱 收到设备列表: {}", device_text.trim());

        // 解析设备列表
        Self::parse_device_list(&device_text)
    }

    /// 解析设备列表文本
    fn parse_device_list(device_text: &str) -> Result<Vec<TrackedDevice>, String> {
        let mut devices = Vec::new();

        for line in device_text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 2 {
                devices.push(TrackedDevice {
                    id: parts[0].to_string(),
                    status: parts[1].to_string(),
                    connection_type: if parts[0].starts_with("emulator-") {
                        "emulator".to_string()
                    } else {
                        "usb".to_string()
                    },
                });
            }
        }

        Ok(devices)
    }

    /// 检查设备列表是否发生变化
    fn devices_changed(old_devices: &[TrackedDevice], new_devices: &[TrackedDevice]) -> bool {
        if old_devices.len() != new_devices.len() {
            return true;
        }

        for new_device in new_devices {
            let found = old_devices.iter().any(|old_device| {
                old_device.id == new_device.id && old_device.status == new_device.status
            });
            if !found {
                return true;
            }
        }

        false
    }

    /// 分析设备变化类型
    fn analyze_device_changes(
        old_devices: &[TrackedDevice],
        new_devices: &[TrackedDevice],
    ) -> DeviceEventType {
        if old_devices.is_empty() {
            return DeviceEventType::InitialList;
        }

        // 检查新连接的设备
        for new_device in new_devices {
            if !old_devices.iter().any(|d| d.id == new_device.id) {
                return DeviceEventType::DeviceConnected(new_device.id.clone());
            }
        }

        // 检查断开的设备
        for old_device in old_devices {
            if !new_devices.iter().any(|d| d.id == old_device.id) {
                return DeviceEventType::DeviceDisconnected(old_device.id.clone());
            }
        }

        DeviceEventType::DevicesChanged
    }
}

/// 全局ADB设备跟踪器实例
static GLOBAL_DEVICE_TRACKER: std::sync::OnceLock<AdbDeviceTracker> = std::sync::OnceLock::new();

/// 初始化全局设备跟踪器
pub fn initialize_device_tracker() -> Result<(), String> {
    let tracker = AdbDeviceTracker::new();
    
    if GLOBAL_DEVICE_TRACKER.set(tracker).is_err() {
        return Err("设备跟踪器已经初始化".to_string());
    }
    
    info!("🎯 全局ADB设备跟踪器初始化完成");
    Ok(())
}

/// 获取全局设备跟踪器
pub fn get_device_tracker() -> Result<&'static AdbDeviceTracker, String> {
    GLOBAL_DEVICE_TRACKER
        .get()
        .ok_or_else(|| "设备跟踪器未初始化".to_string())
}

/// 启动ADB设备实时跟踪
#[tauri::command]
pub async fn start_device_tracking(app_handle: tauri::AppHandle) -> Result<(), String> {
    let tracker = get_device_tracker()?;
    // 设置应用句柄
    tracker.set_app_handle(app_handle).await;
    // 启动跟踪
    tracker.start_tracking().await
}

/// 停止ADB设备跟踪
#[tauri::command]
pub async fn stop_device_tracking() -> Result<(), String> {
    let tracker = get_device_tracker()?;
    tracker.stop_tracking().await;
    Ok(())
}

/// 获取当前设备列表（实时版本）
#[tauri::command]
pub async fn get_tracked_devices() -> Result<Vec<TrackedDevice>, String> {
    let tracker = get_device_tracker()?;
    Ok(tracker.get_current_devices().await)
}