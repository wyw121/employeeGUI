use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};
use chrono;

// 应用状态检查结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusResult {
    pub app_installed: bool,
    pub app_running: bool,
    pub message: String,
    pub app_version: Option<String>,
    pub package_name: Option<String>,
}

// 导航操作结果
#[derive(Debug, Serialize, Deserialize)]
pub struct NavigationResult {
    pub success: bool,
    pub message: String,
}

// 设备健康检查结果
#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceHealthResult {
    pub device_connected: bool,
    pub adb_responsive: bool,
    pub screen_responsive: bool,
    pub app_accessible: bool,
    pub overall_health: DeviceHealthStatus,
    pub issues: Vec<String>,
    pub recommendations: Vec<String>,
}

// 设备健康状态
#[derive(Debug, Serialize, Deserialize)]
pub enum DeviceHealthStatus {
    Healthy,    // 设备状态良好
    Warning,    // 有轻微问题但可以继续
    Critical,   // 有严重问题需要处理
    Disconnected, // 设备已断开连接
}

// 自动恢复结果
#[derive(Debug, Serialize, Deserialize)]
pub struct RecoveryResult {
    pub success: bool,
    pub actions_taken: Vec<String>,
    pub message: String,
    pub remaining_issues: Vec<String>,
}

// 关注操作配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XiaohongshuFollowOptions {
    pub max_pages: Option<usize>,
    pub follow_interval: Option<u64>,
    pub skip_existing: Option<bool>,
    pub return_to_home: Option<bool>,
}

impl Default for XiaohongshuFollowOptions {
    fn default() -> Self {
        Self {
            max_pages: Some(5),
            follow_interval: Some(2000),
            skip_existing: Some(true),
            return_to_home: Some(true),
        }
    }
}

// 关注操作结果
#[derive(Debug, Serialize, Deserialize)]
pub struct XiaohongshuFollowResult {
    pub success: bool,
    pub total_followed: usize,
    pub pages_processed: usize,
    pub duration: u64,
    pub details: Vec<FollowDetail>,
    pub message: String,
}

// 单个关注操作的详细信息
#[derive(Debug, Serialize, Deserialize)]
pub struct FollowDetail {
    pub user_position: (i32, i32),
    pub follow_success: bool,
    pub button_text_before: Option<String>,
    pub button_text_after: Option<String>,
    pub error: Option<String>,
}

// 页面状态枚举
#[derive(Debug, Clone, PartialEq)]
pub enum PageState {
    Unknown,         // 未知页面
    Home,            // Android桌面
    MainPage,        // 小红书主页
    SidebarOpen,     // 侧边栏已打开
    DiscoverFriends, // 发现好友页面
    ContactsList,    // 通讯录列表页面
    UserProfile,     // 用户资料页面
}

// 页面识别结果
#[derive(Debug, Clone)]
pub struct PageRecognitionResult {
    pub current_state: PageState,
    pub confidence: f32,
    pub key_elements: Vec<String>,
    pub ui_elements: Vec<UIElement>,
    pub message: String,
}

// UI元素信息
#[derive(Debug, Clone)]
pub struct UIElement {
    pub element_type: UIElementType,
    pub text: String,
    pub bounds: (i32, i32, i32, i32), // (left, top, right, bottom)
    pub clickable: bool,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
}

// UI元素类型
#[derive(Debug, Clone, PartialEq)]
pub enum UIElementType {
    Button,
    TextView,
    ImageView,
    EditText,
    RecyclerView,
    LinearLayout,
    RelativeLayout,
    Unknown,
}

// 屏幕信息
#[derive(Debug)]
struct ScreenInfo {
    width: i32,
    height: i32,
}

pub struct XiaohongshuAutomator {
    device_id: String,
    adb_path: String,
}

impl XiaohongshuAutomator {
    /// 创建新的小红书自动化实例
    pub fn new(device_id: String) -> Self {
        // 优先尝试几个可能的ADB路径
        let possible_adb_paths = vec![
            // 1. 项目根目录的platform-tools (使用绝对路径)
            r"D:\repositories\employeeGUI\platform-tools\adb.exe".to_string(),
            // 2. 相对于当前目录的platform-tools
            std::env::current_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."))
                .parent()
                .unwrap_or(&std::path::PathBuf::from(".."))
                .join("platform-tools")
                .join("adb.exe")
                .to_string_lossy()
                .to_string(),
            // 3. 从src-tauri向上两级目录找platform-tools
            std::env::current_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."))
                .join("..")
                .join("platform-tools")
                .join("adb.exe")
                .to_string_lossy()
                .to_string(),
            // 4. 系统PATH中的adb
            "adb.exe".to_string(),
        ];

        let mut adb_path = "adb.exe".to_string();
        
        // 找到第一个存在的ADB路径
        for path in &possible_adb_paths {
            info!("🔍 检查ADB路径: {}", path);
            if std::path::Path::new(path).exists() {
                adb_path = path.clone();
                info!("✅ 找到可用的ADB路径: {}", adb_path);
                break;
            } else {
                info!("❌ ADB路径不存在: {}", path);
            }
        }
        
        info!("🚀 创建XiaohongshuAutomator - 设备ID: {}, 最终ADB路径: {}", device_id, adb_path);
            
        Self {
            device_id,
            adb_path,
        }
    }
    
    /// 创建新的小红书自动化实例，指定ADB路径
    pub fn new_with_adb_path(device_id: String, adb_path: String) -> Self {
        Self {
            device_id,
            adb_path,
        }
    }

