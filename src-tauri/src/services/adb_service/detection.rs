use super::core::AdbService;

impl AdbService {
    /// 检测雷电模拟器ADB路径
    /// 智能检测系统中可用的ADB路径，优先使用本地路径
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

    /// 检测智能ADB路径
    /// 更通用的ADB路径检测方法，不仅限于雷电模拟器
    pub fn detect_smart_adb_path(&self) -> Option<String> {
        // 重用现有的检测逻辑
        self.detect_ldplayer_adb()
    }

    /// 验证ADB路径是否有效
    pub fn validate_adb_path(&self, adb_path: &str) -> bool {
        if !self.check_file_exists(adb_path) {
            return false;
        }

        // 尝试执行ADB版本命令来验证可用性
        match self.execute_command(adb_path, &["version".to_string()]) {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    /// 获取ADB版本信息
    pub fn get_adb_version(&self, adb_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_command(adb_path, &["version".to_string()])
    }
}