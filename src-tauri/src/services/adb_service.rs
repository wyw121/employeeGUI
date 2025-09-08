use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

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

    /// 执行ADB命令
    pub fn execute_command(
        &self,
        adb_path: &str,
        args: &[String],
    ) -> Result<String, Box<dyn std::error::Error>> {
        println!("执行ADB命令: {} {:?}", adb_path, args);

        let output = Command::new(adb_path).args(args).output()?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        println!("返回码: {:?}", output.status.code());
        println!("输出: {:?}", stdout);
        println!("错误: {:?}", stderr);

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

        let common_paths = vec![
            // Android SDK Platform Tools (系统安装)
            "adb.exe", // 系统PATH中的ADB
            "adb",     // Unix系统中的ADB
            // 用户ADB目录
            user_adb_path.as_str(),
            // 用户临时目录中的Platform Tools
            temp_platform_tools_path.as_str(),
            // Android SDK 标准路径
            android_sdk_path.as_str(),
            local_android_sdk_path.as_str(),
            // 旧版雷电模拟器路径（仍保留以向后兼容）
            "C:\\LDPlayer\\LDPlayer9\\adb.exe",
            "C:\\LDPlayer\\LDPlayer4\\adb.exe",
            "D:\\LDPlayer\\LDPlayer9\\adb.exe",
            "D:\\LDPlayer\\LDPlayer4\\adb.exe",
            "E:\\LDPlayer\\LDPlayer9\\adb.exe",
            "E:\\LDPlayer\\LDPlayer4\\adb.exe",
        ];

        for path in common_paths {
            if path == "adb.exe" || path == "adb" {
                // 测试系统PATH中的ADB
                if let Ok(output) = std::process::Command::new(path).arg("version").output() {
                    if output.status.success() {
                        println!("Found system ADB: {}", path);
                        return Some(path.to_string());
                    }
                }
            } else if self.check_file_exists(path) {
                println!("Found ADB at: {}", path);
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
