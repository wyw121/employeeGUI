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
        let common_paths = vec![
            "C:\\LDPlayer\\LDPlayer9\\adb.exe",
            "C:\\LDPlayer\\LDPlayer4\\adb.exe",
            "D:\\LDPlayer\\LDPlayer9\\adb.exe",
            "D:\\LDPlayer\\LDPlayer4\\adb.exe",
            "E:\\LDPlayer\\LDPlayer9\\adb.exe",
            "E:\\LDPlayer\\LDPlayer4\\adb.exe",
        ];

        for path in common_paths {
            if self.check_file_exists(path) {
                println!("Found LDPlayer ADB at: {}", path);
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