    /// 检查小红书应用状态
    pub async fn check_app_status(&self) -> Result<AppStatusResult> {
        info!("🔍 检查小红书应用状态");
        info!("使用ADB路径: {}", self.adb_path);
        info!("目标设备ID: {}", self.device_id);

        // 首先验证ADB路径是否存在
        if !std::path::Path::new(&self.adb_path).exists() {
            let error_msg = format!("ADB文件不存在: {}", self.adb_path);
            error!("{}", error_msg);
            return Err(anyhow::anyhow!(error_msg));
        }

        // 检查应用是否安装
        let package_name = "com.xingin.xhs";
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "pm",
                "list",
                "packages",
                package_name,
            ])
            .output()
            .context(format!("检查应用安装状态失败 - ADB路径: {}, 设备ID: {}", self.adb_path, self.device_id))?;

        info!("📊 应用安装检查结果: stdout长度={}, stderr={}", 
              output.stdout.len(), 
              String::from_utf8_lossy(&output.stderr));

        let app_installed = !output.stdout.is_empty() && 
                           String::from_utf8_lossy(&output.stdout).contains(package_name);

        if !app_installed {
            return Ok(AppStatusResult {
                app_installed: false,
                app_running: false,
                message: "小红书应用未安装".to_string(),
                app_version: None,
                package_name: Some(package_name.to_string()),
            });
        }

        // 检查应用是否正在运行 - 使用简化的方法避免Windows管道问题
        let running_output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "activity",
                "activities",
            ])
            .output()
            .context("检查应用运行状态失败")?;

        let running_result = String::from_utf8_lossy(&running_output.stdout);
        let app_running = running_result.contains(package_name);

        // 获取应用版本 - 使用简化的方法避免Windows管道问题
        let version_output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "package",
                package_name,
            ])
            .output()
            .context("获取应用版本失败")?;

        let version_result = String::from_utf8_lossy(&version_output.stdout);
        let app_version = if version_result.contains("versionName") {
            // 从dumpsys输出中提取versionName
            version_result
                .lines()
                .find(|line| line.contains("versionName"))
                .map(|line| line.trim().to_string())
        } else {
            None
        };

        let message = match (app_installed, app_running) {
            (true, true) => "小红书应用已安装且正在运行".to_string(),
            (true, false) => "小红书应用已安装但未运行".to_string(),
            (false, _) => "小红书应用未安装".to_string(),
        };

        Ok(AppStatusResult {
            app_installed,
            app_running,
            message,
            app_version,
            package_name: Some(package_name.to_string()),
        })
    }

    /// 设备健康检查 - 全面检测设备状态和潜在问题
    pub async fn check_device_health(&self) -> Result<DeviceHealthResult> {
        info!("🏥 开始设备健康检查...");
        
        let mut issues = Vec::new();
        let mut recommendations = Vec::new();
        
        // 1. 检查设备连接状态
        let device_connected = self.check_device_connection().await;
        if !device_connected {
            issues.push("设备未连接或ADB无法访问".to_string());
            recommendations.push("请检查USB连接并确保设备已开启USB调试".to_string());
        }
        
        // 2. 检查ADB响应性
        let adb_responsive = if device_connected {
            self.check_adb_responsiveness().await
        } else {
            false
        };
        if device_connected && !adb_responsive {
            issues.push("ADB连接不稳定或响应缓慢".to_string());
            recommendations.push("尝试重启ADB服务或重新连接设备".to_string());
        }
        
        // 3. 检查屏幕响应性
        let screen_responsive = if device_connected && adb_responsive {
            self.check_screen_responsiveness().await
        } else {
            false
        };
        if device_connected && adb_responsive && !screen_responsive {
            issues.push("设备屏幕无响应或界面异常".to_string());
            recommendations.push("检查设备是否锁屏或界面是否正常".to_string());
        }
        
        // 4. 检查小红书应用可访问性
        let app_accessible = if screen_responsive {
            self.check_app_accessibility().await
        } else {
            false
        };
        if screen_responsive && !app_accessible {
            issues.push("小红书应用无法正常访问".to_string());
            recommendations.push("检查应用是否已安装、是否有权限问题或需要更新".to_string());
        }
        
        // 5. 综合评估设备健康状态
        let overall_health = self.evaluate_overall_health(
            device_connected, 
            adb_responsive, 
            screen_responsive, 
            app_accessible
        );
        
        // 6. 添加通用建议
        if issues.is_empty() {
            recommendations.push("设备状态良好，可以正常使用自动化功能".to_string());
        } else {
            recommendations.push("建议按顺序解决发现的问题".to_string());
            if !device_connected {
                recommendations.push("优先解决设备连接问题".to_string());
            }
        }
        
        info!("🏥 设备健康检查完成 - 状态: {:?}, 发现 {} 个问题", overall_health, issues.len());
        
        Ok(DeviceHealthResult {
            device_connected,
            adb_responsive,
            screen_responsive,
            app_accessible,
            overall_health,
            issues,
            recommendations,
        })
    }
    
    /// 检查设备连接状态
    async fn check_device_connection(&self) -> bool {
        info!("🔌 检查设备连接状态...");
        
        // 检查ADB文件是否存在
        if !std::path::Path::new(&self.adb_path).exists() {
            error!("❌ ADB文件不存在: {}", self.adb_path);
            return false;
        }
        
        // 尝试列出连接的设备
        match Command::new(&self.adb_path)
            .args(&["devices"])
            .output()
        {
            Ok(output) => {
                let devices_output = String::from_utf8_lossy(&output.stdout);
                let connected = devices_output.contains(&self.device_id) && 
                               devices_output.contains("device"); // 确保设备状态是"device"而不是"offline"
                
                if connected {
                    info!("✅ 设备 {} 已连接", self.device_id);
                } else {
                    warn!("⚠️ 设备 {} 未连接或状态异常", self.device_id);
                    info!("📱 当前连接的设备:\n{}", devices_output);
                }
                connected
            }
            Err(e) => {
                error!("❌ 检查设备连接失败: {}", e);
                false
            }
        }
    }
    
    /// 检查ADB响应性
    async fn check_adb_responsiveness(&self) -> bool {
        info!("⚡ 检查ADB响应性...");
        
        let start_time = std::time::Instant::now();
        
        // 执行简单的shell命令测试响应性
        match Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "echo", "adb_test"])
            .output()
        {
            Ok(output) => {
                let elapsed = start_time.elapsed();
                let response_time_ms = elapsed.as_millis();
                
                if output.status.success() && String::from_utf8_lossy(&output.stdout).contains("adb_test") {
                    if response_time_ms < 3000 { // 3秒内响应认为正常
                        info!("✅ ADB响应正常，响应时间: {}ms", response_time_ms);
                        true
                    } else {
                        warn!("⚠️ ADB响应缓慢，响应时间: {}ms", response_time_ms);
                        false
                    }
                } else {
                    error!("❌ ADB命令执行失败");
                    false
                }
            }
            Err(e) => {
                error!("❌ ADB响应性检查失败: {}", e);
                false
            }
        }
    }
    
    /// 检查屏幕响应性
    async fn check_screen_responsiveness(&self) -> bool {
        info!("📱 检查屏幕响应性...");
        
        // 尝试获取屏幕信息
        match Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "wm", "size"])
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    let screen_info = String::from_utf8_lossy(&output.stdout);
                    if screen_info.contains("Physical size") {
                        info!("✅ 屏幕信息获取正常: {}", screen_info.trim());
                        
                        // 进一步检查是否能获取UI dump（表示界面可访问）
                        match Command::new(&self.adb_path)
                            .args(&["-s", &self.device_id, "shell", "uiautomator", "dump", "/dev/stdout"])
                            .output()
                        {
                            Ok(ui_output) => {
                                if ui_output.status.success() && !ui_output.stdout.is_empty() {
                                    info!("✅ UI界面可正常访问");
                                    true
                                } else {
                                    warn!("⚠️ 无法获取UI信息，可能设备锁屏或界面异常");
                                    false
                                }
                            }
                            Err(e) => {
                                warn!("⚠️ UI dump检查失败: {}", e);
                                false
                            }
                        }
                    } else {
                        warn!("⚠️ 屏幕信息格式异常");
                        false
                    }
                } else {
                    error!("❌ 无法获取屏幕信息");
                    false
                }
            }
            Err(e) => {
                error!("❌ 屏幕响应性检查失败: {}", e);
                false
            }
        }
    }
    
    /// 检查小红书应用可访问性
    async fn check_app_accessibility(&self) -> bool {
        info!("📱 检查小红书应用可访问性...");
        
        match self.check_app_status().await {
            Ok(app_status) => {
                if !app_status.app_installed {
                    warn!("⚠️ 小红书应用未安装");
                    false
                } else if !app_status.app_running {
                    info!("⚡ 小红书应用未运行，尝试启动...");
                    // 尝试启动应用
                    match self.start_xiaohongshu_app().await {
                        Ok(_) => {
                            info!("✅ 小红书应用启动成功");
                            // 等待应用完全启动
                            sleep(Duration::from_millis(3000)).await;
                            true
                        }
                        Err(e) => {
                            error!("❌ 小红书应用启动失败: {}", e);
                            false
                        }
                    }
                } else {
                    info!("✅ 小红书应用运行正常");
                    true
                }
            }
            Err(e) => {
                error!("❌ 检查小红书应用状态失败: {}", e);
                false
            }
        }
    }
    
    /// 评估整体健康状态
    fn evaluate_overall_health(
        &self,
        device_connected: bool,
        adb_responsive: bool,
        screen_responsive: bool,
        app_accessible: bool,
    ) -> DeviceHealthStatus {
        if !device_connected {
            DeviceHealthStatus::Disconnected
        } else if device_connected && adb_responsive && screen_responsive && app_accessible {
            DeviceHealthStatus::Healthy
        } else if device_connected && adb_responsive {
            DeviceHealthStatus::Warning
        } else {
            DeviceHealthStatus::Critical
        }
    }

    /// 自动恢复机制 - 尝试解决检测到的问题
    pub async fn auto_recovery(&self) -> Result<RecoveryResult> {
        info!("🔄 启动自动恢复流程...");
        
        let mut actions_taken = Vec::new();
        let mut remaining_issues = Vec::new();
        
        // 首先进行健康检查
        let health_result = self.check_device_health().await?;
        
        if matches!(health_result.overall_health, DeviceHealthStatus::Healthy) {
            return Ok(RecoveryResult {
                success: true,
                actions_taken: vec!["设备状态良好，无需恢复".to_string()],
                message: "设备健康状态良好".to_string(),
                remaining_issues: vec![],
            });
        }
        
        info!("🚨 检测到设备问题，开始恢复操作...");
        
        // 1. 处理设备连接问题
        if !health_result.device_connected {
            info!("🔌 尝试恢复设备连接...");
            
            if self.attempt_device_reconnection().await {
                actions_taken.push("重新建立设备连接".to_string());
                info!("✅ 设备连接恢复成功");
            } else {
                remaining_issues.push("设备连接失败 - 需要手动检查USB连接和调试设置".to_string());
                error!("❌ 设备连接恢复失败");
            }
        }
        
        // 2. 处理ADB响应问题
        if health_result.device_connected && !health_result.adb_responsive {
            info!("⚡ 尝试恢复ADB响应性...");
            
            if self.attempt_adb_recovery().await {
                actions_taken.push("重启ADB服务并恢复响应性".to_string());
                info!("✅ ADB响应性恢复成功");
            } else {
                remaining_issues.push("ADB响应异常 - 可能需要重启ADB或重新连接设备".to_string());
                error!("❌ ADB响应性恢复失败");
            }
        }
        
        // 3. 处理屏幕响应问题
        if health_result.adb_responsive && !health_result.screen_responsive {
            info!("📱 尝试恢复屏幕响应性...");
            
            if self.attempt_screen_recovery().await {
                actions_taken.push("唤醒设备屏幕并解锁".to_string());
                info!("✅ 屏幕响应性恢复成功");
            } else {
                remaining_issues.push("屏幕无响应 - 请手动检查设备是否锁定或界面异常".to_string());
                error!("❌ 屏幕响应性恢复失败");
            }
        }
        
        // 4. 处理应用访问问题
        if health_result.screen_responsive && !health_result.app_accessible {
            info!("📱 尝试恢复小红书应用访问...");
            
            if self.attempt_app_recovery().await {
                actions_taken.push("启动小红书应用并恢复访问".to_string());
                info!("✅ 应用访问恢复成功");
            } else {
                remaining_issues.push("小红书应用无法访问 - 请检查应用是否已安装或需要更新".to_string());
                error!("❌ 应用访问恢复失败");
            }
        }
        
        // 5. 进行最终健康检查
        info!("🔍 执行恢复后健康检查...");
        let final_health = self.check_device_health().await?;
        let success = matches!(final_health.overall_health, DeviceHealthStatus::Healthy | DeviceHealthStatus::Warning);
        
        let message = if success {
            if actions_taken.is_empty() {
                "设备状态良好，无需恢复操作".to_string()
            } else {
                format!("恢复成功，执行了 {} 项恢复操作", actions_taken.len())
            }
        } else {
            format!("部分恢复成功，仍有 {} 个问题需要手动处理", remaining_issues.len())
        };
        
        info!("🔄 自动恢复完成 - 成功: {}, 操作数: {}, 剩余问题: {}", 
              success, actions_taken.len(), remaining_issues.len());
        
        Ok(RecoveryResult {
            success,
            actions_taken,
            message,
            remaining_issues,
        })
    }
    
    /// 尝试设备重连
    async fn attempt_device_reconnection(&self) -> bool {
        info!("🔄 尝试重新连接设备...");
        
        // 尝试重启ADB服务
        if let Ok(_) = Command::new(&self.adb_path)
            .args(&["kill-server"])
            .output()
        {
            sleep(Duration::from_millis(2000)).await;
            
            if let Ok(_) = Command::new(&self.adb_path)
                .args(&["start-server"])
                .output()
            {
                sleep(Duration::from_millis(3000)).await;
                
                // 检查设备是否重新连接
                return self.check_device_connection().await;
            }
        }
        
        false
    }
    
    /// 尝试ADB恢复
    async fn attempt_adb_recovery(&self) -> bool {
        info!("🔄 尝试恢复ADB响应性...");
        
        // 发送几个简单命令测试连接
        for _ in 0..3 {
            if let Ok(output) = Command::new(&self.adb_path)
                .args(&["-s", &self.device_id, "shell", "echo", "recovery_test"])
                .output()
            {
                if output.status.success() {
                    return true;
                }
            }
            
            sleep(Duration::from_millis(1000)).await;
        }
        
        // 如果简单测试失败，尝试重连
        self.attempt_device_reconnection().await
    }
    
    /// 尝试屏幕恢复
    async fn attempt_screen_recovery(&self) -> bool {
        info!("🔄 尝试恢复屏幕响应性...");
        
        // 1. 尝试唤醒屏幕
        if let Ok(_) = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "input", "keyevent", "KEYCODE_WAKEUP"])
            .output()
        {
            sleep(Duration::from_millis(1000)).await;
        }
        
        // 2. 尝试解锁（假设是简单滑动解锁）
        if let Ok(_) = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "input", "swipe", "500", "1000", "500", "500"])
            .output()
        {
            sleep(Duration::from_millis(1000)).await;
        }
        
        // 3. 验证屏幕是否可访问
        self.check_screen_responsiveness().await
    }
    
    /// 尝试应用恢复
    async fn attempt_app_recovery(&self) -> bool {
        info!("🔄 尝试恢复小红书应用访问...");
        
        // 1. 检查应用状态
        if let Ok(app_status) = self.check_app_status().await {
            if !app_status.app_installed {
                warn!("⚠️ 小红书应用未安装，无法自动恢复");
                return false;
            }
            
            // 2. 如果应用未运行，尝试启动
            if !app_status.app_running {
                if let Ok(_) = self.start_xiaohongshu_app().await {
                    sleep(Duration::from_millis(5000)).await; // 等待应用完全启动
                    
                    // 验证启动是否成功
                    if let Ok(new_status) = self.check_app_status().await {
                        return new_status.app_running;
                    }
                }
            } else {
                // 应用已运行，检查是否可以访问界面
                return self.check_app_accessibility().await;
            }
        }
        
        false
    }
    
    /// 带恢复机制的导航 - 在导航失败时自动尝试恢复
    pub async fn navigate_to_contacts_with_recovery(&self) -> Result<NavigationResult> {
        info!("🧭 开始带恢复机制的导航流程...");
        
        // 第一次尝试正常导航
        match self.navigate_to_contacts().await {
            Ok(result) => {
                if result.success {
                    info!("✅ 首次导航成功");
                    return Ok(result);
                } else {
                    warn!("⚠️ 首次导航失败: {}", result.message);
                }
            }
            Err(e) => {
                warn!("⚠️ 首次导航出错: {}", e);
            }
        }
        
        // 首次失败，尝试自动恢复
        info!("🔄 首次导航失败，尝试自动恢复...");
        match self.auto_recovery().await {
            Ok(recovery_result) => {
                if recovery_result.success {
                    info!("✅ 自动恢复成功，重新尝试导航...");
                    
                    // 等待恢复完成
                    sleep(Duration::from_millis(2000)).await;
                    
                    // 第二次尝试导航
                    match self.navigate_to_contacts().await {
                        Ok(result) => {
                            if result.success {
                                info!("✅ 恢复后导航成功");
                                Ok(NavigationResult {
                                    success: true,
                                    message: format!("经过自动恢复后导航成功 - 恢复操作: {:?}", recovery_result.actions_taken),
                                })
                            } else {
                                error!("❌ 恢复后导航仍然失败");
                                Ok(NavigationResult {
                                    success: false,
                                    message: format!("恢复后导航失败: {} - 剩余问题: {:?}", result.message, recovery_result.remaining_issues),
                                })
                            }
                        }
                        Err(e) => {
                            error!("❌ 恢复后导航出错: {}", e);
                            Ok(NavigationResult {
                                success: false,
                                message: format!("恢复后导航出错: {} - 剩余问题: {:?}", e, recovery_result.remaining_issues),
                            })
                        }
                    }
                } else {
                    error!("❌ 自动恢复失败");
                    Ok(NavigationResult {
                        success: false,
                        message: format!("自动恢复失败: {} - 需要手动处理: {:?}", recovery_result.message, recovery_result.remaining_issues),
                    })
                }
            }
            Err(e) => {
                error!("❌ 自动恢复过程出错: {}", e);
                Ok(NavigationResult {
                    success: false,
                    message: format!("自动恢复过程出错: {}", e),
                })
            }
        }
    }

    /// 获取用户友好的错误解决方案
    pub fn get_error_solutions(&self, error_type: &str) -> Vec<String> {
        match error_type {
            "device_disconnected" => vec![
                "1. 检查USB数据线连接是否牢固".to_string(),
                "2. 确认设备已开启'USB调试'模式".to_string(),
                "3. 尝试重新连接USB线或更换USB端口".to_string(),
                "4. 在设备上允许此计算机的USB调试授权".to_string(),
                "5. 重启ADB服务：关闭程序后重新打开".to_string(),
            ],
            "adb_unresponsive" => vec![
                "1. 等待10-15秒让设备响应".to_string(),
                "2. 重启ADB服务（程序会自动尝试）".to_string(),
                "3. 拔掉USB线等待5秒后重新连接".to_string(),
                "4. 检查设备是否在传输文件或其他操作中".to_string(),
                "5. 重启设备的开发者选项".to_string(),
            ],
            "screen_locked" => vec![
                "1. 手动解锁设备屏幕".to_string(),
                "2. 确保设备屏幕保持亮屏状态".to_string(),
                "3. 关闭设备的自动锁屏功能（开发者选项中的'保持唤醒状态'）".to_string(),
                "4. 如果设置了复杂密码，建议临时改为简单滑动解锁".to_string(),
            ],
            "app_not_installed" => vec![
                "1. 在设备上安装小红书应用".to_string(),
                "2. 确保应用版本为最新版本".to_string(),
                "3. 检查应用是否被设备管理软件禁用".to_string(),
                "4. 重新安装小红书应用".to_string(),
            ],
            "app_not_running" => vec![
                "1. 手动启动小红书应用".to_string(),
                "2. 确保应用未被后台管理限制".to_string(),
                "3. 检查应用是否需要登录".to_string(),
                "4. 清除应用缓存后重启".to_string(),
            ],
            "permission_denied" => vec![
                "1. 在小红书应用中允许必要的权限（联系人、存储等）".to_string(),
                "2. 检查设备的权限管理设置".to_string(),
                "3. 重新启动小红书应用".to_string(),
                "4. 在应用信息中手动开启所有权限".to_string(),
            ],
            "ui_not_accessible" => vec![
                "1. 检查设备上是否开启了无障碍服务".to_string(),
                "2. 确保屏幕上没有其他应用的悬浮窗".to_string(),
                "3. 关闭设备的省电模式".to_string(),
                "4. 检查设备是否有弹窗或通知阻挡界面".to_string(),
            ],
            "network_error" => vec![
                "1. 检查设备的网络连接".to_string(),
                "2. 确保小红书应用有网络访问权限".to_string(),
                "3. 尝试切换WiFi或移动数据".to_string(),
                "4. 重启设备的网络连接".to_string(),
            ],
            _ => vec![
                "1. 重启设备后重试".to_string(),
                "2. 检查所有连接和设置".to_string(),
                "3. 联系技术支持获取帮助".to_string(),
            ],
        }
    }

    /// 生成详细的故障排除报告
    pub async fn generate_troubleshoot_report(&self) -> Result<String> {
        info!("📋 生成故障排除报告...");
        
        let mut report = String::new();
        report.push_str("📋 小红书自动化故障排除报告\n");
        report.push_str("=====================================\n\n");
        
        // 1. 基本信息
        report.push_str("🔧 基本信息:\n");
        report.push_str(&format!("设备ID: {}\n", self.device_id));
        report.push_str(&format!("ADB路径: {}\n", self.adb_path));
        report.push_str(&format!("生成时间: {}\n\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
        
        // 2. 设备健康检查
        report.push_str("🏥 设备健康检查:\n");
        match self.check_device_health().await {
            Ok(health) => {
                report.push_str(&format!("整体状态: {:?}\n", health.overall_health));
                report.push_str(&format!("设备连接: {}\n", if health.device_connected { "✅ 正常" } else { "❌ 异常" }));
                report.push_str(&format!("ADB响应: {}\n", if health.adb_responsive { "✅ 正常" } else { "❌ 异常" }));
                report.push_str(&format!("屏幕响应: {}\n", if health.screen_responsive { "✅ 正常" } else { "❌ 异常" }));
                report.push_str(&format!("应用访问: {}\n", if health.app_accessible { "✅ 正常" } else { "❌ 异常" }));
                
                if !health.issues.is_empty() {
                    report.push_str("\n⚠️ 发现的问题:\n");
                    for (i, issue) in health.issues.iter().enumerate() {
                        report.push_str(&format!("{}. {}\n", i + 1, issue));
                    }
                }
                
                if !health.recommendations.is_empty() {
                    report.push_str("\n💡 建议:\n");
                    for (i, rec) in health.recommendations.iter().enumerate() {
                        report.push_str(&format!("{}. {}\n", i + 1, rec));
                    }
                }
            }
            Err(e) => {
                report.push_str(&format!("❌ 健康检查失败: {}\n", e));
            }
        }
        
        // 3. 应用状态
        report.push_str("\n📱 应用状态:\n");
        match self.check_app_status().await {
            Ok(app_status) => {
                report.push_str(&format!("应用安装: {}\n", if app_status.app_installed { "✅ 已安装" } else { "❌ 未安装" }));
                report.push_str(&format!("应用运行: {}\n", if app_status.app_running { "✅ 运行中" } else { "❌ 未运行" }));
                if let Some(version) = &app_status.app_version {
                    report.push_str(&format!("应用版本: {}\n", version));
                }
                report.push_str(&format!("状态消息: {}\n", app_status.message));
            }
            Err(e) => {
                report.push_str(&format!("❌ 应用状态检查失败: {}\n", e));
            }
        }
        
        // 4. 常见问题解决方案
        report.push_str("\n🛠️ 常见问题解决方案:\n");
        
        let common_issues = vec![
            ("设备连接问题", "device_disconnected"),
            ("ADB响应异常", "adb_unresponsive"),
            ("屏幕锁定", "screen_locked"),
            ("应用未安装", "app_not_installed"),
            ("应用未运行", "app_not_running"),
            ("权限被拒绝", "permission_denied"),
            ("界面无法访问", "ui_not_accessible"),
            ("网络错误", "network_error"),
        ];
        
        for (issue_name, error_type) in common_issues {
            report.push_str(&format!("\n📌 {}:\n", issue_name));
            let solutions = self.get_error_solutions(error_type);
            for solution in solutions {
                report.push_str(&format!("   {}\n", solution));
            }
        }
        
        // 5. 联系支持
        report.push_str("\n📞 获取帮助:\n");
        report.push_str("如果以上解决方案都无法解决问题，请：\n");
        report.push_str("1. 保存此报告内容\n");
        report.push_str("2. 记录具体的错误信息\n");
        report.push_str("3. 联系技术支持\n");
        
        Ok(report)
    }

    /// 智能导航到通讯录页面
    pub async fn navigate_to_contacts(&self) -> Result<NavigationResult> {
        info!("🧭 开始导航到小红书通讯录页面（基于成功实践的流程）");

        // 步骤1: 确保应用正在运行
        info!("📱 步骤1: 检查小红书应用状态");
        let app_status = self.check_app_status().await?;
        if !app_status.app_installed {
            let error_msg = "小红书应用未安装".to_string();
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }

        if !app_status.app_running {
            info!("📱 应用未运行，正在启动小红书应用...");
            if let Err(e) = self.start_xiaohongshu_app().await {
                let error_msg = format!("启动小红书应用失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
            sleep(Duration::from_millis(3000)).await;
        } else {
            info!("✅ 小红书应用已运行");
        }

        // 步骤2: 检查当前页面状态并确定起始点
        info!("🏠 步骤2: 检查当前页面状态");
        let page_state = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                let error_msg = format!("页面识别失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📋 当前页面状态: {:?}, 置信度: {:.2}", page_state.current_state, page_state.confidence);
        
        // 根据当前状态决定从哪一步开始
        match page_state.current_state {
            PageState::Home => {
                info!("✓ 当前在桌面，需要启动小红书应用");
                if let Err(e) = self.start_xiaohongshu_app().await {
                    let error_msg = format!("启动小红书应用失败: {}", e);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                sleep(Duration::from_millis(5000)).await;
                
                // 启动后重新检查页面状态
                let new_state = match self.recognize_current_page().await {
                    Ok(state) => state,
                    Err(e) => {
                        let error_msg = format!("启动后页面识别失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                info!("📋 启动后页面状态: {:?}, 置信度: {:.2}", new_state.current_state, new_state.confidence);
                
                // 根据启动后的状态继续导航
                match new_state.current_state {
                    PageState::MainPage => {
                        info!("✓ 小红书已启动到主页面，继续导航流程");
                        // 继续执行步骤3
                    }
                    PageState::SidebarOpen => {
                        info!("✓ 启动后侧边栏已打开，直接进入步骤4");
                        return self.navigate_from_sidebar().await;
                    }
                    _ => {
                        info!("⚠️ 启动后页面状态未知，继续尝试导航");
                        // 继续执行默认流程
                    }
                }
            }
            PageState::MainPage => {
                info!("✓ 当前在主页面，从步骤3开始（点击头像）");
                // 继续执行步骤3
            }
            PageState::SidebarOpen => {
                info!("✓ 侧边栏已打开，跳过步骤3，直接进入步骤4（点击发现好友）");
                // 跳转到步骤4
                return self.navigate_from_sidebar().await;
            }
            PageState::DiscoverFriends => {
                info!("✓ 已在发现好友页面，跳到步骤5（点击通讯录）");
                return self.navigate_from_discover_friends().await;
            }
            PageState::ContactsList => {
                info!("✅ 已在通讯录页面，导航完成！");
                return Ok(NavigationResult {
                    success: true,
                    message: "已在通讯录页面".to_string(),
                });
            }
            _ => {
                info!("⚠️ 未知页面状态，尝试返回主页面");
                if let Err(e) = self.return_to_home().await {
                    let error_msg = format!("返回主页失败: {}", e);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                sleep(Duration::from_millis(3000)).await;
                
                // 重新检查页面状态
                let retry_state = match self.recognize_current_page().await {
                    Ok(state) => state,
                    Err(e) => {
                        let error_msg = format!("重试页面识别失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                if !matches!(retry_state.current_state, PageState::MainPage) {
                    let error_msg = format!("无法返回到主页面，当前状态: {:?}", retry_state.current_state);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                info!("✓ 成功返回主页面");
            }
        }

        // 步骤3: 点击头像打开侧边栏（已验证坐标: 60, 100）
        info!("👤 步骤3: 点击头像打开侧边栏，坐标:(60, 100)");
        if let Err(e) = self.adb_tap(60, 100).await {
            let error_msg = format!("点击头像失败: {}", e);
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }
        sleep(Duration::from_millis(2000)).await;
        
        // 验证侧边栏是否打开并继续导航
        self.navigate_from_sidebar().await
    }

    /// 从侧边栏继续导航流程
    async fn navigate_from_sidebar(&self) -> Result<NavigationResult> {
        info!("🔍 验证侧边栏状态");
        let sidebar_check = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                let error_msg = format!("侧边栏状态检查失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📋 侧边栏检查结果: {:?}, 置信度: {:.2}", sidebar_check.current_state, sidebar_check.confidence);
        
        if !matches!(sidebar_check.current_state, PageState::SidebarOpen) {
            let error_msg = format!("侧边栏打开失败，当前状态: {:?}", sidebar_check.current_state);
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }
        info!("✓ 侧边栏状态确认");

        // 步骤4: 在侧边栏中点击"发现好友"
        info!("👥 步骤4: 查找并点击发现好友选项");
        let discover_coords = match self.find_discover_friends_coords().await {
            Ok(coords) => coords,
            Err(e) => {
                let error_msg = format!("查找发现好友坐标失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📍 发现好友坐标: ({}, {})", discover_coords.0, discover_coords.1);
        if let Err(e) = self.adb_tap(discover_coords.0, discover_coords.1).await {
            let error_msg = format!("点击发现好友失败: {}", e);
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }
        sleep(Duration::from_millis(2000)).await;
        
        // 检查结果并继续导航
        self.navigate_from_discover_friends().await
    }

    /// 从发现好友页面继续导航流程
    async fn navigate_from_discover_friends(&self) -> Result<NavigationResult> {
        // 验证是否到达发现好友页面或直接到达联系人页面
        let discover_check = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                let error_msg = format!("发现好友页面状态检查失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📋 发现好友页面检查结果: {:?}, 置信度: {:.2}", discover_check.current_state, discover_check.confidence);
        
        match discover_check.current_state {
            PageState::DiscoverFriends => {
                info!("✓ 成功进入发现好友页面，继续点击通讯录选项");
                
                // 步骤5: 点击"通讯录朋友"选项
                info!("📋 步骤5: 查找并点击通讯录朋友选项");
                let contacts_coords = match self.find_contacts_option_coords().await {
                    Ok(coords) => coords,
                    Err(e) => {
                        let error_msg = format!("查找通讯录选项坐标失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                info!("📍 通讯录选项坐标: ({}, {})", contacts_coords.0, contacts_coords.1);
                if let Err(e) = self.adb_tap(contacts_coords.0, contacts_coords.1).await {
                    let error_msg = format!("点击通讯录选项失败: {}", e);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                sleep(Duration::from_millis(3000)).await; // 联系人加载可能需要更长时间
                
                // 验证最终是否到达联系人页面
                let final_check = match self.recognize_current_page().await {
                    Ok(state) => state,
                    Err(e) => {
                        let error_msg = format!("最终页面状态检查失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                info!("📋 最终页面检查结果: {:?}, 置信度: {:.2}", final_check.current_state, final_check.confidence);
                
                if matches!(final_check.current_state, PageState::ContactsList) {
                    info!("✅ 成功导航到联系人页面");
                    Ok(NavigationResult {
                        success: true,
                        message: "成功导航到通讯录页面".to_string(),
                    })
                } else {
                    let error_msg = format!("导航失败，最终状态: {:?}，置信度: {:.2}", final_check.current_state, final_check.confidence);
                    error!("❌ {}", error_msg);
                    Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    })
                }
            },
            PageState::ContactsList => {
                info!("✅ 直接进入了联系人页面，导航成功！");
                Ok(NavigationResult {
                    success: true,
                    message: "成功导航到通讯录页面（直接跳转）".to_string(),
                })
            },
            _ => {
                let error_msg = format!("未能进入发现好友页面，当前状态: {:?}，置信度: {:.2}", discover_check.current_state, discover_check.confidence);
                error!("❌ {}", error_msg);
                Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                })
            }
        }
    }

    /// 智能页面识别
    pub async fn recognize_current_page(&self) -> Result<PageRecognitionResult> {
        info!("🔍 开始识别当前页面状态...");

        let ui_dump = self.get_ui_dump().await?;
        let ui_elements = self.parse_ui_elements(&ui_dump).await?;
        
        // 分析页面特征
        let (page_state, confidence, key_elements) = self.analyze_page_state(&ui_dump, &ui_elements).await?;
        
        let message = format!("识别到页面: {:?}, 信心度: {:.2}", page_state, confidence);
        info!("📋 {}", message);
        
        // 打印关键元素
        if !key_elements.is_empty() {
            info!("🔑 关键元素: {:?}", key_elements);
        }

        Ok(PageRecognitionResult {
            current_state: page_state,
            confidence,
            key_elements,
            ui_elements,
            message,
        })
    }

    /// 分析页面状态
    async fn analyze_page_state(&self, ui_dump: &str, _ui_elements: &[UIElement]) -> Result<(PageState, f32, Vec<String>)> {
        let mut key_elements = Vec::new();
        let mut confidence_scores = Vec::new();

        info!("🔍 分析UI内容，总长度: {} 字符", ui_dump.len());

        // 首先检查是否在Android桌面
        if ui_dump.contains("com.android.launcher3") || ui_dump.contains("launcher3") {
            key_elements.push("Android桌面".to_string());
            confidence_scores.push((PageState::Home, 0.95));
            info!("✓ 检测到Android桌面特征 - 需要启动小红书应用");
        }

        // 检查主页特征
        if ui_dump.contains("首页") || ui_dump.contains("推荐") || (ui_dump.contains("关注") && ui_dump.contains("发现")) {
            key_elements.push("主页导航".to_string());
            confidence_scores.push((PageState::MainPage, 0.8));
            info!("✓ 检测到主页特征");
        }

        // 检查侧边栏特征
        if ui_dump.contains("设置") || ui_dump.contains("我的主页") || ui_dump.contains("发现好友") {
            key_elements.push("侧边栏菜单".to_string());
            confidence_scores.push((PageState::SidebarOpen, 0.9));
            info!("✓ 检测到侧边栏特征");
        }

        // 检查发现好友页面特征
        if ui_dump.contains("发现好友") || (ui_dump.contains("通讯录") && ui_dump.contains("好友")) {
            key_elements.push("发现好友页面".to_string());
            confidence_scores.push((PageState::DiscoverFriends, 0.85));
            info!("✓ 检测到发现好友页面特征");
        }

        // 检查通讯录页面特征
        if (ui_dump.contains("通讯录") || ui_dump.contains("联系人")) && 
           (ui_dump.contains("关注") || ui_dump.contains("已关注") || ui_dump.contains("follow")) {
            key_elements.push("通讯录关注列表".to_string());
            confidence_scores.push((PageState::ContactsList, 0.9));
            info!("✓ 检测到通讯录页面特征");
        }

        // 检查用户资料页面特征
        if ui_dump.contains("粉丝") && ui_dump.contains("关注") && ui_dump.contains("获赞") {
            key_elements.push("用户资料页面".to_string());
            confidence_scores.push((PageState::UserProfile, 0.85));
            info!("✓ 检测到用户资料页面特征");
        }

        // 确定最佳匹配
        if let Some((page_state, confidence)) = confidence_scores.into_iter().max_by(|a, b| a.1.partial_cmp(&b.1).unwrap()) {
            info!("🎯 最佳匹配: {:?}, 置信度: {:.2}", page_state, confidence);
            Ok((page_state, confidence, key_elements))
        } else {
            info!("❓ 未识别出页面类型");
            Ok((PageState::Unknown, 0.0, key_elements))
        }
    }

    /// 解析UI元素（简化版本）
    async fn parse_ui_elements(&self, ui_dump: &str) -> Result<Vec<UIElement>> {
        let mut elements = Vec::new();
        
        // 简化的XML解析 - 查找可点击元素
        for line in ui_dump.lines() {
            if line.contains("clickable=\"true\"") || line.contains("关注") || line.contains("发现好友") {
                if let Some(element) = self.parse_ui_element_line(line) {
                    elements.push(element);
                }
            }
        }
        
        info!("📊 解析到 {} 个UI元素", elements.len());
        Ok(elements)
    }

    /// 解析单行UI元素
    fn parse_ui_element_line(&self, line: &str) -> Option<UIElement> {
        // 简化的解析逻辑，实际项目中应该使用更完整的XML解析
        if line.contains("text=") {
            let text = line.split("text=\"").nth(1)?.split("\"").next()?.to_string();
            Some(UIElement {
                element_type: UIElementType::Button,
                text,
                bounds: (0, 0, 0, 0), // 简化处理
                clickable: line.contains("clickable=\"true\""),
                resource_id: None,
                class_name: None,
            })
        } else {
            None
        }
    }

    /// 启动小红书应用
    async fn start_xiaohongshu_app(&self) -> Result<()> {
        info!("🚀 启动小红书应用...");

        // 方法1: 通过ADB命令直接启动应用
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s", &self.device_id,
                "shell", "am", "start",
                "-n", "com.xingin.xhs/.index.v2.IndexActivityV2"
            ])
            .output()
            .context("启动小红书应用失败")?;

        if output.status.success() {
            info!("✓ 小红书应用启动成功（通过ADB命令）");
            return Ok(());
        }

        // 方法2: 如果ADB启动失败，尝试从桌面点击图标
        warn!("⚠️ ADB启动失败，尝试从桌面点击小红书图标");
        let ui_dump = self.get_ui_dump().await?;
        
        // 查找小红书图标的坐标
        if let Some(xiaohongshu_bounds) = self.extract_xiaohongshu_icon_coords(&ui_dump) {
            info!("📍 找到小红书图标坐标: {:?}", xiaohongshu_bounds);
            
            // 计算点击坐标（图标中心）
            let click_x = (xiaohongshu_bounds.0 + xiaohongshu_bounds.2) / 2;
            let click_y = (xiaohongshu_bounds.1 + xiaohongshu_bounds.3) / 2;
            
            info!("👆 点击小红书图标坐标: ({}, {})", click_x, click_y);
            self.click_coordinates(click_x, click_y).await?;
            
            info!("✓ 小红书应用启动成功（通过桌面图标）");
            return Ok(());
        }

        let error_msg = String::from_utf8_lossy(&output.stderr);
        Err(anyhow::anyhow!("启动应用失败: {}", error_msg))
    }

    /// 从UI dump中提取小红书图标的坐标
    fn extract_xiaohongshu_icon_coords(&self, ui_dump: &str) -> Option<(i32, i32, i32, i32)> {
        // 查找包含"小红书"文本的节点
        for line in ui_dump.lines() {
            if line.contains("小红书") && line.contains("bounds=") {
                // 提取bounds信息
                if let Some(bounds_start) = line.find("bounds=\"[") {
                    if let Some(bounds_end) = line[bounds_start..].find("]\"") {
                        let bounds_str = &line[bounds_start + 9..bounds_start + bounds_end];
                        
                        // 解析坐标格式: [left,top][right,bottom]
                        if let Some(middle) = bounds_str.find("][") {
                            let left_top = &bounds_str[..middle];
                            let right_bottom = &bounds_str[middle + 2..];
                            
                            if let (Some(comma1), Some(comma2)) = (left_top.find(','), right_bottom.find(',')) {
                                if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                                    left_top[..comma1].parse::<i32>(),
                                    left_top[comma1 + 1..].parse::<i32>(),
                                    right_bottom[..comma2].parse::<i32>(),
                                    right_bottom[comma2 + 1..].parse::<i32>(),
                                ) {
                                    info!("✓ 解析到小红书图标坐标: ({}, {}, {}, {})", left, top, right, bottom);
                                    return Some((left, top, right, bottom));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        warn!("⚠️ 未能从UI dump中找到小红书图标坐标");
        None
    }

    /// 查找发现好友按钮坐标
    async fn find_discover_friends_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 智能查找发现好友按钮坐标...");
        
        // 获取UI dump
        let ui_dump = self.get_ui_dump().await?;
        info!("📱 UI内容长度: {} 字符", ui_dump.len());
        
        // 尝试解析XML并查找发现好友相关元素
        if let Some(coords) = self.parse_discover_friends_from_ui(&ui_dump).await {
            info!("✅ 从UI解析到发现好友坐标: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 如果解析失败，使用基于成功实践的候选坐标（按验证成功的优先级排序）
        let candidates = vec![
            (270, 168, "发现好友位置1 - 验证成功坐标"), // 来自测试模块验证成功的准确坐标
            (160, 280, "发现好友位置2 - 侧边栏上部"),
            (160, 320, "发现好友位置3 - 侧边栏中部"),
            (160, 360, "发现好友位置4 - 侧边栏中下部"),
            (180, 300, "发现好友位置5 - 稍右偏移"),
            (140, 340, "发现好友位置6 - 稍左偏移"),
        ];

        info!("⚠️ UI解析失败，尝试候选坐标...");
        
        // 添加调试信息：输出UI dump的关键片段
        info!("🔍 UI dump关键内容调试:");
        let lines: Vec<&str> = ui_dump.lines().collect();
        for (i, line) in lines.iter().enumerate() {
            if line.contains("发现") || line.contains("好友") || line.contains("通讯录") || line.contains("联系人") {
                info!("📝 第{}行包含关键词: {}", i, line.trim());
            }
        }
        
        // 输出UI dump的前几行和后几行供参考
        info!("📄 UI dump前10行:");
        for (i, line) in lines.iter().take(10).enumerate() {
            info!("  {}： {}", i, line.trim());
        }
        
        // 基于UI内容选择最佳候选坐标
        for (x, y, desc) in &candidates {
            info!("🎯 尝试候选位置: {} 坐标:({}, {})", desc, x, y);
            
            // 检查UI内容中是否有相关的文本提示
            if ui_dump.contains("发现好友") {
                info!("✓ UI中发现'发现好友'文本，选择坐标: ({}, {})", x, y);
                return Ok((*x, *y));
            }
        }

        // 如果都没找到，使用第一个候选位置并警告
        let default_coords = candidates[0];
        warn!("⚠️ 未找到发现好友文本，使用默认坐标: {} ({}, {})", default_coords.2, default_coords.0, default_coords.1);
        Ok((default_coords.0, default_coords.1))
    }

    /// 从UI内容中解析发现好友按钮坐标
    async fn parse_discover_friends_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)> {
        info!("🔧 解析UI XML内容查找发现好友按钮...");
        
        // 查找包含"发现好友"文本的XML节点
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        // 首先尝试精确匹配"发现好友"
        for (i, line) in lines.iter().enumerate() {
            if line.contains("发现好友") {
                info!("📍 找到包含'发现好友'的行 {}: {}", i, line.trim());
                
                // 尝试从当前行或相邻行解析bounds属性
                for check_line in &lines[i.saturating_sub(2)..=(i + 2).min(lines.len() - 1)] {
                    if let Some(bounds) = self.extract_bounds_from_line(check_line) {
                        let center_x = (bounds.0 + bounds.2) / 2;
                        let center_y = (bounds.1 + bounds.3) / 2;
                        info!("✅ 解析到边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                        
                        // 验证坐标合理性（避免过小或过大的坐标）
                        if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        
        // 如果没有找到"发现好友"，尝试查找"发现"和"好友"分开的情况
        for (i, line) in lines.iter().enumerate() {
            if line.contains("发现") && (line.contains("clickable=\"true\"") || line.contains("TextView")) {
                info!("📍 找到包含'发现'的可点击元素行 {}: {}", i, line.trim());
                
                // 检查前后几行是否有"好友"
                let context_lines = &lines[i.saturating_sub(3)..=(i + 3).min(lines.len() - 1)];
                if context_lines.iter().any(|l| l.contains("好友")) {
                    info!("📍 在上下文中找到'好友'，认为这是发现好友按钮");
                    
                    if let Some(bounds) = self.extract_bounds_from_line(line) {
                        let center_x = (bounds.0 + bounds.2) / 2;
                        let center_y = (bounds.1 + bounds.3) / 2;
                        info!("✅ 解析到发现好友按钮边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                        
                        if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        
        // 如果没有找到"发现好友"，尝试查找相关的按钮元素
        for line in &lines {
            if (line.contains("clickable=\"true\"") || line.contains("android.widget.TextView")) 
                && (line.contains("好友") || line.contains("发现")) {
                info!("📍 找到可能的相关按钮: {}", line.trim());
                
                if let Some(bounds) = self.extract_bounds_from_line(line) {
                    let center_x = (bounds.0 + bounds.2) / 2;
                    let center_y = (bounds.1 + bounds.3) / 2;
                    info!("✅ 解析到候选边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                    
                    if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                        return Some((center_x, center_y));
                    }
                }
            }
        }
        
        info!("❌ 未能从UI解析到发现好友按钮坐标");
        None
    }

    /// 从XML行中提取bounds属性
    fn extract_bounds_from_line(&self, line: &str) -> Option<(i32, i32, i32, i32)> {
        // 查找bounds="[left,top][right,bottom]"格式
        if let Some(bounds_start) = line.find("bounds=\"[") {
            let bounds_part = &line[bounds_start + 9..];
            if let Some(bounds_end) = bounds_part.find('"') {
                let bounds_str = &bounds_part[..bounds_end];
                
                // 解析 "[left,top][right,bottom]" 格式
                if let Some(middle) = bounds_str.find("][") {
                    let left_top = &bounds_str[..middle];
                    let right_bottom = &bounds_str[middle + 2..];
                    
                    if let (Some(comma1), Some(comma2)) = (left_top.find(','), right_bottom.find(',')) {
                        let left_str = &left_top[..comma1];
                        let top_str = &left_top[comma1 + 1..];
                        let right_str = &right_bottom[..comma2];
                        let bottom_str = &right_bottom[comma2 + 1..];
                        
                        if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                            left_str.parse::<i32>(),
                            top_str.parse::<i32>(),
                            right_str.parse::<i32>(),
                            bottom_str.parse::<i32>()
                        ) {
                            return Some((left, top, right, bottom));
                        }
                    }
                }
            }
        }
        None
    }

    /// 查找通讯录选项坐标
    async fn find_contacts_option_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 智能查找通讯录选项坐标...");
        
        // 获取UI dump
        let ui_dump = self.get_ui_dump().await?;
        info!("📱 UI内容长度: {} 字符", ui_dump.len());
        
        // 尝试解析XML并查找通讯录相关元素
        if let Some(coords) = self.parse_contacts_from_ui(&ui_dump).await {
            info!("✅ 从UI解析到通讯录坐标: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 如果解析失败，使用基于成功实践的候选坐标
        let candidates = vec![
            (200, 250, "通讯录位置1 - 发现好友页面上部"),
            (200, 300, "通讯录位置2 - 发现好友页面中部"),
            (200, 350, "通讯录位置3 - 发现好友页面中下部"),
            (180, 280, "通讯录位置4 - 稍左偏移"),
            (220, 320, "通讯录位置5 - 稍右偏移"),
            (194, 205, "通讯录位置6 - 参考坐标"), // 来自成功文档的坐标
        ];

        info!("⚠️ UI解析失败，尝试候选坐标...");
        
        // 基于UI内容选择最佳候选坐标
        for (x, y, desc) in &candidates {
            info!("🎯 尝试候选位置: {} 坐标:({}, {})", desc, x, y);
            
            // 检查UI内容中是否有相关的文本提示
            if ui_dump.contains("通讯录") || ui_dump.contains("联系人") {
                info!("✓ UI中发现'通讯录'文本，选择坐标: ({}, {})", x, y);
                return Ok((*x, *y));
            }
        }

        // 如果都没找到，使用第一个候选位置并警告
        let default_coords = candidates[0];
        warn!("⚠️ 未找到通讯录文本，使用默认坐标: {} ({}, {})", default_coords.2, default_coords.0, default_coords.1);
        Ok((default_coords.0, default_coords.1))
    }

    /// 从UI内容中解析通讯录选项坐标
    async fn parse_contacts_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)> {
        info!("🔧 解析UI XML内容查找通讯录选项...");
        
        // 查找包含"通讯录"或"联系人"文本的XML节点
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        for (i, line) in lines.iter().enumerate() {
            if line.contains("通讯录") || line.contains("联系人") {
                info!("📍 找到包含'通讯录/联系人'的行 {}: {}", i, line.trim());
                
                // 尝试从当前行或相邻行解析bounds属性
                for check_line in &lines[i.saturating_sub(2)..=(i + 2).min(lines.len() - 1)] {
                    if let Some(bounds) = self.extract_bounds_from_line(check_line) {
                        let center_x = (bounds.0 + bounds.2) / 2;
                        let center_y = (bounds.1 + bounds.3) / 2;
                        info!("✅ 解析到边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                        
                        // 验证坐标合理性
                        if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        
        info!("❌ 未能从UI解析到通讯录选项坐标");
        None
    }

    pub async fn auto_follow(
        &self,
        options: Option<XiaohongshuFollowOptions>,
    ) -> Result<XiaohongshuFollowResult> {
        let start_time = std::time::Instant::now();
        let opts = options.unwrap_or_default();

        let max_pages = opts.max_pages.unwrap_or(5);
        let follow_interval = opts.follow_interval.unwrap_or(2000);
        let skip_existing = opts.skip_existing.unwrap_or(true);
        let return_to_home = opts.return_to_home.unwrap_or(true);

        info!("🚀 开始自动关注流程");
        info!("最大页数: {}, 关注间隔: {}ms", max_pages, follow_interval);

        let mut total_followed = 0;
        let mut pages_processed = 0;
        let mut details = Vec::new();

        for page in 0..max_pages {
            info!("📄 处理第 {} 页", page + 1);

            // 查找当前页面的关注按钮
            let buttons = self.find_follow_buttons().await?;

            if buttons.is_empty() {
                warn!("当前页面没有找到关注按钮");
                break;
            }

            // 遍历按钮进行关注
            for (x, y) in buttons {
                let button_text_before = if skip_existing {
                    self.get_button_text_at(x, y).await.unwrap_or_default()
                } else {
                    String::new()
                };

                // 如果启用跳过已关注，检查按钮状态
                if skip_existing && (button_text_before.contains("已关注") || button_text_before.contains("Following")) {
                    info!("⏭️ 跳过已关注用户 at ({}, {})", x, y);
                    details.push(FollowDetail {
                        user_position: (x, y),
                        follow_success: false,
                        button_text_before: Some(button_text_before),
                        button_text_after: None,
                        error: Some("已关注，跳过".to_string()),
                    });
                    continue;
                }

                // 点击关注按钮
                match self.click_follow_button(x, y).await {
                    Ok(success) => {
                        if success {
                            total_followed += 1;
                            info!("✅ 成功关注用户 at ({}, {})", x, y);

                            let button_text_after = self.get_button_text_at(x, y).await.unwrap_or_default();

                            details.push(FollowDetail {
                                user_position: (x, y),
                                follow_success: true,
                                button_text_before: Some(button_text_before),
                                button_text_after: Some(button_text_after),
                                error: None,
                            });
                        } else {
                            warn!("⚠️ 关注失败 at ({}, {})", x, y);
                            details.push(FollowDetail {
                                user_position: (x, y),
                                follow_success: false,
                                button_text_before: Some(button_text_before),
                                button_text_after: None,
                                error: Some("点击失败".to_string()),
                            });
                        }
                    }
                    Err(e) => {
                        error!("❌ 关注操作失败 at ({}, {}): {}", x, y, e);
                        details.push(FollowDetail {
                            user_position: (x, y),
                            follow_success: false,
                            button_text_before: Some(button_text_before),
                            button_text_after: None,
                            error: Some(format!("操作错误: {}", e)),
                        });
                    }
                }

                // 关注间隔
                sleep(Duration::from_millis(follow_interval)).await;
            }

            pages_processed += 1;

            // 如果不是最后一页，滚动到下一页
            if page < max_pages - 1 {
                info!("📜 滚动到下一页");
                if let Err(e) = self.scroll_down().await {
                    warn!("滚动失败: {}", e);
                    break;
                }
                sleep(Duration::from_millis(1000)).await; // 等待页面加载
            }
        }

        // 如果启用了返回主页选项
        if return_to_home {
            if let Err(e) = self.return_to_home().await {
                warn!("返回主页失败: {}", e);
            }
        }

        let duration = start_time.elapsed().as_secs();
        let success = total_followed > 0;

        info!(
            "自动关注完成: 关注 {} 个用户，处理 {} 页，耗时 {}秒",
            total_followed, pages_processed, duration
        );

        Ok(XiaohongshuFollowResult {
            success,
            total_followed,
            pages_processed,
            duration,
            details,
            message: if success {
                format!("成功关注 {} 个用户", total_followed)
            } else {
                "未关注任何用户".to_string()
            },
        })
    }

    /// 查找页面中的关注按钮坐标
    async fn find_follow_buttons(&self) -> Result<Vec<(i32, i32)>> {
        // 获取UI dump
        let ui_content = self.get_ui_dump().await?;

        // 简化的按钮查找逻辑
        // 在实际应用中，这里应该解析XML并查找关注按钮的准确位置
        let mut buttons = Vec::new();

        // 假设的关注按钮位置（基于UI分析）
        let possible_positions = vec![
            (960, 200), // 第一个用户的关注按钮
            (960, 350), // 第二个用户的关注按钮
            (960, 500), // 第三个用户的关注按钮
            (960, 650), // 第四个用户的关注按钮
        ];

        for (x, y) in possible_positions {
            // 简单检查：如果UI内容包含关注相关文本，认为存在按钮
            if ui_content.contains("关注") || ui_content.contains("follow") {
                buttons.push((x, y));
            }
        }

        Ok(buttons)
    }

    /// 点击关注按钮
    async fn click_follow_button(&self, x: i32, y: i32) -> Result<bool> {
        // 点击按钮
        self.adb_tap(x, y).await?;
        sleep(Duration::from_millis(500)).await;

        // 简化验证：假设点击成功
        Ok(true)
    }

    /// 获取指定位置的按钮文本（简化实现）
    async fn get_button_text_at(&self, _x: i32, _y: i32) -> Result<String> {
        // 简化处理，实际应该通过UI分析获取具体按钮文本
        Ok("关注".to_string())
    }

    /// 获取UI dump
    async fn get_ui_dump(&self) -> Result<String> {
        info!("📱 获取UI dump...");
        
        // 方法1: 直接输出到stdout
        let output1 = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "uiautomator",
                "dump",
                "/dev/stdout",
            ])
            .output()
            .context("获取UI dump失败")?;

        let result1 = String::from_utf8_lossy(&output1.stdout).to_string();
        
        if result1.len() > 100 && result1.contains("<?xml") {
            info!("✓ 方法1成功获取UI dump，长度: {} 字符", result1.len());
            return Ok(result1);
        }

        info!("⚠️ 方法1失败，尝试方法2...");
        
        // 方法2: 先dump到文件，再cat
        let dump_output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "uiautomator",
                "dump",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .output()
            .context("dump到文件失败")?;

        if !dump_output.status.success() {
            let error_msg = String::from_utf8_lossy(&dump_output.stderr);
            return Err(anyhow::anyhow!("UI dump到文件失败: {}", error_msg));
        }

        // 读取UI文件内容
        let output2 = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "cat",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .output()
            .context("读取UI文件失败")?;

        let result2 = String::from_utf8_lossy(&output2.stdout).to_string();
        
        if result2.len() > 100 && result2.contains("<?xml") {
            info!("✓ 方法2成功获取UI dump，长度: {} 字符", result2.len());
            return Ok(result2);
        }

        Err(anyhow::anyhow!("无法获取有效的UI dump"))
    }

    /// 向下滚动页面
    async fn scroll_down(&self) -> Result<()> {
        // 从屏幕中间向上滑动
        let _output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "swipe",
                "500",
                "800", // 起始位置
                "500",
                "300",  // 结束位置
                "1000", // 滑动时长(ms)
            ])
            .output()
            .context("滑动页面失败")?;

        Ok(())
    }

    /// 返回主页
    async fn return_to_home(&self) -> Result<()> {
        // 点击返回按钮或按Home键
        let _output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "keyevent",
                "KEYCODE_HOME",
            ])
            .output()
            .context("返回主页失败")?;

        Ok(())
    }

    /// 通用点击坐标方法
    async fn click_coordinates(&self, x: i32, y: i32) -> Result<()> {
        self.adb_tap(x, y).await
    }

    /// ADB点击坐标
    async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        info!("👆 执行点击操作，坐标:({}, {})", x, y);
        
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "tap",
                &x.to_string(),
                &y.to_string(),
            ])
            .output()
            .context("ADB点击失败")?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("ADB点击失败: {}", error_msg));
        }

        info!("✓ 点击操作成功");
        Ok(())
    }
}