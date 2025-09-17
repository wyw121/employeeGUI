use std::path::Path;
use super::core::AdbService;

impl AdbService {
    /// 检查本地文件是否存在
    pub fn check_file_exists(&self, path: &str) -> bool {
        Path::new(path).exists()
    }

    /// 推送文件到设备
    pub async fn push_file(&self, device_id: &str, local_path: &str, remote_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("push {} {}", local_path, remote_path);
        self.execute_adb_command(device_id, &command).await
    }

    /// 从设备拉取文件
    pub async fn pull_file(&self, device_id: &str, remote_path: &str, local_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("pull {} {}", remote_path, local_path);
        self.execute_adb_command(device_id, &command).await
    }

    /// 在设备上创建目录
    pub async fn create_directory(&self, device_id: &str, path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("mkdir -p {}", path);
        self.execute_adb_command(device_id, &command).await
    }

    /// 删除设备上的文件或目录
    pub async fn remove_file(&self, device_id: &str, path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("rm -rf {}", path);
        self.execute_adb_command(device_id, &command).await
    }

    /// 列出设备目录内容
    pub async fn list_directory(&self, device_id: &str, path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("ls -la {}", path);
        self.execute_adb_command(device_id, &command).await
    }

    /// 读取设备上的文本文件内容
    pub async fn read_file_content(&self, device_id: &str, file_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("cat {}", file_path);
        self.execute_adb_command(device_id, &command).await
    }

    /// 写入文本内容到设备文件
    pub async fn write_file_content(&self, device_id: &str, file_path: &str, content: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("echo '{}' > {}", content, file_path);
        self.execute_adb_command(device_id, &command).await
    }
}