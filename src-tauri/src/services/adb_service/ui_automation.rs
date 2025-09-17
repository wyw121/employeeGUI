use super::core::AdbService;

impl AdbService {
    /// 获取设备UI层次结构（XML格式）
    /// 用于智能元素查找、UI分析等自动化操作
    pub async fn dump_ui_hierarchy(&self, device_id: &str) -> Result<String, Box<dyn std::error::Error>> {
        // 首先在设备上生成UI dump文件 (使用shell命令)
        self.execute_adb_command(device_id, "shell uiautomator dump /sdcard/ui_hierarchy.xml").await?;
        
        // 然后拉取文件内容 (使用shell命令)
        let content = self.execute_adb_command(device_id, "shell cat /sdcard/ui_hierarchy.xml").await?;
        
        Ok(content)
    }

    /// 获取当前Activity信息
    pub async fn get_current_activity(&self, device_id: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_adb_command(device_id, "shell dumpsys activity activities | grep mCurrentFocus").await
    }

    /// 获取屏幕尺寸
    pub async fn get_screen_size(&self, device_id: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.execute_adb_command(device_id, "shell wm size").await
    }

    /// 点击屏幕坐标
    pub async fn tap_screen(&self, device_id: &str, x: i32, y: i32) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("shell input tap {} {}", x, y);
        self.execute_adb_command(device_id, &command).await
    }

    /// 长按屏幕坐标
    pub async fn long_press(&self, device_id: &str, x: i32, y: i32, duration_ms: u32) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("shell input swipe {} {} {} {} {}", x, y, x, y, duration_ms);
        self.execute_adb_command(device_id, &command).await
    }

    /// 输入文本
    pub async fn input_text(&self, device_id: &str, text: &str) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("shell input text \"{}\"", text);
        self.execute_adb_command(device_id, &command).await
    }

    /// 按键事件
    pub async fn key_event(&self, device_id: &str, keycode: i32) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("shell input keyevent {}", keycode);
        self.execute_adb_command(device_id, &command).await
    }

    /// 滑动屏幕
    pub async fn swipe_screen(&self, device_id: &str, x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: u32) -> Result<String, Box<dyn std::error::Error>> {
        let command = format!("shell input swipe {} {} {} {} {}", x1, y1, x2, y2, duration_ms);
        self.execute_adb_command(device_id, &command).await
    }
}