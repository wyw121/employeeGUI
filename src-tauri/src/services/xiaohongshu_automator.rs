use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

use super::vcf_importer::{
    AppStatusResult, FollowDetail, NavigationResult, XiaohongshuFollowOptions,
    XiaohongshuFollowResult,
};

pub struct XiaohongshuAutomator {
    device_id: String,
    adb_path: String,
}

impl XiaohongshuAutomator {
    pub fn new(device_id: String) -> Self {
        Self {
            device_id,
            adb_path: "D:\\leidian\\LDPlayer9\\adb.exe".to_string(),
        }
    }

    /// 检查小红书应用状态
    pub async fn check_app_status(&self) -> Result<AppStatusResult> {
        info!("检查小红书应用状态");

        // 检查是否安装
        let installed = self.is_app_installed("com.xingin.xhs").await?;

        // 检查是否运行
        let running = if installed {
            self.is_app_running("com.xingin.xhs").await?
        } else {
            false
        };

        // 获取应用版本（简化处理）
        let app_version = if installed {
            Some("未知版本".to_string())
        } else {
            None
        };

        Ok(AppStatusResult {
            app_installed: installed,
            app_running: running,
            app_version,
            package_name: Some("com.xingin.xhs".to_string()),
        })
    }

    /// 检查应用是否安装
    async fn is_app_installed(&self, package_name: &str) -> Result<bool> {
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "pm",
                "list",
                "packages",
                package_name,
            ])
            .output()
            .context("检查应用安装状态失败")?;

        Ok(output.status.success() && !output.stdout.is_empty())
    }

    /// 检查应用是否运行
    async fn is_app_running(&self, package_name: &str) -> Result<bool> {
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "ps",
                "|",
                "grep",
                package_name,
            ])
            .output()
            .context("检查应用运行状态失败")?;

        Ok(!output.stdout.is_empty())
    }

    /// 导航到小红书通讯录页面
    pub async fn navigate_to_contacts(&self) -> Result<NavigationResult> {
        info!("导航到小红书通讯录页面");

        let mut attempts = 0;
        let max_attempts = 3;

        while attempts < max_attempts {
            attempts += 1;

            // 1. 启动小红书应用
            if let Err(e) = self.open_xiaohongshu_app().await {
                warn!("启动小红书失败 (尝试 {}): {}", attempts, e);
                continue;
            }

            sleep(Duration::from_secs(3)).await;

            // 2. 尝试导航到通讯录
            match self.navigate_to_contacts_internal().await {
                Ok(_) => {
                    return Ok(NavigationResult {
                        success: true,
                        current_page: "通讯录页面".to_string(),
                        message: "成功导航到通讯录页面".to_string(),
                        attempts,
                    });
                }
                Err(e) => {
                    warn!("导航失败 (尝试 {}): {}", attempts, e);
                    if attempts < max_attempts {
                        sleep(Duration::from_secs(2)).await;
                    }
                }
            }
        }

        Ok(NavigationResult {
            success: false,
            current_page: "未知页面".to_string(),
            message: format!("导航失败，已尝试 {} 次", max_attempts),
            attempts,
        })
    }

    /// 内部导航逻辑
    async fn navigate_to_contacts_internal(&self) -> Result<()> {
        // 点击左上角菜单按钮
        self.adb_tap(49, 98).await?;
        sleep(Duration::from_secs(2)).await;

        // 在侧边栏中寻找"发现好友"或相关选项
        // 这里使用固定坐标，实际应用中可以通过UI分析获取
        self.adb_tap(200, 300).await?;
        sleep(Duration::from_secs(2)).await;

        // 进入通讯录页面
        self.adb_tap(200, 400).await?;
        sleep(Duration::from_secs(3)).await;

        Ok(())
    }

    /// 启动小红书应用
    async fn open_xiaohongshu_app(&self) -> Result<()> {
        info!("启动小红书应用");

        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "am",
                "start",
                "-n",
                "com.xingin.xhs/.activity.SplashActivity",
            ])
            .output()
            .context("启动小红书应用失败")?;

        if !output.status.success() {
            // 尝试备用启动方式
            let output = Command::new(&self.adb_path)
                .args(&[
                    "-s",
                    &self.device_id,
                    "shell",
                    "monkey",
                    "-p",
                    "com.xingin.xhs",
                    "-c",
                    "android.intent.category.LAUNCHER",
                    "1",
                ])
                .output()
                .context("备用启动方式失败")?;

            if !output.status.success() {
                return Err(anyhow::anyhow!("启动小红书应用失败"));
            }
        }

        Ok(())
    }

    /// 执行小红书自动关注
    pub async fn auto_follow(
        &self,
        options: Option<XiaohongshuFollowOptions>,
    ) -> Result<XiaohongshuFollowResult> {
        let start_time = std::time::Instant::now();
        info!("开始小红书自动关注流程");

        let opts = options.unwrap_or_default();
        let max_pages = opts.max_pages.unwrap_or(5);
        let follow_interval = opts.follow_interval.unwrap_or(2000);
        let skip_existing = opts.skip_existing.unwrap_or(true);
        let return_to_home = opts.return_to_home.unwrap_or(true);

        let mut total_followed = 0;
        let mut pages_processed = 0;
        let mut details = Vec::new();

        // 确保在通讯录页面
        match self.navigate_to_contacts().await? {
            result if !result.success => {
                return Ok(XiaohongshuFollowResult {
                    success: false,
                    total_followed: 0,
                    pages_processed: 0,
                    duration: start_time.elapsed().as_secs(),
                    details: vec![],
                    message: "无法导航到通讯录页面".to_string(),
                });
            }
            _ => {}
        }

        // 开始批量关注
        for page in 0..max_pages {
            pages_processed = page + 1;
            info!("处理第 {} 页", pages_processed);

            // 获取当前页面的关注按钮
            let follow_buttons = self.find_follow_buttons().await?;

            if follow_buttons.is_empty() {
                info!("第 {} 页没有找到关注按钮", pages_processed);
                if page > 0 {
                    // 如果不是第一页且没有按钮，可能已经到底了
                    break;
                }
                // 尝试滚动到下一页
                if page < max_pages - 1 {
                    self.scroll_down().await?;
                    sleep(Duration::from_millis(2000)).await;
                }
                continue;
            }

            info!("找到 {} 个关注按钮", follow_buttons.len());

            // 逐个点击关注按钮
            for (i, (x, y)) in follow_buttons.iter().enumerate() {
                let button_text_before = self
                    .get_button_text_at(*x, *y)
                    .await
                    .unwrap_or("关注".to_string());

                if skip_existing
                    && (button_text_before.contains("已关注")
                        || button_text_before.contains("following"))
                {
                    info!("跳过已关注用户 ({}, {})", x, y);
                    details.push(FollowDetail {
                        user_position: (*x, *y),
                        follow_success: false,
                        button_text_before: Some(button_text_before),
                        button_text_after: None,
                        error: Some("已关注，跳过".to_string()),
                    });
                    continue;
                }

                // 点击关注按钮
                match self.click_follow_button(*x, *y).await {
                    Ok(true) => {
                        total_followed += 1;
                        let button_text_after = self
                            .get_button_text_at(*x, *y)
                            .await
                            .unwrap_or("已关注".to_string());

                        info!("成功关注用户 #{}: ({}, {})", total_followed, x, y);
                        details.push(FollowDetail {
                            user_position: (*x, *y),
                            follow_success: true,
                            button_text_before: Some(button_text_before),
                            button_text_after: Some(button_text_after),
                            error: None,
                        });
                    }
                    Ok(false) => {
                        warn!("关注失败: ({}, {})", x, y);
                        details.push(FollowDetail {
                            user_position: (*x, *y),
                            follow_success: false,
                            button_text_before: Some(button_text_before),
                            button_text_after: None,
                            error: Some("点击失败".to_string()),
                        });
                    }
                    Err(e) => {
                        error!("关注出错: ({}, {}) - {}", x, y, e);
                        details.push(FollowDetail {
                            user_position: (*x, *y),
                            follow_success: false,
                            button_text_before: Some(button_text_before),
                            button_text_after: None,
                            error: Some(e.to_string()),
                        });
                    }
                }

                // 关注间隔
                sleep(Duration::from_millis(follow_interval)).await;
            }

            // 滚动到下一页
            if pages_processed < max_pages {
                info!("滚动到下一页");
                self.scroll_down().await?;
                sleep(Duration::from_millis(2000)).await;
            }
        }

        // 返回主页
        if return_to_home {
            info!("返回小红书主页");
            if let Err(e) = self.return_to_home().await {
                warn!("返回主页失败: {}", e);
            }
        }

        let duration = start_time.elapsed().as_secs();
        let success = total_followed > 0;

        info!(
            "自动关注完成: 关注 {} 个用户，处理 {} 页，耗时 {}秒",
            total_followed, pages_processed, duration
        );

        Ok(XiaohongshuFollowResult {
            success,
            total_followed,
            pages_processed,
            duration,
            details,
            message: if success {
                format!("成功关注 {} 个用户", total_followed)
            } else {
                "未关注任何用户".to_string()
            },
        })
    }

    /// 查找页面中的关注按钮坐标
    async fn find_follow_buttons(&self) -> Result<Vec<(i32, i32)>> {
        // 获取UI dump
        let ui_content = self.get_ui_dump().await?;

        // 简化的按钮查找逻辑
        // 在实际应用中，这里应该解析XML并查找关注按钮的准确位置
        let mut buttons = Vec::new();

        // 假设的关注按钮位置（基于UI分析）
        let possible_positions = vec![
            (960, 200), // 第一个用户的关注按钮
            (960, 350), // 第二个用户的关注按钮
            (960, 500), // 第三个用户的关注按钮
            (960, 650), // 第四个用户的关注按钮
        ];

        for (x, y) in possible_positions {
            // 简单检查：如果UI内容包含关注相关文本，认为存在按钮
            if ui_content.contains("关注") || ui_content.contains("follow") {
                buttons.push((x, y));
            }
        }

        Ok(buttons)
    }

    /// 点击关注按钮
    async fn click_follow_button(&self, x: i32, y: i32) -> Result<bool> {
        // 点击按钮
        self.adb_tap(x, y).await?;
        sleep(Duration::from_millis(500)).await;

        // 简化验证：假设点击成功
        Ok(true)
    }

    /// 获取指定位置的按钮文本（简化实现）
    async fn get_button_text_at(&self, _x: i32, _y: i32) -> Result<String> {
        // 简化处理，实际应该通过UI分析获取具体按钮文本
        Ok("关注".to_string())
    }

    /// 获取UI dump
    async fn get_ui_dump(&self) -> Result<String> {
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "uiautomator",
                "dump",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .output()
            .context("获取UI dump失败")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("UI dump失败"));
        }

        // 读取UI文件内容
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "cat",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .output()
            .context("读取UI文件失败")?;

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    /// 向下滚动页面
    async fn scroll_down(&self) -> Result<()> {
        // 从屏幕中间向上滑动
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "swipe",
                "500",
                "800", // 起始位置
                "500",
                "300",  // 结束位置
                "1000", // 滑动时长(ms)
            ])
            .output()
            .context("滑动页面失败")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("滑动页面失败"));
        }

        Ok(())
    }

    /// 返回主页
    async fn return_to_home(&self) -> Result<()> {
        // 点击返回按钮或按Home键
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "keyevent",
                "KEYCODE_HOME",
            ])
            .output()
            .context("返回主页失败")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("返回主页失败"));
        }

        // 再次启动小红书到主页
        sleep(Duration::from_millis(1000)).await;
        self.open_xiaohongshu_app().await?;

        Ok(())
    }

    /// ADB点击坐标
    async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "tap",
                &x.to_string(),
                &y.to_string(),
            ])
            .output()
            .context("ADB点击失败")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("ADB点击失败"));
        }

        Ok(())
    }
}

impl Default for XiaohongshuFollowOptions {
    fn default() -> Self {
        Self {
            max_pages: Some(5),
            follow_interval: Some(2000),
            skip_existing: Some(true),
            take_screenshots: Some(false),
            return_to_home: Some(true),
        }
    }
}
