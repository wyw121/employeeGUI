use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

// 应用状态检查结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusResult {
    pub app_installed: bool,
    pub app_running: bool,
    pub message: String,
    pub app_version: Option<String>,
    pub package_name: Option<String>,
}

// 导航操作结果
#[derive(Debug, Serialize, Deserialize)]
pub struct NavigationResult {
    pub success: bool,
    pub message: String,
}

// 关注操作配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XiaohongshuFollowOptions {
    pub max_pages: Option<usize>,
    pub follow_interval: Option<u64>,
    pub skip_existing: Option<bool>,
    pub return_to_home: Option<bool>,
}

impl Default for XiaohongshuFollowOptions {
    fn default() -> Self {
        Self {
            max_pages: Some(5),
            follow_interval: Some(2000),
            skip_existing: Some(true),
            return_to_home: Some(true),
        }
    }
}

// 关注操作结果
#[derive(Debug, Serialize, Deserialize)]
pub struct XiaohongshuFollowResult {
    pub success: bool,
    pub total_followed: usize,
    pub pages_processed: usize,
    pub duration: u64,
    pub details: Vec<FollowDetail>,
    pub message: String,
}

// 单个关注操作的详细信息
#[derive(Debug, Serialize, Deserialize)]
pub struct FollowDetail {
    pub user_position: (i32, i32),
    pub follow_success: bool,
    pub button_text_before: Option<String>,
    pub button_text_after: Option<String>,
    pub error: Option<String>,
}

// 页面状态枚举
#[derive(Debug, Clone, PartialEq)]
pub enum PageState {
    Unknown,         // 未知页面
    MainPage,        // 小红书主页
    SidebarOpen,     // 侧边栏已打开
    DiscoverFriends, // 发现好友页面
    ContactsList,    // 通讯录列表页面
    UserProfile,     // 用户资料页面
}

// 页面识别结果
#[derive(Debug, Clone)]
pub struct PageRecognitionResult {
    pub current_state: PageState,
    pub confidence: f32,
    pub key_elements: Vec<String>,
    pub ui_elements: Vec<UIElement>,
    pub message: String,
}

// UI元素信息
#[derive(Debug, Clone)]
pub struct UIElement {
    pub element_type: UIElementType,
    pub text: String,
    pub bounds: (i32, i32, i32, i32), // (left, top, right, bottom)
    pub clickable: bool,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
}

// UI元素类型
#[derive(Debug, Clone, PartialEq)]
pub enum UIElementType {
    Button,
    TextView,
    ImageView,
    EditText,
    RecyclerView,
    LinearLayout,
    RelativeLayout,
    Unknown,
}

// 屏幕信息
#[derive(Debug)]
struct ScreenInfo {
    width: i32,
    height: i32,
}

pub struct XiaohongshuAutomator {
    device_id: String,
    adb_path: String,
}

impl XiaohongshuAutomator {
    /// 创建新的小红书自动化实例
    pub fn new(device_id: String) -> Self {
        Self {
            device_id,
            adb_path: "adb".to_string(), // 默认使用系统PATH中的adb
        }
    }

