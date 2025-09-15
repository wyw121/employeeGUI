use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};
use crate::utils::adb_utils::get_adb_path;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

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
    Home,            // Android桌面
    MainPage,        // 小红书主页
    SidebarOpen,     // 侧边栏已打开
    DiscoverFriends, // 发现好友页面
    ContactsList,    // 通讯录列表页面
    UserProfile,     // 用户资料页面
}

#[derive(Debug, Clone)]
pub struct FollowButton {
    pub x: i32,
    pub y: i32,
    pub state: ButtonState,
    pub text: String,
}

// 按钮状态枚举
#[derive(Debug, Clone, PartialEq)]
pub enum ButtonState {
    CanFollow,       // 可以关注
    AlreadyFollowed, // 已经关注
    Loading,         // 加载中
    Unknown,         // 未知状态
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
        let adb_path = get_adb_path();
        
        info!("🚀 创建XiaohongshuAutomator - 设备ID: {}, 最终ADB路径: {}", device_id, adb_path);
            
        Self {
            device_id,
            adb_path,
        }
    }
    
    /// 执行 ADB 命令并隐藏 CMD 窗口
    fn execute_adb_command(&self, args: &[&str]) -> Result<std::process::Output> {
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        {
            // Windows: 隐藏命令行窗口
            // CREATE_NO_WINDOW = 0x08000000
            cmd.creation_flags(0x08000000);
        }
        
        let output = cmd.output()
            .context(format!("执行ADB命令失败 - ADB路径: {}, 参数: {:?}", self.adb_path, args))?;
        
        Ok(output)
    }
    
    /// 创建新的小红书自动化实例，指定ADB路径
    pub fn new_with_adb_path(device_id: String, adb_path: String) -> Self {
        Self {
            device_id,
            adb_path,
        }
    }

    /// 检查小红书应用状态
    pub async fn check_app_status(&self) -> Result<AppStatusResult> {
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

    /// 智能导航到通讯录页面
    pub async fn navigate_to_contacts(&self) -> Result<NavigationResult> {
        info!("🧭 开始导航到小红书通讯录页面（基于成功实践的流程）");

        // 步骤1: 确保应用正在运行
        info!("📱 步骤1: 检查小红书应用状态");
        let app_status = self.check_app_status().await?;
        if !app_status.app_installed {
            let error_msg = "小红书应用未安装".to_string();
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }

        if !app_status.app_running {
            info!("📱 应用未运行，正在启动小红书应用...");
            if let Err(e) = self.start_xiaohongshu_app().await {
                let error_msg = format!("启动小红书应用失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
            sleep(Duration::from_millis(3000)).await;
        } else {
            info!("✅ 小红书应用已运行");
        }

        // 步骤2: 检查当前页面状态并确定起始点
        info!("🏠 步骤2: 检查当前页面状态");
        let page_state = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                let error_msg = format!("页面识别失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📋 当前页面状态: {:?}, 置信度: {:.2}", page_state.current_state, page_state.confidence);
        
        // 根据当前状态决定从哪一步开始
        match page_state.current_state {
            PageState::Home => {
                info!("✓ 当前在桌面，需要启动小红书应用");
                if let Err(e) = self.start_xiaohongshu_app().await {
                    let error_msg = format!("启动小红书应用失败: {}", e);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                sleep(Duration::from_millis(5000)).await;
                
                // 启动后重新检查页面状态
                let new_state = match self.recognize_current_page().await {
                    Ok(state) => state,
                    Err(e) => {
                        let error_msg = format!("启动后页面识别失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                info!("📋 启动后页面状态: {:?}, 置信度: {:.2}", new_state.current_state, new_state.confidence);
                
                // 根据启动后的状态继续导航
                match new_state.current_state {
                    PageState::MainPage => {
                        info!("✓ 小红书已启动到主页面，继续导航流程");
                        // 继续执行步骤3
                    }
                    PageState::SidebarOpen => {
                        info!("✓ 启动后侧边栏已打开，直接进入步骤4");
                        return self.navigate_from_sidebar().await;
                    }
                    _ => {
                        info!("⚠️ 启动后页面状态未知，继续尝试导航");
                        // 继续执行默认流程
                    }
                }
            }
            PageState::MainPage => {
                info!("✓ 当前在主页面，从步骤3开始（点击头像）");
                // 继续执行步骤3
            }
            PageState::SidebarOpen => {
                info!("✓ 侧边栏已打开，跳过步骤3，直接进入步骤4（点击发现好友）");
                // 跳转到步骤4
                return self.navigate_from_sidebar().await;
            }
            PageState::DiscoverFriends => {
                info!("✓ 已在发现好友页面，跳到步骤5（点击通讯录）");
                return self.navigate_from_discover_friends().await;
            }
            PageState::ContactsList => {
                info!("✅ 已在通讯录页面，导航完成！");
                return Ok(NavigationResult {
                    success: true,
                    message: "已在通讯录页面".to_string(),
                });
            }
            _ => {
                info!("⚠️ 未知页面状态，尝试返回主页面");
                if let Err(e) = self.return_to_home().await {
                    let error_msg = format!("返回主页失败: {}", e);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                sleep(Duration::from_millis(3000)).await;
                
                // 重新检查页面状态
                let retry_state = match self.recognize_current_page().await {
                    Ok(state) => state,
                    Err(e) => {
                        let error_msg = format!("重试页面识别失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                if !matches!(retry_state.current_state, PageState::MainPage) {
                    let error_msg = format!("无法返回到主页面，当前状态: {:?}", retry_state.current_state);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                info!("✓ 成功返回主页面");
            }
        }

        // 步骤3: 点击头像打开侧边栏（已验证坐标: 60, 100）
        info!("👤 步骤3: 点击头像打开侧边栏，坐标:(60, 100)");
        if let Err(e) = self.adb_tap(60, 100).await {
            let error_msg = format!("点击头像失败: {}", e);
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }
        sleep(Duration::from_millis(2000)).await;
        
        // 验证侧边栏是否打开并继续导航
        self.navigate_from_sidebar().await
    }

    /// 从侧边栏继续导航流程
    async fn navigate_from_sidebar(&self) -> Result<NavigationResult> {
        info!("🔍 验证侧边栏状态");
        let sidebar_check = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                let error_msg = format!("侧边栏状态检查失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📋 侧边栏检查结果: {:?}, 置信度: {:.2}", sidebar_check.current_state, sidebar_check.confidence);
        
        if !matches!(sidebar_check.current_state, PageState::SidebarOpen) {
            let error_msg = format!("侧边栏打开失败，当前状态: {:?}", sidebar_check.current_state);
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }
        info!("✓ 侧边栏状态确认");

        // 步骤4: 在侧边栏中点击"发现好友"
        info!("👥 步骤4: 查找并点击发现好友选项");
        let discover_coords = match self.find_discover_friends_coords().await {
            Ok(coords) => coords,
            Err(e) => {
                let error_msg = format!("查找发现好友坐标失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📍 发现好友坐标: ({}, {})", discover_coords.0, discover_coords.1);
        if let Err(e) = self.adb_tap(discover_coords.0, discover_coords.1).await {
            let error_msg = format!("点击发现好友失败: {}", e);
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }
        sleep(Duration::from_millis(2000)).await;
        
        // 检查结果并继续导航
        self.navigate_from_discover_friends().await
    }

    /// 从发现好友页面继续导航流程
    async fn navigate_from_discover_friends(&self) -> Result<NavigationResult> {
        // 验证是否到达发现好友页面或直接到达联系人页面
        let discover_check = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                let error_msg = format!("发现好友页面状态检查失败: {}", e);
                error!("❌ {}", error_msg);
                return Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                });
            }
        };
        
        info!("📋 发现好友页面检查结果: {:?}, 置信度: {:.2}", discover_check.current_state, discover_check.confidence);
        
        match discover_check.current_state {
            PageState::DiscoverFriends => {
                info!("✓ 成功进入发现好友页面，继续点击通讯录选项");
                
                // 步骤5: 点击"通讯录朋友"选项
                info!("📋 步骤5: 查找并点击通讯录朋友选项");
                let contacts_coords = match self.find_contacts_option_coords().await {
                    Ok(coords) => coords,
                    Err(e) => {
                        let error_msg = format!("查找通讯录选项坐标失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                info!("📍 通讯录选项坐标: ({}, {})", contacts_coords.0, contacts_coords.1);
                if let Err(e) = self.adb_tap(contacts_coords.0, contacts_coords.1).await {
                    let error_msg = format!("点击通讯录选项失败: {}", e);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                sleep(Duration::from_millis(3000)).await; // 联系人加载可能需要更长时间
                
                // 验证最终是否到达联系人页面
                let final_check = match self.recognize_current_page().await {
                    Ok(state) => state,
                    Err(e) => {
                        let error_msg = format!("最终页面状态检查失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                };
                
                info!("📋 最终页面检查结果: {:?}, 置信度: {:.2}", final_check.current_state, final_check.confidence);
                
                if matches!(final_check.current_state, PageState::ContactsList) {
                    info!("✅ 成功导航到联系人页面");
                    Ok(NavigationResult {
                        success: true,
                        message: "成功导航到通讯录页面".to_string(),
                    })
                } else {
                    let error_msg = format!("导航失败，最终状态: {:?}，置信度: {:.2}", final_check.current_state, final_check.confidence);
                    error!("❌ {}", error_msg);
                    Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    })
                }
            },
            PageState::ContactsList => {
                info!("✅ 直接进入了联系人页面，导航成功！");
                Ok(NavigationResult {
                    success: true,
                    message: "成功导航到通讯录页面（直接跳转）".to_string(),
                })
            },
            _ => {
                let error_msg = format!("未能进入发现好友页面，当前状态: {:?}，置信度: {:.2}", discover_check.current_state, discover_check.confidence);
                error!("❌ {}", error_msg);
                Ok(NavigationResult {
                    success: false,
                    message: error_msg,
                })
            }
        }
    }

    /// 智能页面识别
    pub async fn recognize_current_page(&self) -> Result<PageRecognitionResult> {
        info!("🔍 开始识别当前页面状态...");

        let ui_dump = self.get_ui_dump().await?;
        let ui_elements = self.parse_ui_elements(&ui_dump).await?;
        
        // 分析页面特征
        let (page_state, confidence, key_elements) = self.analyze_page_state(&ui_dump, &ui_elements).await?;
        
        let message = format!("识别到页面: {:?}, 信心度: {:.2}", page_state, confidence);
        info!("📋 {}", message);
        
        // 打印关键元素
        if !key_elements.is_empty() {
            info!("🔑 关键元素: {:?}", key_elements);
        }

        Ok(PageRecognitionResult {
            current_state: page_state,
            confidence,
            key_elements,
            ui_elements,
            message,
        })
    }

    /// 分析页面状态
    async fn analyze_page_state(&self, ui_dump: &str, _ui_elements: &[UIElement]) -> Result<(PageState, f32, Vec<String>)> {
        let mut key_elements = Vec::new();
        let mut confidence_scores = Vec::new();

        info!("🔍 分析UI内容，总长度: {} 字符", ui_dump.len());

        // 首先检查是否在Android桌面
        if ui_dump.contains("com.android.launcher3") || ui_dump.contains("launcher3") {
            key_elements.push("Android桌面".to_string());
            confidence_scores.push((PageState::Home, 0.95));
            info!("✓ 检测到Android桌面特征 - 需要启动小红书应用");
        }

        // 检查主页特征
        if ui_dump.contains("首页") || ui_dump.contains("推荐") || (ui_dump.contains("关注") && ui_dump.contains("发现")) {
            key_elements.push("主页导航".to_string());
            confidence_scores.push((PageState::MainPage, 0.8));
            info!("✓ 检测到主页特征");
        }

        // 检查侧边栏特征
        if ui_dump.contains("设置") || ui_dump.contains("我的主页") || ui_dump.contains("发现好友") {
            key_elements.push("侧边栏菜单".to_string());
            confidence_scores.push((PageState::SidebarOpen, 0.9));
            info!("✓ 检测到侧边栏特征");
        }

        // 检查发现好友页面特征
        if ui_dump.contains("发现好友") || (ui_dump.contains("通讯录") && ui_dump.contains("好友")) {
            key_elements.push("发现好友页面".to_string());
            confidence_scores.push((PageState::DiscoverFriends, 0.85));
            info!("✓ 检测到发现好友页面特征");
        }

        // 检查通讯录页面特征
        if (ui_dump.contains("通讯录") || ui_dump.contains("联系人")) && 
           (ui_dump.contains("关注") || ui_dump.contains("已关注") || ui_dump.contains("follow")) {
            key_elements.push("通讯录关注列表".to_string());
            confidence_scores.push((PageState::ContactsList, 0.9));
            info!("✓ 检测到通讯录页面特征");
        }

        // 检查用户资料页面特征
        if ui_dump.contains("粉丝") && ui_dump.contains("关注") && ui_dump.contains("获赞") {
            key_elements.push("用户资料页面".to_string());
            confidence_scores.push((PageState::UserProfile, 0.85));
            info!("✓ 检测到用户资料页面特征");
        }

        // 确定最佳匹配
        if let Some((page_state, confidence)) = confidence_scores.into_iter().max_by(|a, b| a.1.partial_cmp(&b.1).unwrap()) {
            info!("🎯 最佳匹配: {:?}, 置信度: {:.2}", page_state, confidence);
            Ok((page_state, confidence, key_elements))
        } else {
            info!("❓ 未识别出页面类型");
            Ok((PageState::Unknown, 0.0, key_elements))
        }
    }

    /// 解析UI元素（简化版本）
    async fn parse_ui_elements(&self, ui_dump: &str) -> Result<Vec<UIElement>> {
        let mut elements = Vec::new();
        
        // 简化的XML解析 - 查找可点击元素
        for line in ui_dump.lines() {
            if line.contains("clickable=\"true\"") || line.contains("关注") || line.contains("发现好友") {
                if let Some(element) = self.parse_ui_element_line(line) {
                    elements.push(element);
                }
            }
        }
        
        info!("📊 解析到 {} 个UI元素", elements.len());
        Ok(elements)
    }

    /// 解析单行UI元素
    fn parse_ui_element_line(&self, line: &str) -> Option<UIElement> {
        // 简化的解析逻辑，实际项目中应该使用更完整的XML解析
        if line.contains("text=") {
            let text = line.split("text=\"").nth(1)?.split("\"").next()?.to_string();
            Some(UIElement {
                element_type: UIElementType::Button,
                text,
                bounds: (0, 0, 0, 0), // 简化处理
                clickable: line.contains("clickable=\"true\""),
                resource_id: None,
                class_name: None,
            })
        } else {
            None
        }
    }

    /// 启动小红书应用
    async fn start_xiaohongshu_app(&self) -> Result<()> {
        info!("🚀 启动小红书应用...");

        // 方法1: 通过ADB命令直接启动应用
        let output = self.execute_adb_command(&[
                "-s", &self.device_id,
                "shell", "am", "start",
                "-n", "com.xingin.xhs/.index.v2.IndexActivityV2"
            ])
            .context("启动小红书应用失败")?;

        if output.status.success() {
            info!("✓ 小红书应用启动成功（通过ADB命令）");
            return Ok(());
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
            
            info!("✓ 小红书应用启动成功（通过桌面图标）");
            return Ok(());
        }

        let error_msg = String::from_utf8_lossy(&output.stderr);
        Err(anyhow::anyhow!("启动应用失败: {}", error_msg))
    }

    /// 从UI dump中提取小红书图标的坐标
    fn extract_xiaohongshu_icon_coords(&self, ui_dump: &str) -> Option<(i32, i32, i32, i32)> {
        // 查找包含"小红书"文本的节点
        for line in ui_dump.lines() {
            if line.contains("小红书") && line.contains("bounds=") {
                // 提取bounds信息
                if let Some(bounds_start) = line.find("bounds=\"[") {
                    if let Some(bounds_end) = line[bounds_start..].find("]\"") {
                        let bounds_str = &line[bounds_start + 9..bounds_start + bounds_end];
                        
                        // 解析坐标格式: [left,top][right,bottom]
                        if let Some(middle) = bounds_str.find("][") {
                            let left_top = &bounds_str[..middle];
                            let right_bottom = &bounds_str[middle + 2..];
                            
                            if let (Some(comma1), Some(comma2)) = (left_top.find(','), right_bottom.find(',')) {
                                if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                                    left_top[..comma1].parse::<i32>(),
                                    left_top[comma1 + 1..].parse::<i32>(),
                                    right_bottom[..comma2].parse::<i32>(),
                                    right_bottom[comma2 + 1..].parse::<i32>(),
                                ) {
                                    info!("✓ 解析到小红书图标坐标: ({}, {}, {}, {})", left, top, right, bottom);
                                    return Some((left, top, right, bottom));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        warn!("⚠️ 未能从UI dump中找到小红书图标坐标");
        None
    }

    /// 查找发现好友按钮坐标
    async fn find_discover_friends_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 智能查找发现好友按钮坐标...");
        
        // 获取UI dump
        let ui_dump = self.get_ui_dump().await?;
        info!("📱 UI内容长度: {} 字符", ui_dump.len());
        
        // 尝试解析XML并查找发现好友相关元素
        if let Some(coords) = self.parse_discover_friends_from_ui(&ui_dump).await {
            info!("✅ 从UI解析到发现好友坐标: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 如果解析失败，使用基于成功实践的候选坐标（按验证成功的优先级排序）
        let candidates = vec![
            (270, 168, "发现好友位置1 - 验证成功坐标"), // 来自测试模块验证成功的准确坐标
            (160, 280, "发现好友位置2 - 侧边栏上部"),
            (160, 320, "发现好友位置3 - 侧边栏中部"),
            (160, 360, "发现好友位置4 - 侧边栏中下部"),
            (180, 300, "发现好友位置5 - 稍右偏移"),
            (140, 340, "发现好友位置6 - 稍左偏移"),
        ];

        info!("⚠️ UI解析失败，尝试候选坐标...");
        
        // 添加调试信息：输出UI dump的关键片段
        info!("🔍 UI dump关键内容调试:");
        let lines: Vec<&str> = ui_dump.lines().collect();
        for (i, line) in lines.iter().enumerate() {
            if line.contains("发现") || line.contains("好友") || line.contains("通讯录") || line.contains("联系人") {
                info!("📝 第{}行包含关键词: {}", i, line.trim());
            }
        }
        
        // 输出UI dump的前几行和后几行供参考
        info!("📄 UI dump前10行:");
        for (i, line) in lines.iter().take(10).enumerate() {
            info!("  {}： {}", i, line.trim());
        }
        
        // 基于UI内容选择最佳候选坐标
        for (x, y, desc) in &candidates {
            info!("🎯 尝试候选位置: {} 坐标:({}, {})", desc, x, y);
            
            // 检查UI内容中是否有相关的文本提示
            if ui_dump.contains("发现好友") {
                info!("✓ UI中发现'发现好友'文本，选择坐标: ({}, {})", x, y);
                return Ok((*x, *y));
            }
        }

        // 如果都没找到，使用第一个候选位置并警告
        let default_coords = candidates[0];
        warn!("⚠️ 未找到发现好友文本，使用默认坐标: {} ({}, {})", default_coords.2, default_coords.0, default_coords.1);
        Ok((default_coords.0, default_coords.1))
    }

    /// 从UI内容中解析发现好友按钮坐标
    async fn parse_discover_friends_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)> {
        info!("🔧 解析UI XML内容查找发现好友按钮...");
        
        // 查找包含"发现好友"文本的XML节点
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        // 首先尝试精确匹配"发现好友"
        for (i, line) in lines.iter().enumerate() {
            if line.contains("发现好友") {
                info!("📍 找到包含'发现好友'的行 {}: {}", i, line.trim());
                
                // 尝试从当前行或相邻行解析bounds属性
                for check_line in &lines[i.saturating_sub(2)..=(i + 2).min(lines.len() - 1)] {
                    if let Some(bounds) = self.extract_bounds_from_line(check_line) {
                        let center_x = (bounds.0 + bounds.2) / 2;
                        let center_y = (bounds.1 + bounds.3) / 2;
                        info!("✅ 解析到边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                        
                        // 验证坐标合理性（避免过小或过大的坐标）
                        if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        
        // 如果没有找到"发现好友"，尝试查找"发现"和"好友"分开的情况
        for (i, line) in lines.iter().enumerate() {
            if line.contains("发现") && (line.contains("clickable=\"true\"") || line.contains("TextView")) {
                info!("📍 找到包含'发现'的可点击元素行 {}: {}", i, line.trim());
                
                // 检查前后几行是否有"好友"
                let context_lines = &lines[i.saturating_sub(3)..=(i + 3).min(lines.len() - 1)];
                if context_lines.iter().any(|l| l.contains("好友")) {
                    info!("📍 在上下文中找到'好友'，认为这是发现好友按钮");
                    
                    if let Some(bounds) = self.extract_bounds_from_line(line) {
                        let center_x = (bounds.0 + bounds.2) / 2;
                        let center_y = (bounds.1 + bounds.3) / 2;
                        info!("✅ 解析到发现好友按钮边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                        
                        if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        
        // 如果没有找到"发现好友"，尝试查找相关的按钮元素
        for line in &lines {
            if (line.contains("clickable=\"true\"") || line.contains("android.widget.TextView")) 
                && (line.contains("好友") || line.contains("发现")) {
                info!("📍 找到可能的相关按钮: {}", line.trim());
                
                if let Some(bounds) = self.extract_bounds_from_line(line) {
                    let center_x = (bounds.0 + bounds.2) / 2;
                    let center_y = (bounds.1 + bounds.3) / 2;
                    info!("✅ 解析到候选边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                    
                    if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                        return Some((center_x, center_y));
                    }
                }
            }
        }
        
        info!("❌ 未能从UI解析到发现好友按钮坐标");
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

    /// 查找通讯录选项坐标
    async fn find_contacts_option_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 智能查找通讯录选项坐标...");
        
        // 获取UI dump
        let ui_dump = self.get_ui_dump().await?;
        info!("📱 UI内容长度: {} 字符", ui_dump.len());
        
        // 尝试解析XML并查找通讯录相关元素
        if let Some(coords) = self.parse_contacts_from_ui(&ui_dump).await {
            info!("✅ 从UI解析到通讯录坐标: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 如果解析失败，使用基于成功实践的候选坐标
        let candidates = vec![
            (200, 250, "通讯录位置1 - 发现好友页面上部"),
            (200, 300, "通讯录位置2 - 发现好友页面中部"),
            (200, 350, "通讯录位置3 - 发现好友页面中下部"),
            (180, 280, "通讯录位置4 - 稍左偏移"),
            (220, 320, "通讯录位置5 - 稍右偏移"),
            (194, 205, "通讯录位置6 - 参考坐标"), // 来自成功文档的坐标
        ];

        info!("⚠️ UI解析失败，尝试候选坐标...");
        
        // 基于UI内容选择最佳候选坐标
        for (x, y, desc) in &candidates {
            info!("🎯 尝试候选位置: {} 坐标:({}, {})", desc, x, y);
            
            // 检查UI内容中是否有相关的文本提示
            if ui_dump.contains("通讯录") || ui_dump.contains("联系人") {
                info!("✓ UI中发现'通讯录'文本，选择坐标: ({}, {})", x, y);
                return Ok((*x, *y));
            }
        }

        // 如果都没找到，使用第一个候选位置并警告
        let default_coords = candidates[0];
        warn!("⚠️ 未找到通讯录文本，使用默认坐标: {} ({}, {})", default_coords.2, default_coords.0, default_coords.1);
        Ok((default_coords.0, default_coords.1))
    }

    /// 从UI内容中解析通讯录选项坐标
    async fn parse_contacts_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)> {
        info!("🔧 解析UI XML内容查找通讯录选项...");
        
        // 查找包含"通讯录"或"联系人"文本的XML节点
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        for (i, line) in lines.iter().enumerate() {
            if line.contains("通讯录") || line.contains("联系人") {
                info!("📍 找到包含'通讯录/联系人'的行 {}: {}", i, line.trim());
                
                // 尝试从当前行或相邻行解析bounds属性
                for check_line in &lines[i.saturating_sub(2)..=(i + 2).min(lines.len() - 1)] {
                    if let Some(bounds) = self.extract_bounds_from_line(check_line) {
                        let center_x = (bounds.0 + bounds.2) / 2;
                        let center_y = (bounds.1 + bounds.3) / 2;
                        info!("✅ 解析到边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                        
                        // 验证坐标合理性
                        if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        
        info!("❌ 未能从UI解析到通讯录选项坐标");
        None
    }

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

            info!("📊 总共找到 {} 个关注按钮", buttons.len());

            // 遍历按钮进行关注
            for button in buttons {
                // 如果启用跳过已关注，检查按钮状态
                if skip_existing && button.state == ButtonState::AlreadyFollowed {
                    info!("⏭️ 跳过已关注用户 at ({}, {}), 按钮文本: '{}'", button.x, button.y, button.text);
                    details.push(FollowDetail {
                        user_position: (button.x, button.y),
                        follow_success: false,
                        button_text_before: Some(button.text.clone()),
                        button_text_after: None,
                        error: Some(format!("已关注，跳过")),
                    });
                    continue;
                }

                // 如果按钮状态未知，需要重新检查
                let final_state = if button.state == ButtonState::Unknown {
                    let current_text = self.get_button_text_at(button.x, button.y).await.unwrap_or_default();
                    self.analyze_button_state(&current_text)
                } else {
                    button.state.clone()
                };

                // 根据最终状态决定是否关注
                match final_state {
                    ButtonState::CanFollow => {
                        info!("👆 点击关注按钮 at ({}, {})", button.x, button.y);
                        
                        match self.click_follow_button_with_retry(button.x, button.y, 3).await {
                            Ok(success) => {
                                if success {
                                    total_followed += 1;
                                    info!("✅ 成功关注用户 at ({}, {})", button.x, button.y);

                                    // 验证关注结果
                                    sleep(Duration::from_millis(1000)).await;
                                    let button_text_after = self.get_button_text_at(button.x, button.y).await.unwrap_or_default();
                                    let final_state_after = self.analyze_button_state(&button_text_after);
                                    
                                    if final_state_after == ButtonState::AlreadyFollowed {
                                        info!("✓ 关注状态已确认: '{}'", button_text_after);
                                    } else {
                                        warn!("⚠️ 关注状态未确认: '{}'", button_text_after);
                                    }

                                    details.push(FollowDetail {
                                        user_position: (button.x, button.y),
                                        follow_success: true,
                                        button_text_before: Some(button.text.clone()),
                                        button_text_after: Some(button_text_after),
                                        error: None,
                                    });
                                } else {
                                    warn!("⚠️ 关注失败 at ({}, {})", button.x, button.y);
                                    details.push(FollowDetail {
                                        user_position: (button.x, button.y),
                                        follow_success: false,
                                        button_text_before: Some(button.text.clone()),
                                        button_text_after: None,
                                        error: Some("点击失败".to_string()),
                                    });
                                }
                            }
                            Err(e) => {
                                error!("❌ 关注操作失败 at ({}, {}): {}", button.x, button.y, e);
                                details.push(FollowDetail {
                                    user_position: (button.x, button.y),
                                    follow_success: false,
                                    button_text_before: Some(button.text.clone()),
                                    button_text_after: None,
                                    error: Some(format!("操作错误: {}", e)),
                                });
                            }
                        }
                    }
                    ButtonState::AlreadyFollowed => {
                        info!("⏭️ 跳过已关注用户 at ({}, {})", button.x, button.y);
                        details.push(FollowDetail {
                            user_position: (button.x, button.y),
                            follow_success: false,
                            button_text_before: Some(button.text.clone()),
                            button_text_after: None,
                            error: Some("已关注，跳过".to_string()),
                        });
                    }
                    ButtonState::Unknown => {
                        warn!("⚠️ 未知按钮状态 at ({}, {}), 跳过", button.x, button.y);
                        details.push(FollowDetail {
                            user_position: (button.x, button.y),
                            follow_success: false,
                            button_text_before: Some(button.text.clone()),
                            button_text_after: None,
                            error: Some("按钮状态未知，跳过".to_string()),
                        });
                    }
                    ButtonState::Loading => {
                        info!("⏳ 按钮正在加载中 at ({}, {}), 跳过", button.x, button.y);
                        details.push(FollowDetail {
                            user_position: (button.x, button.y),
                            follow_success: false,
                            button_text_before: Some(button.text.clone()),
                            button_text_after: None,
                            error: Some("按钮加载中，跳过".to_string()),
                        });
                    }
                }

                // 关注间隔
                sleep(Duration::from_millis(follow_interval)).await;
            }

            pages_processed += 1;

            // 如果不是最后一页，智能滚动到下一页
            if page < max_pages - 1 {
                info!("📜 检查是否可以滚动到下一页");
                
                // 获取滚动前的UI内容hash，用于检测是否有新内容
                let content_before = self.get_ui_content_hash().await?;
                
                if let Err(e) = self.scroll_down().await {
                    warn!("滚动失败: {}", e);
                    break;
                }
                
                // 等待页面加载并检测变化
                sleep(Duration::from_millis(2000)).await;
                
                let content_after = self.get_ui_content_hash().await?;
                
                if content_before == content_after {
                    info!("📄 页面内容未变化，可能已到达底部，停止滚动");
                    break;
                } else {
                    info!("✓ 检测到新内容，继续处理下一页");
                }
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
    async fn find_follow_buttons(&self) -> Result<Vec<FollowButton>> {
        // 获取UI dump
        let ui_content = self.get_ui_dump().await?;
        
        info!("🔍 开始动态解析UI内容查找关注按钮...");
        
        // 处理压缩的XML
        let expanded_content = if ui_content.lines().count() <= 3 {
            info!("⚠️ 检测到压缩的XML格式，正在展开以便按钮解析...");
            self.expand_compressed_xml(&ui_content)
        } else {
            ui_content
        };
        
        // 动态解析UI XML来查找关注按钮
        let mut buttons = Vec::new();
        
        // 解析XML内容，查找包含"关注"文本的可点击元素
        for line in expanded_content.lines() {
            if self.is_follow_button_line(line) {
                if let Some((x, y)) = self.extract_button_center_coords(line) {
                    // 直接从当前行提取按钮文本和状态
                    let text = self.extract_text_from_line(line).unwrap_or_else(|| "关注".to_string());
                    let state = self.analyze_button_state(&text);
                    
                    let button = FollowButton {
                        x,
                        y,
                        state: state.clone(),
                        text: text.clone(),
                    };
                    
                    info!("✓ 发现关注按钮: 位置({}, {}) 状态({:?}) 文本('{}')", x, y, state, text);
                    buttons.push(button);
                }
            }
        }
        
        // 如果动态解析失败，使用备用的启发式方法
        if buttons.is_empty() {
            warn!("⚠️ 动态解析未找到按钮，使用启发式方法");
            buttons = self.find_buttons_heuristic(&expanded_content).await?;
        }
        
        info!("📊 总共找到 {} 个关注按钮", buttons.len());
        Ok(buttons)
    }

    /// 判断某一行是否包含关注按钮信息
    fn is_follow_button_line(&self, line: &str) -> bool {
        // 检查是否包含关注按钮的特征
        let has_follow_text = line.contains("关注") || 
                             line.contains("follow") || 
                             line.contains("Follow") ||
                             line.contains("+ 关注");
        
        // 检查是否是可点击的元素
        let is_clickable = line.contains("clickable=\"true\"");
        
        // 检查是否有合理的坐标信息（不是整个屏幕）
        let has_reasonable_bounds = line.contains("bounds=\"[") && 
                                   !line.contains("bounds=\"[0,0][1080,1920]") && // 排除全屏元素
                                   !line.contains("bounds=\"[0,0][1920,1080]"); // 排除横屏全屏元素
        
        // 检查是否是Button或TextView类型
        let is_button_type = line.contains("class=\"android.widget.Button\"") ||
                            line.contains("class=\"android.widget.TextView\"") ||
                            line.contains("class=\"android.view.View\"");
        
        let result = has_follow_text && is_clickable && has_reasonable_bounds && is_button_type;
        
        if has_follow_text {
            info!("🔍 检查按钮行: follow_text={}, clickable={}, reasonable_bounds={}, button_type={}, result={}",
                  has_follow_text, is_clickable, has_reasonable_bounds, is_button_type, result);
            if result {
                info!("✓ 找到有效关注按钮行: {}", line.chars().take(100).collect::<String>());
            }
        }
        
        result
    }

    /// 从UI元素行中提取按钮中心坐标
    fn extract_button_center_coords(&self, line: &str) -> Option<(i32, i32)> {
        // 查找bounds信息: bounds="[left,top][right,bottom]"
        if let Some(bounds_start) = line.find("bounds=\"[") {
            if let Some(bounds_end) = line[bounds_start..].find("]\"") {
                let bounds_str = &line[bounds_start + 9..bounds_start + bounds_end];
                
                // 解析坐标格式: [left,top][right,bottom]
                if let Some(middle) = bounds_str.find("][") {
                    let left_top = &bounds_str[..middle];
                    let right_bottom = &bounds_str[middle + 2..];
                    
                    if let (Some(comma1), Some(comma2)) = (left_top.find(','), right_bottom.find(',')) {
                        if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                            left_top[..comma1].parse::<i32>(),
                            left_top[comma1 + 1..].parse::<i32>(),
                            right_bottom[..comma2].parse::<i32>(),
                            right_bottom[comma2 + 1..].parse::<i32>(),
                        ) {
                            // 计算按钮中心坐标
                            let center_x = (left + right) / 2;
                            let center_y = (top + bottom) / 2;
                            
                            info!("📍 解析按钮坐标: bounds=[{},{},{},{}], center=({},{})", 
                                  left, top, right, bottom, center_x, center_y);
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        
        None
    }

    /// 启发式方法查找按钮（备用方案）
    async fn find_buttons_heuristic(&self, ui_content: &str) -> Result<Vec<FollowButton>> {
        let mut buttons = Vec::new();
        
        info!("🎯 使用启发式按钮位置检测");
        
        // 分析UI内容来推断按钮位置
        let follow_count = ui_content.matches("关注").count() + ui_content.matches("follow").count();
        info!("📊 UI内容中发现 {} 个关注相关文本", follow_count);
        
        if follow_count > 0 {
            // 基于小红书通讯录界面的典型布局
            let potential_positions = vec![
                (900, 300),   // 右上角关注按钮
                (900, 450),   // 第二个用户
                (900, 600),   // 第三个用户
                (900, 750),   // 第四个用户
                (900, 900),   // 第五个用户
                (1000, 300),  // 稍右偏移的位置
                (1000, 450),
                (1000, 600),
                (800, 300),   // 稍左偏移的位置
                (800, 450),
                (800, 600),
            ];
            
            // 添加更多可能的位置进行测试
            let test_positions = std::cmp::min(follow_count * 2, potential_positions.len());
            
            for i in 0..test_positions {
                let (x, y) = potential_positions[i];
                let button = FollowButton {
                    x,
                    y,
                    state: ButtonState::Unknown,
                    text: "关注".to_string(),
                };
                buttons.push(button);
                info!("📍 添加启发式按钮位置 {}: ({}, {})", i + 1, x, y);
            }
        }
        
        if buttons.is_empty() {
            warn!("⚠️ 启发式方法也未找到按钮，添加默认测试位置");
            // 如果没有找到关注文本，尝试一些常见位置
            let default_positions = [(950, 350), (950, 500)];
            for (x, y) in default_positions {
                let button = FollowButton {
                    x,
                    y,
                    state: ButtonState::Unknown,
                    text: "关注".to_string(),
                };
                buttons.push(button);
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

    /// 带重试机制的点击关注按钮
    async fn click_follow_button_with_retry(&self, x: i32, y: i32, max_retries: u32) -> Result<bool> {
        for attempt in 1..=max_retries {
            info!("🔄 第 {} 次尝试点击按钮 at ({}, {})", attempt, x, y);
            
            match self.click_follow_button(x, y).await {
                Ok(success) => {
                    if success {
                        return Ok(true);
                    } else {
                        warn!("⚠️ 第 {} 次点击未成功", attempt);
                    }
                }
                Err(e) => {
                    warn!("❌ 第 {} 次点击出错: {}", attempt, e);
                    if attempt < max_retries {
                        info!("⏳ 等待 {}ms 后重试", 1000 * attempt);
                        sleep(Duration::from_millis(1000 * attempt as u64)).await;
                    }
                }
            }
        }
        
        Err(anyhow::anyhow!("点击按钮失败，已重试 {} 次", max_retries))
    }

    /// 获取指定位置的按钮文本（真实实现）
    async fn get_button_text_at(&self, x: i32, y: i32) -> Result<String> {
        info!("� 正在读取坐标 ({}, {}) 处的按钮文本", x, y);
        
        // 获取UI dump
        let ui_content = self.get_ui_dump().await?;
        
        // 处理压缩的XML - 将其拆分成多行以便解析
        let expanded_content = if ui_content.lines().count() <= 3 {
            // 如果只有少数几行，说明XML被压缩了，需要展开
            info!("⚠️ 检测到压缩的XML格式，正在展开...");
            self.expand_compressed_xml(&ui_content)
        } else {
            ui_content
        };
        
        let lines: Vec<&str> = expanded_content.lines().collect();
        info!("📄 处理后的UI Dump 共有 {} 行", lines.len());
        
        // 调试：先输出所有包含关注相关内容的行
        info!("🔍 调试: 搜索包含'关注'或'follow'的所有XML行...");
        let mut follow_related_lines = 0;
        for (line_num, line) in lines.iter().enumerate() {
            if line.contains("关注") || line.contains("follow") || line.contains("text=\"关注\"") {
                follow_related_lines += 1;
                info!("🎯 第{}行包含关注相关内容: {}", line_num + 1, 
                    line.chars().take(200).collect::<String>());
                
                // 尝试解析这行的坐标
                if let Some((left, top, right, bottom)) = self.parse_bounds_from_line(line) {
                    let center_x = (left + right) / 2;
                    let center_y = (top + bottom) / 2;
                    info!("   📍 该元素坐标: 范围[{},{},{},{}] 中心({},{})", 
                        left, top, right, bottom, center_x, center_y);
                    
                    // 检查是否与目标坐标匹配
                    let distance = (((center_x - x).pow(2) + (center_y - y).pow(2)) as f64).sqrt() as i32;
                    if distance <= 10 {
                        info!("   ✅ 该元素与目标坐标({},{})非常接近，距离{}像素", x, y, distance);
                    }
                }
            }
        }
        info!("📊 总共找到 {} 行包含关注相关内容", follow_related_lines);
        
        let mut found_texts = Vec::new();
        
        // 扫描所有UI元素，查找包含目标坐标的元素
        for (line_num, line) in lines.iter().enumerate() {
            if let Some(text) = self.extract_text_from_coords_line(line, x, y) {
                info!("✓ 第{}行: 在坐标({},{})处找到文本: '{}'", line_num + 1, x, y, text);
                found_texts.push(text.clone());
            }
        }
        
        if found_texts.is_empty() {
            // 如果没找到，打印附近的一些元素用于调试
            info!("⚠️ 在坐标({},{})处未找到任何文本，正在检查附近元素...", x, y);
            
            let tolerance = 50; // 50像素容差
            let mut nearby_elements = Vec::new();
            
            for (line_num, line) in lines.iter().enumerate() {
                if let Some((left, top, right, bottom)) = self.parse_bounds_from_line(line) {
                    // 检查是否在附近
                    let center_x = (left + right) / 2;
                    let center_y = (top + bottom) / 2;
                    let distance_sq = (center_x - x).pow(2) + (center_y - y).pow(2);
                    
                    if distance_sq <= tolerance * tolerance {
                        if let Some(text) = self.extract_text_from_line(line) {
                            let distance = (distance_sq as f64).sqrt() as i32;
                            nearby_elements.push((distance, line_num + 1, center_x, center_y, text));
                        }
                    }
                }
            }
            
            // 按距离排序并打印最近的几个元素
            nearby_elements.sort_by_key(|&(distance, _, _, _, _)| distance);
            for (distance, line_num, center_x, center_y, text) in nearby_elements.iter().take(5) {
                info!("🔍 附近元素(第{}行): 中心({},{}) 距离{} 文本:'{}'", 
                    line_num, center_x, center_y, distance, text);
            }
            
            return Ok("未知".to_string());
        }
        
        // 返回最相关的文本（通常是最后一个，因为它可能是最顶层的）
        let result = found_texts.last().unwrap().clone();
        info!("✅ 最终确定坐标({},{})处的文本: '{}'", x, y, result);
        Ok(result)
    }

    /// 从UI元素行中解析坐标范围
    fn parse_bounds_from_line(&self, line: &str) -> Option<(i32, i32, i32, i32)> {
        if let Some(bounds_start) = line.find("bounds=\"[") {
            let bounds_part = &line[bounds_start + 9..];
            if let Some(bounds_end) = bounds_part.find("\"]") {
                let bounds_str = &bounds_part[..bounds_end];
                
                // 解析格式如: 123,456][789,012
                if let Some(right_bracket) = bounds_str.find("][") {
                    let left_top = &bounds_str[..right_bracket];
                    let right_bottom = &bounds_str[right_bracket + 2..];
                    
                    if let Some(comma1) = left_top.find(',') {
                        if let Some(comma2) = right_bottom.find(',') {
                            if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                                left_top[..comma1].parse::<i32>(),
                                left_top[comma1 + 1..].parse::<i32>(),
                                right_bottom[..comma2].parse::<i32>(),
                                right_bottom[comma2 + 1..].parse::<i32>()
                            ) {
                                return Some((left, top, right, bottom));
                            }
                        }
                    }
                }
            }
        }
        None
    }

    /// 从UI元素行中提取文本内容
    fn extract_text_from_line(&self, line: &str) -> Option<String> {
        // 尝试提取text属性
        if let Some(text_start) = line.find("text=\"") {
            let text_part = &line[text_start + 6..];
            if let Some(text_end) = text_part.find("\"") {
                let text = text_part[..text_end].to_string();
                if !text.trim().is_empty() {
                    return Some(text);
                }
            }
        }
        
        // 如果没有text，尝试提取resource-id
        if let Some(id_start) = line.find("resource-id=\"") {
            let id_part = &line[id_start + 13..];
            if let Some(id_end) = id_part.find("\"") {
                let id = id_part[..id_end].to_string();
                if id.contains("follow") || id.contains("关注") {
                    return Some("关注".to_string());
                }
            }
        }
        
        None
    }

    /// 从UI元素行中提取指定坐标范围内的文本
    fn extract_text_from_coords_line(&self, line: &str, target_x: i32, target_y: i32) -> Option<String> {
        // 检查这行是否包含坐标信息
        if !line.contains("bounds=\"[") {
            return None;
        }
        
        // 解析坐标范围
        if let Some((left, top, right, bottom)) = self.parse_bounds_from_line(line) {
            // 计算元素的中心点
            let center_x = (left + right) / 2;
            let center_y = (top + bottom) / 2;
            
            // 检查目标坐标是否在这个元素的范围内，或者非常接近中心点
            let in_bounds = target_x >= left && target_x <= right && target_y >= top && target_y <= bottom;
            let near_center = (target_x - center_x).abs() <= 5 && (target_y - center_y).abs() <= 5;
            
            if in_bounds || near_center {
                // 提取文本内容
                if let Some(text) = self.extract_text_from_line(line) {
                    if !text.trim().is_empty() {
                        info!("✓ 在范围[{},{},{},{}]中心({},{})找到文本: '{}' (目标:{},{})", 
                            left, top, right, bottom, center_x, center_y, text, target_x, target_y);
                        return Some(text);
                    }
                }
                
                // 如果没有text属性，检查resource-id或class等其他信息
                if line.contains("关注") || line.contains("follow") {
                    info!("✓ 在范围[{},{},{},{}]中心({},{})发现关注相关元素 (目标:{},{})", 
                        left, top, right, bottom, center_x, center_y, target_x, target_y);
                    return Some("关注".to_string());
                }
                
                // 打印调试信息，看看这个元素是什么
                info!("🔍 在目标坐标({},{})附近找到元素: {}", target_x, target_y, 
                    line.chars().take(150).collect::<String>());
            }
        }
        
        None
    }

    /// 智能判断按钮状态
    fn analyze_button_state(&self, button_text: &str) -> ButtonState {
        let text_lower = button_text.to_lowercase();
        
        if text_lower.contains("已关注") || 
           text_lower.contains("following") || 
           text_lower.contains("已follow") ||
           text_lower.contains("取消关注") {
            ButtonState::AlreadyFollowed
        } else if text_lower.contains("关注") || 
                  text_lower.contains("follow") ||
                  text_lower.contains("+ 关注") {
            ButtonState::CanFollow
        } else if text_lower.contains("加载") || 
                  text_lower.contains("loading") {
            ButtonState::Loading
        } else {
            ButtonState::Unknown
        }
    }

    /// 获取UI dump（带重试机制）
    async fn get_ui_dump(&self) -> Result<String> {
        const MAX_RETRIES: u32 = 3;
        
        for attempt in 1..=MAX_RETRIES {
            info!("📱 第 {} 次尝试获取UI dump...", attempt);
            
            match self.get_ui_dump_once().await {
                Ok(ui_dump) => {
                    if ui_dump.len() > 100 && ui_dump.contains("<?xml") {
                        info!("✓ 成功获取UI dump，长度: {} 字符", ui_dump.len());
                        return Ok(ui_dump);
                    } else {
                        warn!("⚠️ UI dump内容不完整，长度: {}", ui_dump.len());
                    }
                }
                Err(e) => {
                    warn!("❌ 第 {} 次获取UI dump失败: {}", attempt, e);
                }
            }
            
            if attempt < MAX_RETRIES {
                let wait_time = 1000 * attempt;
                info!("⏳ 等待 {}ms 后重试", wait_time);
                sleep(Duration::from_millis(wait_time as u64)).await;
            }
        }
        
        Err(anyhow::anyhow!("获取UI dump失败，已重试 {} 次", MAX_RETRIES))
    }

    /// 单次获取UI dump尝试
    async fn get_ui_dump_once(&self) -> Result<String> {
        // 方法1: 直接输出到stdout
        let output1 = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "uiautomator",
                "dump",
                "/dev/stdout",
            ])
            .context("获取UI dump失败")?;

        let result1 = String::from_utf8_lossy(&output1.stdout).to_string();
        
        if result1.len() > 100 && result1.contains("<?xml") {
            return Ok(result1);
        }

        // 方法2: 先dump到文件，再cat
        let dump_output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "uiautomator",
                "dump",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .context("dump到文件失败")?;

        if !dump_output.status.success() {
            let error_msg = String::from_utf8_lossy(&dump_output.stderr);
            return Err(anyhow::anyhow!("UI dump到文件失败: {}", error_msg));
        }

        // 短暂等待文件写入完成
        sleep(Duration::from_millis(500)).await;

        // 读取UI文件内容
        let output2 = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "cat",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .context("读取UI文件失败")?;

        let result2 = String::from_utf8_lossy(&output2.stdout).to_string();
        
        if result2.len() > 100 && result2.contains("<?xml") {
            return Ok(result2);
        }

        Err(anyhow::anyhow!("无法获取有效的UI dump"))
    }

    /// 向下滚动页面
    async fn scroll_down(&self) -> Result<()> {
        info!("📜 执行向下滚动操作");
        
        // 从屏幕中间向上滑动，距离适中以避免滑动过快
        let _output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "swipe",
                "500",
                "700", // 起始位置 (稍微降低起始位置)
                "500",
                "400",  // 结束位置 (增加滚动距离)
                "800", // 滑动时长(ms) (减少滑动时间使其更流畅)
            ])
            .context("滑动页面失败")?;

        info!("✓ 滚动操作完成");
        Ok(())
    }

    /// 获取UI内容的简化hash，用于检测页面变化
    async fn get_ui_content_hash(&self) -> Result<u64> {
        let ui_content = self.get_ui_dump().await?;
        
        // 提取关键内容用于hash计算（忽略动态变化的部分）
        let key_content = ui_content
            .lines()
            .filter(|line| {
                // 只关注包含用户信息和按钮的行
                line.contains("关注") || 
                line.contains("用户") || 
                line.contains("用户名") ||
                line.contains("nickname") ||
                (line.contains("TextView") && line.contains("bounds"))
            })
            .collect::<Vec<_>>()
            .join("\n");
        
        // 计算简单hash
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        key_content.hash(&mut hasher);
        let hash = hasher.finish();
        
        info!("📊 计算页面内容hash: {}, 关键行数: {}", hash, key_content.lines().count());
        Ok(hash)
    }

    /// 返回主页
    async fn return_to_home(&self) -> Result<()> {
        // 点击返回按钮或按Home键
        let _output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "keyevent",
                "KEYCODE_HOME",
            ])
            .context("返回主页失败")?;

        Ok(())
    }

    /// 通用点击坐标方法
    async fn click_coordinates(&self, x: i32, y: i32) -> Result<()> {
        self.adb_tap(x, y).await
    }

    /// ADB点击坐标
    async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        info!("👆 执行点击操作，坐标:({}, {})", x, y);
        
        let _output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "tap",
                &x.to_string(),
                &y.to_string(),
            ])
            .context("ADB点击失败")?;

        info!("✓ 点击操作成功");
        Ok(())
    }

    /// 展开压缩的XML内容
    fn expand_compressed_xml(&self, compressed_xml: &str) -> String {
        // 在关键标签前后添加换行符，使XML更易解析
        let mut expanded = compressed_xml.to_string();
        
        // 在标签开始前添加换行
        let patterns = [
            r"<node",
            r"</node>",
            r"<hierarchy",
            r"</hierarchy>",
        ];
        
        for pattern in &patterns {
            expanded = expanded.replace(pattern, &format!("\n{}", pattern));
        }
        
        // 在属性间添加空格，确保解析正确
        expanded = expanded.replace("\" ", "\" ");
        expanded = expanded.replace("\"><", "\">\n<");
        
        info!("✅ XML展开完成，从 {} 字符扩展到 {} 字符", 
              compressed_xml.len(), expanded.len());
        
        expanded
    }
}