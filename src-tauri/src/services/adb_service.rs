use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use std::time::Instant;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct AdbCommandResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

pub struct AdbService;

impl AdbService {
    pub fn new() -> Self {
        AdbService
    }

    /// 执行ADB命令（带日志记录）
    pub fn execute_command(
        &self,
        adb_path: &str,
        args: &[String],
    ) -> Result<String, Box<dyn std::error::Error>> {
        let start_time = Instant::now();
        
        println!("执行ADB命令: {} {:?}", adb_path, args);

        let mut cmd = Command::new(adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        
        let output = cmd.output()?;
        let duration = start_time.elapsed();

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        println!("返回码: {:?}", output.status.code());
        println!("输出: {:?}", stdout);
        println!("错误: {:?}", stderr);

        // 记录到日志收集器
        crate::services::log_bridge::LOG_COLLECTOR.add_adb_command_log(
            adb_path,
            args,
            &stdout,
            if stderr.is_empty() { None } else { Some(&stderr) },
            output.status.code(),
            duration.as_millis() as u64,
        );

        if output.status.success() {
            Ok(stdout)
        } else {
            Err(format!("ADB命令执行失败: {}", stderr).into())
        }
    }

    /// 检查文件是否存在
    pub fn check_file_exists(&self, path: &str) -> bool {
        Path::new(path).exists()
    }

    /// 检测雷电模拟器ADB路径
    pub fn detect_ldplayer_adb(&self) -> Option<String> {
        // 预先生成格式化路径以避免生命周期问题
        let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
        let temp_dir = std::env::var("TEMP").unwrap_or_default();

        let user_adb_path = format!("{}\\ADB\\adb.exe", user_profile);
        let temp_platform_tools_path = format!("{}\\platform-tools\\adb.exe", temp_dir);
        let android_sdk_path = format!("{}\\Android\\Sdk\\platform-tools\\adb.exe", user_profile);
        let local_android_sdk_path = format!(
            "{}\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe",
            user_profile
        );

        // 智能ADB路径检测 - 优先级顺序
        let adb_paths = vec![
            // 1. 生产环境路径 (发布时ADB与程序在一起) - 使用相对路径
            "platform-tools\\adb.exe",      // 程序目录下的platform-tools文件夹
            
            // 2. 开发环境路径
            "platform-tools/adb.exe",       // Unix风格路径用于开发环境
            
            // 3. 系统ADB路径
            user_adb_path.as_str(),
            temp_platform_tools_path.as_str(),
            android_sdk_path.as_str(),
            local_android_sdk_path.as_str(),
            
            // 4. 雷电模拟器路径（向后兼容）
            "C:\\LDPlayer\\LDPlayer9\\adb.exe",
            "C:\\LDPlayer\\LDPlayer4\\adb.exe",
            "D:\\LDPlayer\\LDPlayer9\\adb.exe",
            "D:\\LDPlayer\\LDPlayer4\\adb.exe",
            "E:\\LDPlayer\\LDPlayer9\\adb.exe",
            "E:\\LDPlayer\\LDPlayer4\\adb.exe",
        ];

        for path in adb_paths {
            if self.check_file_exists(path) {
                println!("Found ADB at: {}", path);
                // 如果是相对路径，尝试转换为绝对路径
                if path.starts_with("platform-tools") {
                    // 获取当前工作目录
                    if let Ok(current_dir) = std::env::current_dir() {
                        let absolute_path = current_dir.join(path);
                        if absolute_path.exists() {
                            return Some(absolute_path.to_string_lossy().to_string());
                        }
                    }
                    // 如果无法转换为绝对路径，返回相对路径
                    return Some(path.to_string());
                }
                return Some(path.to_string());
            }
        }

        None
    }

    /// 获取连接的设备
    pub fn get_devices(&self, adb_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["devices".to_string()])
    }

    /// 连接到设备
    pub fn connect_device(
        &self,
        adb_path: &str,
        address: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["connect".to_string(), address.to_string()])
    }

    /// 断开设备连接
    pub fn disconnect_device(
        &self,
        adb_path: &str,
        address: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["disconnect".to_string(), address.to_string()])
    }

    /// 启动ADB服务器
    pub fn start_server(&self, adb_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["start-server".to_string()])
    }

    /// 停止ADB服务器
    pub fn kill_server(&self, adb_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["kill-server".to_string()])
    }

    /// 获取设备属性
    pub fn get_device_properties(
        &self,
        adb_path: &str,
        device_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(
            adb_path,
            &[
                "-s".to_string(),
                device_id.to_string(),
                "shell".to_string(),
                "getprop".to_string(),
            ],
        )
    }
}