    /// 检查小红书应用状态
    pub async fn check_app_status(&self) -> Result<AppStatusResult> {
        info!("🔍 检查小红书应用状态");

        // 检查应用是否安装
        let package_name = "com.xingin.xhs";
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

        let app_installed = !output.stdout.is_empty();

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
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "activity",
                "activities",
                "|",
                "grep",
                package_name,
            ])
            .output()
            .context("检查应用运行状态失败")?;

        let app_running = !output.stdout.is_empty();

        // 获取应用版本
        let version_output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "package",
                package_name,
                "|",
                "grep",
                "versionName",
            ])
            .output()
            .context("获取应用版本失败")?;

        let app_version = if !version_output.stdout.is_empty() {
            Some(String::from_utf8_lossy(&version_output.stdout).trim().to_string())
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

    /// 智能导航到通讯录页面
    pub async fn navigate_to_contacts(&self) -> Result<NavigationResult> {
        info!("🧭 开始导航到小红书通讯录页面");

        // 1. 首先启动小红书应用
        let output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "am",
                "start",
                "-n",
                "com.xingin.xhs/com.xingin.xhs.index.v2.IndexActivityV2",
            ])
            .output()
            .context("启动小红书应用失败")?;

        if !output.status.success() {
            return Ok(NavigationResult {
                success: false,
                message: "启动小红书应用失败".to_string(),
            });
        }

        // 等待应用启动
        sleep(Duration::from_millis(3000)).await;

        // 2. 识别当前页面状态
        let page_state = self.recognize_current_page().await?;
        info!("📱 当前页面状态: {:?}", page_state.current_state);

        match page_state.current_state {
            PageState::ContactsList => {
                return Ok(NavigationResult {
                    success: true,
                    message: "已在通讯录页面".to_string(),
                });
            }
            PageState::MainPage => {
                // 从主页导航到通讯录
                info!("📍 从主页导航到通讯录");
                // 点击右下角的"我"按钮
                self.adb_tap(980, 1700).await?;
                sleep(Duration::from_millis(1500)).await;

                // 点击"发现好友"
                self.adb_tap(540, 400).await?;
                sleep(Duration::from_millis(1500)).await;

                // 验证是否成功到达通讯录页面
                let final_state = self.recognize_current_page().await?;
                if matches!(final_state.current_state, PageState::ContactsList) {
                    Ok(NavigationResult {
                        success: true,
                        message: "成功导航到通讯录页面".to_string(),
                    })
                } else {
                    Ok(NavigationResult {
                        success: false,
                        message: "导航失败，未能到达通讯录页面".to_string(),
                    })
                }
            }
            _ => {
                // 其他状态，尝试返回主页
                info!("🏠 返回主页后重新导航");
                self.return_to_home().await?;
                sleep(Duration::from_millis(2000)).await;

                // 返回失败，避免递归
                Ok(NavigationResult {
                    success: false,
                    message: "无法识别当前页面状态，导航失败".to_string(),
                })
            }
        }
    }

    /// 智能页面识别
    pub async fn recognize_current_page(&self) -> Result<PageRecognitionResult> {
        let ui_content = self.get_ui_dump().await?;

        // 简化的页面识别逻辑
        let current_state = if ui_content.contains("通讯录") || ui_content.contains("发现好友") {
            PageState::ContactsList
        } else if ui_content.contains("首页") || ui_content.contains("推荐") {
            PageState::MainPage
        } else if ui_content.contains("侧边栏") {
            PageState::SidebarOpen
        } else {
            PageState::Unknown
        };

        Ok(PageRecognitionResult {
            current_state: current_state.clone(),
            confidence: 0.8, // 简化的置信度
            key_elements: vec![], // 在实际实现中应该包含关键元素
            ui_elements: vec![], // 在实际实现中应该解析UI元素
            message: format!("识别到页面状态: {:?}", current_state),
        })
    }

    /// 执行自动关注流程的核心逻辑
    pub async fn auto_follow(
        &self,
        options: Option<XiaohongshuFollowOptions>,
    ) -> Result<XiaohongshuFollowResult> {
        let start_time = std::time::Instant::now();
        let opts = options.unwrap_or_default();

        let max_pages = opts.max_pages.unwrap_or(5);
        let follow_interval = opts.follow_interval.unwrap_or(2000);
        let skip_existing = opts.skip_existing.unwrap_or(true);
        let return_to_home = opts.return_to_home.unwrap_or(true);

        info!("🚀 开始自动关注流程");
        info!("最大页数: {}, 关注间隔: {}ms", max_pages, follow_interval);

        let mut total_followed = 0;
        let mut pages_processed = 0;
        let mut details = Vec::new();

        for page in 0..max_pages {
            info!("📄 处理第 {} 页", page + 1);

            // 查找当前页面的关注按钮
            let buttons = self.find_follow_buttons().await?;

            if buttons.is_empty() {
                warn!("当前页面没有找到关注按钮");
                break;
            }

            // 遍历按钮进行关注
            for (x, y) in buttons {
                let button_text_before = if skip_existing {
                    self.get_button_text_at(x, y).await.unwrap_or_default()
                } else {
                    String::new()
                };

                // 如果启用跳过已关注，检查按钮状态
                if skip_existing && (button_text_before.contains("已关注") || button_text_before.contains("Following")) {
                    info!("⏭️ 跳过已关注用户 at ({}, {})", x, y);
                    details.push(FollowDetail {
                        user_position: (x, y),
                        follow_success: false,
                        button_text_before: Some(button_text_before),
                        button_text_after: None,
                        error: Some("已关注，跳过".to_string()),
                    });
                    continue;
                }

                // 点击关注按钮
                match self.click_follow_button(x, y).await {
                    Ok(success) => {
                        if success {
                            total_followed += 1;
                            info!("✅ 成功关注用户 at ({}, {})", x, y);

                            let button_text_after = self.get_button_text_at(x, y).await.unwrap_or_default();

                            details.push(FollowDetail {
                                user_position: (x, y),
                                follow_success: true,
                                button_text_before: Some(button_text_before),
                                button_text_after: Some(button_text_after),
                                error: None,
                            });
                        } else {
                            warn!("⚠️ 关注失败 at ({}, {})", x, y);
                            details.push(FollowDetail {
                                user_position: (x, y),
                                follow_success: false,
                                button_text_before: Some(button_text_before),
                                button_text_after: None,
                                error: Some("点击失败".to_string()),
                            });
                        }
                    }
                    Err(e) => {
                        error!("❌ 关注操作失败 at ({}, {}): {}", x, y, e);
                        details.push(FollowDetail {
                            user_position: (x, y),
                            follow_success: false,
                            button_text_before: Some(button_text_before),
                            button_text_after: None,
                            error: Some(format!("操作错误: {}", e)),
                        });
                    }
                }

                // 关注间隔
                sleep(Duration::from_millis(follow_interval)).await;
            }

            pages_processed += 1;

            // 如果不是最后一页，滚动到下一页
            if page < max_pages - 1 {
                info!("📜 滚动到下一页");
                if let Err(e) = self.scroll_down().await {
                    warn!("滚动失败: {}", e);
                    break;
                }
                sleep(Duration::from_millis(1000)).await; // 等待页面加载
            }
        }

        // 如果启用了返回主页选项
        if return_to_home {
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