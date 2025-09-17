use anyhow::{Context, Result};
use tracing::{error, info, warn};
use super::{core::XiaohongshuAutomator, types::AppStatusResult};

/// 应用状态相关功能扩展 trait
pub trait AppStatusExt {
    async fn check_app_status(&self) -> Result<AppStatusResult>;
    async fn launch_app(&self) -> Result<()>;
    async fn force_stop_app(&self) -> Result<()>;
    async fn restart_app(&self) -> Result<()>;
}

impl AppStatusExt for XiaohongshuAutomator {
    /// 检查应用状态
    async fn check_app_status(&self) -> Result<AppStatusResult> {
        self.check_app_status_impl().await
    }

    /// 启动应用
    async fn launch_app(&self) -> Result<()> {
        self.start_xiaohongshu_app().await
    }

    /// 强制停止应用
    async fn force_stop_app(&self) -> Result<()> {
        // TODO: 添加实际的强制停止逻辑
        info!("强制停止小红书应用");
        Ok(())
    }

    /// 重启应用
    async fn restart_app(&self) -> Result<()> {
        self.start_xiaohongshu_app().await
    }
}

impl XiaohongshuAutomator {
    /// 检查小红书应用状态（实现）
    pub async fn check_app_status_impl(&self) -> Result<AppStatusResult> {
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
        let output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "pm",
                "list",
                "packages",
                package_name,
            ])
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
        let running_output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "activity",
                "activities",
            ])
            .context("检查应用运行状态失败")?;

        let running_result = String::from_utf8_lossy(&running_output.stdout);
        let app_running = running_result.contains(package_name);

        // 获取应用版本 - 使用简化的方法避免Windows管道问题
        let version_output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "package",
                package_name,
            ])
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

    /// 启动小红书应用
    pub async fn start_xiaohongshu_app(&self) -> Result<()> {
        info!("🚀 启动小红书应用...");

        // 方法1: 通过ADB命令直接启动应用（尝试多个Activity）
        let activity_names = [
            "com.xingin.xhs/.index.v2.IndexActivityV2",
            "com.xingin.xhs/.index.IndexActivity", 
            "com.xingin.xhs/com.xingin.xhs.index.v2.IndexActivityV2",
            "com.xingin.xhs/com.xingin.xhs.index.IndexActivity"
        ];

        for activity in &activity_names {
            info!("🎯 尝试启动Activity: {}", activity);
            let output = self.execute_adb_command(&[
                    "-s", &self.device_id,
                    "shell", "am", "start",
                    "-n", activity
                ])
                .context("启动小红书应用失败");

            if let Ok(result) = output {
                if result.status.success() {
                    info!("✓ 小红书应用启动成功（通过ADB命令，Activity: {}）", activity);
                    return Ok(());
                } else {
                    warn!("⚠️ Activity {} 启动失败", activity);
                }
            }
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
            
            info!("✓ 小红书应用启动成功（通过点击图标）");
            return Ok(());
        }

        // 如果都失败了，返回错误
        Err(anyhow::anyhow!("无法启动小红书应用：ADB启动失败且未找到应用图标"))
    }

    /// 从UI dump中提取小红书图标坐标
    fn extract_xiaohongshu_icon_coords(&self, ui_dump: &str) -> Option<(i32, i32, i32, i32)> {
        // 查找小红书相关的UI元素
        for line in ui_dump.lines() {
            if line.contains("小红书") || line.contains("xhs") || line.contains("RedBook") {
                if let Some(bounds) = self.extract_bounds_from_line(line) {
                    return Some(bounds);
                }
            }
        }
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
}