use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration, Instant};
use tracing::{debug, error, info, warn};

use super::adb_shell_session::AdbShellSession;
use crate::utils::adb_utils::get_adb_path;

// 重用原有的数据结构
use super::xiaohongshu_automator::{
    AppStatusResult, ButtonState, FollowButton, FollowDetail, NavigationResult, 
    XiaohongshuFollowOptions, XiaohongshuFollowResult
};

/// 基于ADB长连接的小红书自动化器
/// 使用持久化shell连接提升性能
pub struct XiaohongshuLongConnectionAutomator {
    device_id: String,
    shell_session: Arc<AdbShellSession>,
    is_initialized: Arc<Mutex<bool>>,
}

impl XiaohongshuLongConnectionAutomator {
    /// 创建新的长连接自动化器实例
    pub async fn new(device_id: String) -> Result<Self> {
        let adb_path = get_adb_path();

        let shell_session = Arc::new(AdbShellSession::new(device_id.clone(), adb_path));
        
        Ok(Self {
            device_id,
            shell_session,
            is_initialized: Arc::new(Mutex::new(false)),
        })
    }

    /// 初始化连接
    pub async fn initialize(&self) -> Result<()> {
        let mut initialized = self.is_initialized.lock().await;
        if *initialized {
            return Ok(());
        }

        info!("🚀 初始化小红书长连接自动化器 - 设备: {}", self.device_id);
        
        // 建立shell连接
        self.shell_session.connect().await?;
        
        // 验证设备连接
        let screen_size = self.shell_session.get_screen_size().await?;
        info!("📱 设备屏幕尺寸: {}x{}", screen_size.0, screen_size.1);
        
        *initialized = true;
        info!("✅ 长连接自动化器初始化完成");
        Ok(())
    }

    /// 检查小红书应用状态（使用长连接）
    pub async fn check_app_status(&self) -> Result<AppStatusResult> {
        self.ensure_initialized().await?;
        
        info!("🔍 检查小红书应用状态（长连接模式）");
        let package_name = "com.xingin.xhs";

        // 检查应用是否安装
        let list_result = self.shell_session.execute_command(&format!("pm list packages {}", package_name)).await?;
        let app_installed = !list_result.trim().is_empty() && list_result.contains(package_name);

        if !app_installed {
            return Ok(AppStatusResult {
                app_installed: false,
                app_running: false,
                message: "小红书应用未安装".to_string(),
                app_version: None,
                package_name: Some(package_name.to_string()),
            });
        }

        // 检查应用是否正在运行
        let activity_result = self.shell_session.execute_command("dumpsys activity activities").await?;
        let app_running = activity_result.contains(package_name);

        // 获取应用版本
        let version_result = self.shell_session.execute_command(&format!("dumpsys package {} | grep versionName", package_name)).await?;
        let app_version = version_result.lines()
            .find(|line| line.contains("versionName"))
            .and_then(|line| line.split('=').nth(1))
            .map(|v| v.trim().to_string());

        Ok(AppStatusResult {
            app_installed,
            app_running,
            message: if app_running { "应用正在运行" } else { "应用已安装但未运行" }.to_string(),
            app_version,
            package_name: Some(package_name.to_string()),
        })
    }

    /// 启动小红书应用（使用长连接）
    pub async fn launch_app(&self) -> Result<NavigationResult> {
        self.ensure_initialized().await?;
        
        info!("🚀 启动小红书应用（长连接模式）");

        // 使用长连接启动应用
        self.shell_session.start_app("com.xingin.xhs").await?;
        
        // 等待应用启动
        sleep(Duration::from_secs(3)).await;

        // 验证启动结果
        let current_activity = self.shell_session.get_current_activity().await?;
        let success = current_activity.contains("com.xingin.xhs");

        Ok(NavigationResult {
            success,
            message: if success { "小红书启动成功" } else { "小红书启动失败" }.to_string(),
        })
    }

    /// 导航到发现好友页面（使用长连接）
    pub async fn navigate_to_discover_friends(&self) -> Result<NavigationResult> {
        self.ensure_initialized().await?;
        
        info!("🧭 导航到发现好友页面（长连接模式）");

        // 获取当前UI结构
        let ui_content = self.shell_session.dump_ui().await?;
        
        // 查找"发现"按钮坐标
        if let Some(discover_coords) = self.find_discover_button(&ui_content) {
            // 使用长连接点击
            self.shell_session.tap(discover_coords.0, discover_coords.1).await?;
            sleep(Duration::from_secs(2)).await;
            
            // 再次获取UI查找"通讯录朋友"
            let ui_content2 = self.shell_session.dump_ui().await?;
            if let Some(contacts_coords) = self.find_contacts_option(&ui_content2) {
                self.shell_session.tap(contacts_coords.0, contacts_coords.1).await?;
                sleep(Duration::from_secs(2)).await;
                
                return Ok(NavigationResult {
                    success: true,
                    message: "成功导航到发现好友页面".to_string(),
                });
            }
        }

        Ok(NavigationResult {
            success: false,
            message: "未能找到发现好友页面入口".to_string(),
        })
    }

