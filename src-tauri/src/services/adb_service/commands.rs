use std::process::Command;
use std::time::Instant;
use super::core::AdbService;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

impl AdbService {
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

    /// 执行ADB命令（用于智能元素查找服务等异步操作）
    pub async fn execute_adb_command(&self, device_id: &str, command: &str) -> Result<String, Box<dyn std::error::Error>> {
        // 使用默认ADB路径
        let adb_path = "platform-tools/adb.exe";
        let args = if command.starts_with("shell ") {
            vec![
                "-s".to_string(),
                device_id.to_string(),
                command.to_string(),
            ]
        } else {
            vec![
                "-s".to_string(),
                device_id.to_string(),
                "shell".to_string(),
                command.to_string(),
            ]
        };

        self.execute_command(adb_path, &args)
    }

    /// 启动ADB服务器
    pub fn start_server(&self, adb_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["start-server".to_string()])
    }

    /// 停止ADB服务器
    pub fn kill_server(&self, adb_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["kill-server".to_string()])
    }
}