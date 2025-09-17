use super::core::AdbService;

impl AdbService {
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