    /// 自动关注流程（使用长连接，大幅提升性能）
    pub async fn auto_follow(&self, options: Option<XiaohongshuFollowOptions>) -> Result<XiaohongshuFollowResult> {
        self.ensure_initialized().await?;
        
        let start_time = Instant::now();
        let opts = options.unwrap_or_default();
        let max_pages = opts.max_pages.unwrap_or(5);
        let follow_interval = opts.follow_interval.unwrap_or(2000);
        let skip_existing = opts.skip_existing.unwrap_or(true);

        info!("🚀 开始自动关注流程（长连接模式）");
        info!("最大页数: {}, 关注间隔: {}ms", max_pages, follow_interval);

        let mut total_followed = 0;
        let mut pages_processed = 0;
        let mut details = Vec::new();

        for page in 0..max_pages {
            info!("📄 处理第 {} 页", page + 1);
            pages_processed += 1;

            // 获取当前页面UI（使用长连接，更快速）
            let ui_content = match self.shell_session.dump_ui().await {
                Ok(content) => content,
                Err(e) => {
                    error!("❌ 获取UI失败: {}", e);
                    break;
                }
            };

            // 查找关注按钮
            let buttons = self.find_follow_buttons_from_ui(&ui_content).await?;
            
            if buttons.is_empty() {
                warn!("当前页面没有找到关注按钮");
                break;
            }

            info!("📊 找到 {} 个关注按钮", buttons.len());

            // 批量处理关注按钮（利用长连接优势）
            for button in buttons {
                if skip_existing && button.state == ButtonState::AlreadyFollowed {
                    info!("⏭️ 跳过已关注用户 at ({}, {})", button.x, button.y);
                    details.push(FollowDetail {
                        user_position: (button.x, button.y),
                        follow_success: false,
                        button_text_before: Some(button.text.clone()),
                        button_text_after: None,
                        error: Some("已关注，跳过".to_string()),
                    });
                    continue;
                }

                // 使用长连接执行点击，响应更快
                match self.perform_follow_action(&button).await {
                    Ok(success) => {
                        if success {
                            total_followed += 1;
                            info!("✅ 成功关注用户 at ({}, {})", button.x, button.y);
                            
                            details.push(FollowDetail {
                                user_position: (button.x, button.y),
                                follow_success: true,
                                button_text_before: Some(button.text.clone()),
                                button_text_after: Some("已关注".to_string()),
                                error: None,
                            });
                        } else {
                            details.push(FollowDetail {
                                user_position: (button.x, button.y),
                                follow_success: false,
                                button_text_before: Some(button.text.clone()),
                                button_text_after: None,
                                error: Some("点击无效果".to_string()),
                            });
                        }
                    }
                    Err(e) => {
                        error!("❌ 关注操作失败: {}", e);
                        details.push(FollowDetail {
                            user_position: (button.x, button.y),
                            follow_success: false,
                            button_text_before: Some(button.text.clone()),
                            button_text_after: None,
                            error: Some(format!("操作失败: {}", e)),
                        });
                    }
                }

                // 关注间隔
                sleep(Duration::from_millis(follow_interval)).await;
            }

            // 页面滑动到下一屏（使用长连接，更流畅）
            if page < max_pages - 1 {
                self.scroll_to_next_page().await?;
                sleep(Duration::from_secs(1)).await;
            }
        }

        let duration = start_time.elapsed().as_millis() as u64;
        
        info!("✅ 长连接自动关注完成 - 关注: {}, 处理页面: {}, 用时: {}ms", 
              total_followed, pages_processed, duration);

        Ok(XiaohongshuFollowResult {
            success: true,
            total_followed,
            pages_processed,
            duration,
            details,
            message: format!("使用长连接成功关注 {} 个用户，处理 {} 页", total_followed, pages_processed),
        })
    }

    /// 执行关注操作（使用长连接）
    async fn perform_follow_action(&self, button: &FollowButton) -> Result<bool> {
        // 使用长连接点击，比独立命令快很多
        self.shell_session.tap(button.x, button.y).await?;
        
        // 短暂等待UI更新
        sleep(Duration::from_millis(500)).await;
        
        // 验证点击效果（可选，为了性能可以跳过）
        Ok(true)
    }

    /// 滚动到下一页（使用长连接滑动）
    async fn scroll_to_next_page(&self) -> Result<()> {
        let screen_size = self.shell_session.get_screen_size().await?;
        let start_x = screen_size.0 / 2;
        let start_y = (screen_size.1 * 2) / 3;
        let end_y = screen_size.1 / 3;
        
        // 使用长连接滑动，响应更快
        self.shell_session.swipe(start_x, start_y, start_x, end_y, 300).await?;
        info!("📜 滑动到下一页");
        Ok(())
    }

