use anyhow::Result;
use std::process::Command;
use tracing::{error, info, warn};
use crate::utils::adb_utils::get_adb_path;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// 小红书自动化核心结构体
pub struct XiaohongshuAutomator {
    pub device_id: String,
    pub adb_path: String,
}

impl XiaohongshuAutomator {
    /// 创建新的小红书自动化实例
    pub fn new(device_id: String) -> Self {
        let adb_path = get_adb_path();
        
        info!("🚀 创建XiaohongshuAutomator - 设备ID: {}, 最终ADB路径: {}", device_id, adb_path);
            
        Self {
            device_id,
            adb_path,
        }
    }

    /// 使用自定义ADB路径创建实例
    pub fn new_with_adb_path(device_id: String, adb_path: String) -> Self {
        info!("🚀 创建XiaohongshuAutomator（自定义ADB路径） - 设备ID: {}, ADB路径: {}", device_id, adb_path);
        
        Self {
            device_id,
            adb_path,
        }
    }

    /// 执行ADB命令的通用方法
    pub fn execute_adb_command(&self, args: &[&str]) -> Result<std::process::Output> {
        info!("🔧 执行ADB命令: {} {}", self.adb_path, args.join(" "));
        
        let mut command = Command::new(&self.adb_path);
        command.args(args);

        #[cfg(windows)]
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW

        let output = command.output()?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("❌ ADB命令执行失败: {}", stderr);
        }
        
        Ok(output)
    }

    /// 获取UI dump内容
    pub async fn get_ui_dump(&self) -> Result<String> {
        info!("📱 获取UI dump信息");
        
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "uiautomator", "dump", "/dev/stdout"
        ])?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("❌ 获取UI dump失败: {}", error_msg);
            return Err(anyhow::anyhow!("获取UI dump失败: {}", error_msg));
        }

        let stdout = String::from_utf8(output.stdout)?;
        info!("✅ UI dump获取成功，内容长度: {} 字符", stdout.len());
        
        // 检查是否是有效的XML内容
        if stdout.len() < 100 || !stdout.contains("<?xml") {
            warn!("⚠️ UI dump内容异常，长度: {}, 前100字符: {}", 
                stdout.len(), 
                &stdout.chars().take(100).collect::<String>()
            );
            
            // 尝试使用备用方法获取UI dump
            info!("🔄 尝试备用方法获取UI dump");
            return self.get_ui_dump_fallback().await;
        }
        
        Ok(stdout)
    }

    /// 备用方法获取UI dump
    async fn get_ui_dump_fallback(&self) -> Result<String> {
        info!("📱 使用备用方法获取UI dump");
        
        // 先将dump保存到设备文件
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "uiautomator", "dump"
        ])?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("❌ 备用方法获取UI dump失败: {}", error_msg);
            return Err(anyhow::anyhow!("备用方法获取UI dump失败: {}", error_msg));
        }

        // 等待一小段时间确保文件写入完成
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        // 读取文件内容
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "cat", "/sdcard/window_dump.xml"
        ])?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("❌ 读取UI dump文件失败: {}", error_msg);
            return Err(anyhow::anyhow!("读取UI dump文件失败: {}", error_msg));
        }

        let stdout = String::from_utf8(output.stdout)?;
        info!("✅ 备用方法获取UI dump成功，内容长度: {} 字符", stdout.len());
        
        Ok(stdout)
    }

    /// 点击指定坐标
    pub async fn click_coordinates(&self, x: i32, y: i32) -> Result<()> {
        info!("👆 点击坐标: ({}, {})", x, y);
        
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "tap", &x.to_string(), &y.to_string()
        ])?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("❌ 点击操作失败: {}", error_msg);
            return Err(anyhow::anyhow!("点击操作失败: {}", error_msg));
        }

        info!("✅ 点击操作完成");
        Ok(())
    }

    /// ADB点击方法（别名，保持兼容性）
    pub async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        self.click_coordinates(x, y).await
    }

    /// 滚动屏幕
    pub async fn scroll_screen(&self, start_x: i32, start_y: i32, end_x: i32, end_y: i32, duration: u64) -> Result<()> {
        info!("📜 滚动屏幕: ({}, {}) -> ({}, {}), 持续时间: {}ms", start_x, start_y, end_x, end_y, duration);
        
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "swipe", 
            &start_x.to_string(), &start_y.to_string(),
            &end_x.to_string(), &end_y.to_string(),
            &duration.to_string()
        ])?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("❌ 滚动操作失败: {}", error_msg);
            return Err(anyhow::anyhow!("滚动操作失败: {}", error_msg));
        }

        info!("✅ 滚动操作完成");
        Ok(())
    }

    /// 返回Android桌面
    pub async fn return_to_home(&self) -> Result<()> {
        info!("🏠 返回Android桌面");
        
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "keyevent", "KEYCODE_HOME"
        ])?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("❌ 返回桌面失败: {}", error_msg);
            return Err(anyhow::anyhow!("返回桌面失败: {}", error_msg));
        }

        info!("✅ 已返回桌面");
        Ok(())
    }

    /// 按返回键
    pub async fn press_back(&self) -> Result<()> {
        info!("⬅️ 按返回键");
        
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "keyevent", "KEYCODE_BACK"
        ])?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("❌ 按返回键失败: {}", error_msg);
            return Err(anyhow::anyhow!("按返回键失败: {}", error_msg));
        }

        info!("✅ 返回键操作完成");
        Ok(())
    }

    /// 自动关注功能（兼容旧版本接口）
    pub async fn auto_follow(&self, options: Option<super::types::XiaohongshuFollowOptions>) -> Result<super::types::XiaohongshuFollowResult> {
        use super::follow_automation::FollowAutomationExt;
        
        let actual_options = options.unwrap_or_default();
        info!("🚀 开始自动关注流程，配置: {:?}", actual_options);
        
        // 这里可以添加默认的联系人列表，或者从配置中获取
        let contacts = vec![]; // 实际应用中应该从某处获取联系人列表
        let max_follows = actual_options.max_pages.unwrap_or(5);
        
        let results = self.batch_follow_from_contacts(contacts, max_follows).await?;
        
        // 转换结果格式以保持向后兼容
        let success = !results.is_empty();
        let total_followed = results.iter().filter(|r| r.status == super::types::FollowStatus::Success).count();
        
        Ok(super::types::XiaohongshuFollowResult {
            success,
            total_followed,
            pages_processed: 1,
            duration: 0, // TODO: 计算实际耗时
            details: vec![], // TODO: 转换详细信息
            message: format!("处理完成，成功关注 {} 个用户", total_followed),
        })
    }
}