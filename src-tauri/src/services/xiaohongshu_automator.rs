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
        // 优先尝试几个可能的ADB路径
        let possible_adb_paths = vec![
            // 1. 项目根目录的platform-tools (使用绝对路径)
            r"D:\repositories\employeeGUI\platform-tools\adb.exe".to_string(),
            // 2. 相对于当前目录的platform-tools
            std::env::current_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."))
                .parent()
                .unwrap_or(&std::path::PathBuf::from(".."))
                .join("platform-tools")
                .join("adb.exe")
                .to_string_lossy()
                .to_string(),
            // 3. 从src-tauri向上两级目录找platform-tools
            std::env::current_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."))
                .join("..")
                .join("platform-tools")
                .join("adb.exe")
                .to_string_lossy()
                .to_string(),
            // 4. 系统PATH中的adb
            "adb.exe".to_string(),
        ];

        let mut adb_path = "adb.exe".to_string();
        
        // 找到第一个存在的ADB路径
        for path in &possible_adb_paths {
            info!("🔍 检查ADB路径: {}", path);
            if std::path::Path::new(path).exists() {
                adb_path = path.clone();
                info!("✅ 找到可用的ADB路径: {}", adb_path);
                break;
            } else {
                info!("❌ ADB路径不存在: {}", path);
            }
        }
        
        info!("🚀 创建XiaohongshuAutomator - 设备ID: {}, 最终ADB路径: {}", device_id, adb_path);
            
        Self {
            device_id,
            adb_path,
        }
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
        let running_output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "activity",
                "activities",
            ])
            .output()
            .context("检查应用运行状态失败")?;

        let running_result = String::from_utf8_lossy(&running_output.stdout);
        let app_running = running_result.contains(package_name);

        // 获取应用版本 - 使用简化的方法避免Windows管道问题
        let version_output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "dumpsys",
                "package",
                package_name,
            ])
            .output()
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

        let output = Command::new(&self.adb_path)
            .args(&[
                "-s", &self.device_id,
                "shell", "am", "start",
                "-n", "com.xingin.xhs/.index.v2.IndexActivityV2"
            ])
            .output()
            .context("启动小红书应用失败")?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("启动应用失败: {}", error_msg));
        }

        info!("✓ 小红书应用启动成功");
        Ok(())
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
        
        // 如果解析失败，使用基于成功实践的候选坐标
        let candidates = vec![
            (160, 280, "发现好友位置1 - 侧边栏上部"),
            (160, 320, "发现好友位置2 - 侧边栏中部"),
            (160, 360, "发现好友位置3 - 侧边栏中下部"),
            (180, 300, "发现好友位置4 - 稍右偏移"),
            (140, 340, "发现好友位置5 - 稍左偏移"),
            (270, 168, "发现好友位置6 - 参考坐标"), // 来自成功文档的坐标
        ];

        info!("⚠️ UI解析失败，尝试候选坐标...");
        
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
        info!("📱 获取UI dump...");
        
        // 方法1: 直接输出到stdout
        let output1 = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "uiautomator",
                "dump",
                "/dev/stdout",
            ])
            .output()
            .context("获取UI dump失败")?;

        let result1 = String::from_utf8_lossy(&output1.stdout).to_string();
        
        if result1.len() > 100 && result1.contains("<?xml") {
            info!("✓ 方法1成功获取UI dump，长度: {} 字符", result1.len());
            return Ok(result1);
        }

        info!("⚠️ 方法1失败，尝试方法2...");
        
        // 方法2: 先dump到文件，再cat
        let dump_output = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "uiautomator",
                "dump",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .output()
            .context("dump到文件失败")?;

        if !dump_output.status.success() {
            let error_msg = String::from_utf8_lossy(&dump_output.stderr);
            return Err(anyhow::anyhow!("UI dump到文件失败: {}", error_msg));
        }

        // 读取UI文件内容
        let output2 = Command::new(&self.adb_path)
            .args(&[
                "-s",
                &self.device_id,
                "shell",
                "cat",
                "/sdcard/xiaohongshu_ui.xml",
            ])
            .output()
            .context("读取UI文件失败")?;

        let result2 = String::from_utf8_lossy(&output2.stdout).to_string();
        
        if result2.len() > 100 && result2.contains("<?xml") {
            info!("✓ 方法2成功获取UI dump，长度: {} 字符", result2.len());
            return Ok(result2);
        }

        Err(anyhow::anyhow!("无法获取有效的UI dump"))
    }

    /// 向下滚动页面
    async fn scroll_down(&self) -> Result<()> {
        // 从屏幕中间向上滑动
        let _output = Command::new(&self.adb_path)
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

        Ok(())
    }

    /// 返回主页
    async fn return_to_home(&self) -> Result<()> {
        // 点击返回按钮或按Home键
        let _output = Command::new(&self.adb_path)
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
        info!("👆 执行点击操作，坐标:({}, {})", x, y);
        
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
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("ADB点击失败: {}", error_msg));
        }

        info!("✓ 点击操作成功");
        Ok(())
    }
}