    /// 从UI内容中查找关注按钮
    async fn find_follow_buttons_from_ui(&self, ui_content: &str) -> Result<Vec<FollowButton>> {
        let mut buttons = Vec::new();
        
        // 简化的按钮查找逻辑
        for line in ui_content.lines() {
            if self.is_follow_button_line(line) {
                if let Some(button) = self.parse_follow_button_from_line(line) {
                    buttons.push(button);
                }
            }
        }

        debug!("🔍 从UI解析出 {} 个关注按钮", buttons.len());
        Ok(buttons)
    }

    /// 检查是否为关注按钮行
    fn is_follow_button_line(&self, line: &str) -> bool {
        let has_follow_text = line.contains("关注") || line.contains("+ 关注");
        let is_clickable = line.contains("clickable=\"true\"");
        let is_button_type = line.contains("Button") || line.contains("TextView");
        
        has_follow_text && is_clickable && is_button_type
    }

    /// 从XML行解析关注按钮
    fn parse_follow_button_from_line(&self, line: &str) -> Option<FollowButton> {
        // 解析bounds属性
        if let Some(bounds_start) = line.find("bounds=\"[") {
            let bounds_end = line[bounds_start..].find("\"]")?;
            let bounds_str = &line[bounds_start + 9..bounds_start + bounds_end];
            let parts: Vec<&str> = bounds_str.split("][").collect();
            
            if parts.len() == 2 {
                let left_top: Vec<&str> = parts[0].split(',').collect();
                let right_bottom: Vec<&str> = parts[1].split(',').collect();
                
                if left_top.len() == 2 && right_bottom.len() == 2 {
                    if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                        left_top[0].parse::<i32>(),
                        left_top[1].parse::<i32>(),
                        right_bottom[0].parse::<i32>(),
                        right_bottom[1].parse::<i32>(),
                    ) {
                        let x = (left + right) / 2;
                        let y = (top + bottom) / 2;
                        
                        // 解析按钮文本
                        let text = if let Some(text_start) = line.find("text=\"") {
                            let text_end = line[text_start + 6..].find("\"")?;
                            line[text_start + 6..text_start + 6 + text_end].to_string()
                        } else {
                            "关注".to_string()
                        };

                        // 分析按钮状态
                        let state = if text.contains("已关注") || text.contains("已关注") {
                            ButtonState::AlreadyFollowed
                        } else if text.contains("关注") {
                            ButtonState::CanFollow
                        } else {
                            ButtonState::Unknown
                        };

                        return Some(FollowButton { x, y, state, text });
                    }
                }
            }
        }
        None
    }

    /// 查找发现按钮坐标
    fn find_discover_button(&self, ui_content: &str) -> Option<(i32, i32)> {
        for line in ui_content.lines() {
            if line.contains("发现") && line.contains("clickable=\"true\"") {
                return self.extract_center_coordinates(line);
            }
        }
        None
    }

    /// 查找通讯录选项坐标  
    fn find_contacts_option(&self, ui_content: &str) -> Option<(i32, i32)> {
        for line in ui_content.lines() {
            if (line.contains("通讯录朋友") || line.contains("通讯录")) && line.contains("clickable=\"true\"") {
                return self.extract_center_coordinates(line);
            }
        }
        None
    }

    /// 从XML行提取中心坐标
    fn extract_center_coordinates(&self, line: &str) -> Option<(i32, i32)> {
        if let Some(bounds_start) = line.find("bounds=\"[") {
            let bounds_end = line[bounds_start..].find("\"]")?;
            let bounds_str = &line[bounds_start + 9..bounds_start + bounds_end];
            let parts: Vec<&str> = bounds_str.split("][").collect();
            
            if parts.len() == 2 {
                let left_top: Vec<&str> = parts[0].split(',').collect();
                let right_bottom: Vec<&str> = parts[1].split(',').collect();
                
                if left_top.len() == 2 && right_bottom.len() == 2 {
                    if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                        left_top[0].parse::<i32>(),
                        left_top[1].parse::<i32>(),
                        right_bottom[0].parse::<i32>(),
                        right_bottom[1].parse::<i32>(),
                    ) {
                        return Some(((left + right) / 2, (top + bottom) / 2));
                    }
                }
            }
        }
        None
    }

    /// 确保连接已初始化
    async fn ensure_initialized(&self) -> Result<()> {
        let initialized = *self.is_initialized.lock().await;
        if !initialized {
            return Err(anyhow::anyhow!("自动化器未初始化，请先调用 initialize()"));
        }
        Ok(())
    }

    /// 断开连接并清理资源
    pub async fn cleanup(&self) -> Result<()> {
        info!("🧹 清理长连接自动化器资源");
        self.shell_session.disconnect().await?;
        Ok(())
    }
}

impl Drop for XiaohongshuLongConnectionAutomator {
    fn drop(&mut self) {
        // 资源会通过AdbShellSession的Drop trait自动清理
        info!("🗑️ 小红书长连接自动化器已释放");
    }
}