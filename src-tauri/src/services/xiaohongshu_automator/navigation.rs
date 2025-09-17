use anyhow::Result;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};
use super::{
    core::XiaohongshuAutomator, 
    types::{NavigationResult, PageState},
    page_recognition::PageRecognitionExt,
    app_status::AppStatusExt,
};

/// 导航相关功能扩展 trait
pub trait NavigationExt {
    async fn navigate_to_discover_friends(&self) -> Result<NavigationResult>;
    async fn navigate_to_contacts_option(&self) -> Result<NavigationResult>;
    async fn navigate_to_contacts(&self) -> Result<NavigationResult>;
    async fn navigate_from_discover_friends(&self) -> Result<NavigationResult>;
    async fn open_xiaohongshu_app(&self) -> Result<NavigationResult>;
}

impl NavigationExt for XiaohongshuAutomator {
    /// 导航到发现好友页面
    async fn navigate_to_discover_friends(&self) -> Result<NavigationResult> {
        self.navigate_to_contacts().await
    }

    /// 导航到通讯录选项
    async fn navigate_to_contacts_option(&self) -> Result<NavigationResult> {
        self.navigate_to_contacts().await
    }

    /// 导航到通讯录
    async fn navigate_to_contacts(&self) -> Result<NavigationResult> {
        self.navigate_to_contacts_impl().await
    }

    /// 从发现好友页面导航回去  
    async fn navigate_from_discover_friends(&self) -> Result<NavigationResult> {
        Ok(NavigationResult {
            success: true,
            message: "从发现好友页面返回".to_string(),
        })
    }

    /// 打开小红书应用
    async fn open_xiaohongshu_app(&self) -> Result<NavigationResult> {
        Ok(NavigationResult {
            success: true,
            message: "打开小红书应用".to_string(),
        })
    }
}

impl XiaohongshuAutomator {
    /// 强制启动小红书应用
    pub async fn force_start_xiaohongshu(&self) -> Result<()> {
        info!("🚀 强制启动小红书应用");
        
        // 先回到桌面
        self.return_to_home().await?;
        sleep(Duration::from_millis(1000)).await;
        
        // 启动小红书
        self.start_xiaohongshu_app().await?;
        sleep(Duration::from_millis(5000)).await;
        
        info!("✅ 小红书应用强制启动完成");
        Ok(())
    }

    /// 从未知状态恢复
    async fn recover_from_unknown_state(&self) -> Result<()> {
        info!("🔄 尝试从未知状态恢复");
        
        // 方法1: 返回桌面重新开始
        info!("📱 方法1: 返回桌面");
        self.return_to_home().await?;
        sleep(Duration::from_millis(2000)).await;
        
        // 检查是否回到桌面
        if let Ok(page_result) = self.recognize_current_page().await {
            if page_result.current_state == PageState::Home {
                info!("✅ 成功返回桌面");
                return Ok(());
            }
        }
        
        // 方法2: 连续按返回键
        info!("📱 方法2: 连续按返回键");
        for i in 0..3 {
            info!("🔙 按返回键 {}/3", i + 1);
            let _ = self.execute_adb_command(&["-s", &self.device_id, "shell", "input", "keyevent", "KEYCODE_BACK"]);
            sleep(Duration::from_millis(1000)).await;
        }
        
        // 方法3: 强制启动小红书
        info!("📱 方法3: 强制重新启动小红书");
        self.force_start_xiaohongshu().await?;
        
        Ok(())
    }

    /// 智能导航到通讯录页面（实现）
    pub async fn navigate_to_contacts_impl(&self) -> Result<NavigationResult> {
        info!("🧭 开始导航到小红书通讯录页面（基于成功实践的流程）");

        // 🚨 强制启动步骤: 无条件启动小红书应用（防止桌面操作）
        info!("� 强制启动步骤: 确保小红书应用运行并在前台");
        if let Err(e) = self.force_start_xiaohongshu().await {
            error!("❌ 强制启动小红书失败: {}", e);
            // 如果强制启动失败，尝试标准启动方法
            warn!("⚠️ 尝试标准启动方法");
            if let Err(e2) = self.start_xiaohongshu_app().await {
                return Ok(NavigationResult {
                    success: false,
                    message: format!("启动小红书应用失败 - 强制启动: {}, 标准启动: {}", e, e2),
                });
            }
        }
        sleep(Duration::from_millis(4000)).await; // 给应用充足启动时间

        // 步骤1: 验证应用已启动
        info!("📱 步骤1: 验证小红书应用状态");
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
            error!("❌ 多次尝试后小红书应用仍未启动");
            return Ok(NavigationResult {
                success: false,
                message: "多次尝试后小红书应用仍未启动".to_string(),
            });
        } else {
            info!("✅ 小红书应用已确认运行");
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

        // 步骤3: 智能点击菜单按钮打开侧边栏（设备适配）
        info!("� 步骤3: 智能点击菜单按钮打开侧边栏");
        let menu_coords = self.get_adaptive_menu_coords().await?;
        info!("📍 适配后的菜单按钮坐标: ({}, {})", menu_coords.0, menu_coords.1);
        
        if let Err(e) = self.adb_tap(menu_coords.0, menu_coords.1).await {
            let error_msg = format!("点击菜单按钮失败: {}", e);
            error!("❌ {}", error_msg);
            return Ok(NavigationResult {
                success: false,
                message: error_msg,
            });
        }
        sleep(Duration::from_millis(2000)).await;
        
        // 🔍 严格验证：确认点击后页面状态
        let post_click_state = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                error!("❌ 点击菜单后页面识别失败: {}", e);
                return Ok(NavigationResult {
                    success: false,
                    message: format!("点击菜单后页面识别失败: {}", e),
                });
            }
        };

        // 验证是否成功打开侧边栏
        if !matches!(post_click_state.current_state, PageState::SidebarOpen) {
            warn!("⚠️ 菜单点击后未能打开侧边栏，当前状态: {:?}", post_click_state.current_state);
            // 尝试恢复策略
            return self.handle_menu_click_failure(post_click_state.current_state).await;
        }
        
        info!("✅ 成功打开侧边栏，继续导航");
        // 验证侧边栏是否打开并继续导航
        self.navigate_from_sidebar().await
    }

    /// 从侧边栏继续导航流程
    pub async fn navigate_from_sidebar(&self) -> Result<NavigationResult> {
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
        let discover_coords = self.get_adaptive_discover_friends_coords().await?;
        
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
        
        // 🔍 严格验证：确认点击发现好友后的页面状态
        let post_discover_state = match self.recognize_current_page().await {
            Ok(state) => state,
            Err(e) => {
                error!("❌ 点击发现好友后页面识别失败: {}", e);
                return Ok(NavigationResult {
                    success: false,
                    message: format!("点击发现好友后页面识别失败: {}", e),
                });
            }
        };

        info!("📋 点击发现好友后页面状态: {:?}", post_discover_state.current_state);

        // 验证是否成功进入发现好友相关页面
        match post_discover_state.current_state {
            PageState::DiscoverFriends | PageState::WebViewFriends | PageState::ContactsList => {
                info!("✅ 成功进入发现好友页面或联系人页面");
            },
            PageState::SidebarOpen => {
                warn!("⚠️ 仍在侧边栏状态，发现好友按钮可能未被正确点击");
                return self.handle_discover_friends_click_failure().await;
            },
            _ => {
                warn!("⚠️ 意外的页面状态: {:?}", post_discover_state.current_state);
                return self.handle_discover_friends_click_failure().await;
            }
        }
        
        // 检查结果并继续导航
        self.navigate_from_discover_friends().await
    }

    /// 从发现好友页面继续导航流程（增强WebView处理）
    pub async fn navigate_from_discover_friends(&self) -> Result<NavigationResult> {
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
            PageState::DiscoverFriends | PageState::WebViewFriends => {
                info!("✓ 成功进入发现好友页面");
                
                // 如果是WebView页面，需要特殊处理
                if matches!(discover_check.current_state, PageState::DiscoverFriends) && 
                   discover_check.key_elements.iter().any(|e| e.contains("WebView")) {
                    info!("🌐 检测到WebView页面，使用WebView导航策略");
                    return self.handle_webview_discover_friends().await;
                }
                
                // 步骤5: 查找并点击通讯录选项（带验证）
                info!("📋 步骤5: 查找并点击通讯录选项");
                let contacts_coords = self.get_adaptive_contacts_coords().await?;
                
                info!("📍 通讯录选项坐标: ({}, {})", contacts_coords.0, contacts_coords.1);
                if let Err(e) = self.adb_tap(contacts_coords.0, contacts_coords.1).await {
                    let error_msg = format!("点击通讯录选项失败: {}", e);
                    error!("❌ {}", error_msg);
                    return Ok(NavigationResult {
                        success: false,
                        message: error_msg,
                    });
                }
                
                info!("⏳ 等待通讯录页面加载...");
                sleep(Duration::from_millis(3000)).await; // 联系人加载可能需要更长时间
                
                // 🔍 验证是否成功进入通讯录页面
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
                
                info!("📋 点击通讯录后页面检查结果: {:?}, 置信度: {:.2}", final_check.current_state, final_check.confidence);
                
                // 🛡️ 页面验证保险机制
                if !matches!(final_check.current_state, PageState::ContactsList) {
                    warn!("⚠️ 点击通讯录后未能正确进入通讯录页面，当前状态: {:?}", final_check.current_state);
                    
                    // 尝试重新点击通讯录
                    warn!("🔄 尝试重新点击通讯录选项...");
                    if let Err(e) = self.adb_tap(contacts_coords.0, contacts_coords.1).await {
                        let error_msg = format!("重新点击通讯录选项失败: {}", e);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                    
                    sleep(Duration::from_millis(4000)).await; // 多等一秒
                    
                    // 再次验证
                    let retry_check = match self.recognize_current_page().await {
                        Ok(state) => state,
                        Err(e) => {
                            let error_msg = format!("重试后页面状态检查失败: {}", e);
                            error!("❌ {}", error_msg);
                            return Ok(NavigationResult {
                                success: false,
                                message: error_msg,
                            });
                        }
                    };
                    
                    info!("📋 重试后页面检查结果: {:?}, 置信度: {:.2}", retry_check.current_state, retry_check.confidence);
                    
                    if !matches!(retry_check.current_state, PageState::ContactsList) {
                        let error_msg = format!("重试后仍未能进入通讯录页面，当前状态: {:?}，程序将停止避免乱点", retry_check.current_state);
                        error!("❌ {}", error_msg);
                        return Ok(NavigationResult {
                            success: false,
                            message: error_msg,
                        });
                    }
                    
                    info!("✅ 重试成功，已进入通讯录页面");
                }
                
                // 最终确认成功导航到通讯录页面
                info!("✅ 成功导航到通讯录页面");
                Ok(NavigationResult {
                    success: true,
                    message: "成功导航到通讯录页面".to_string(),
                })
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

    /// 处理WebView发现好友页面的特殊导航逻辑
    async fn handle_webview_discover_friends(&self) -> Result<NavigationResult> {
        info!("🌐 处理WebView发现好友页面");
        
        // WebView页面的处理策略：
        // 1. 尝试通用坐标点击
        // 2. 等待页面加载
        // 3. 尝试返回键导航
        
        // 策略1: 尝试在WebView中点击通讯录相关区域
        info!("📱 策略1: 在WebView中查找通讯录选项");
        let webview_coords = [(540, 800), (540, 1000), (540, 1200)]; // 尝试多个可能的位置
        
        for (x, y) in webview_coords.iter() {
            info!("🎯 尝试点击WebView坐标: ({}, {})", x, y);
            if let Ok(_) = self.adb_tap(*x, *y).await {
                sleep(Duration::from_millis(2000)).await;
                
                // 检查是否成功导航
                if let Ok(state) = self.recognize_current_page().await {
                    if matches!(state.current_state, PageState::ContactsList) {
                        info!("✅ WebView策略成功，到达联系人页面");
                        return Ok(NavigationResult {
                            success: true,
                            message: "通过WebView策略成功导航到通讯录页面".to_string(),
                        });
                    }
                }
            }
        }
        
        // 策略2: 使用返回键退出WebView，重新导航
        info!("📱 策略2: 退出WebView重新导航");
        let _ = self.execute_adb_command(&["-s", &self.device_id, "shell", "input", "keyevent", "KEYCODE_BACK"]);
        sleep(Duration::from_millis(2000)).await;
        
        // 重新检查页面状态
        if let Ok(state) = self.recognize_current_page().await {
            if matches!(state.current_state, PageState::SidebarOpen) {
                info!("✅ 成功退回到侧边栏，建议重新尝试导航");
                return Ok(NavigationResult {
                    success: false,
                    message: "已退回到侧边栏，请重新尝试导航".to_string(),
                });
            }
        }
        
        // 策略3: 完全重新开始导航流程
        info!("📱 策略3: 完全重新开始导航流程");
        return Ok(NavigationResult {
            success: false,
            message: "WebView页面导航失败，建议重新开始导航流程".to_string(),
        });
    }

    /// 获取适配的菜单按钮坐标（通配符模式 + 硬编码备选 + 坐标差异保险）
    async fn get_adaptive_menu_coords(&self) -> Result<(i32, i32)> {
        let (screen_width, screen_height) = self.get_screen_size().await?;
        
        // 硬编码基准坐标（基于成功ADB测试结果）
        let baseline_coords = if screen_width == 1080 && screen_height == 2316 {
            (81, 150)  // bounds="[27,96][135,204]" 的中心点
        } else if screen_width == 1080 && screen_height == 2400 {
            (81, 150)  // 2400高度也使用相同坐标
        } else {
            // 其他分辨率适配计算
            let x_ratio = 81.0 / 1080.0;   // 0.075
            let y_ratio = 150.0 / 2316.0;  // 0.065
            let adapted_x = (screen_width as f32 * x_ratio) as i32;
            let adapted_y = (screen_height as f32 * y_ratio) as i32;
            (adapted_x, adapted_y)
        };
        
        // 优先级1: 尝试从UI dump中动态获取菜单按钮坐标（通配符模式）
        if let Ok(ui_dump) = self.get_ui_dump().await {
            if let Some(coord) = self.find_specific_element(&ui_dump, "menu_button").await {
                let (dynamic_x, dynamic_y) = coord.center();
                info!("🎯 通配符动态获取菜单坐标: ({}, {})", dynamic_x, dynamic_y);
                
                // 🛡️ 坐标差异保险机制：检查动态坐标与基准坐标的差异
                let diff_x = (dynamic_x - baseline_coords.0).abs();
                let diff_y = (dynamic_y - baseline_coords.1).abs();
                let max_diff_threshold = 200; // 最大允许差异像素
                
                if diff_x > max_diff_threshold || diff_y > max_diff_threshold {
                    warn!("⚠️ 动态坐标({}, {})与基准坐标({}, {})差异过大(x差异:{}, y差异:{})", 
                          dynamic_x, dynamic_y, baseline_coords.0, baseline_coords.1, diff_x, diff_y);
                    warn!("🛡️ 启用坐标保险机制，使用基准坐标: ({}, {})", baseline_coords.0, baseline_coords.1);
                    return Ok(baseline_coords);
                } else {
                    info!("✅ 动态坐标通过差异检验，差异范围合理(x差异:{}, y差异:{})", diff_x, diff_y);
                    return Ok((dynamic_x, dynamic_y));
                }
            } else {
                info!("⚠️ 通配符模式未找到菜单按钮，使用基准坐标");
            }
        }
        
        // 优先级2: 使用基准坐标（基于成功ADB测试结果）
        info!("🔧 使用基准菜单坐标: ({}, {})", baseline_coords.0, baseline_coords.1);
        info!("📱 适配分辨率{}x{} - 菜单坐标: ({}, {})", 
              screen_width, screen_height, baseline_coords.0, baseline_coords.1);
        
        Ok(baseline_coords)
    }

    /// 获取适配的发现好友按钮坐标（基于成功ADB测试的精确坐标 + 坐标差异保险）
    async fn get_adaptive_discover_friends_coords(&self) -> Result<(i32, i32)> {
        let (screen_width, screen_height) = self.get_screen_size().await?;
        
        // 基准坐标（基于成功ADB测试结果）
        let baseline_coords = if screen_width == 1080 && screen_height == 2316 {
            (405, 288)  // bounds="[36,204][774,372]" 的中心点
        } else if screen_width == 1080 && screen_height == 2400 {
            (405, 288)  // 2400高度也使用相同坐标
        } else {
            // 其他分辨率适配计算
            let x_ratio = 405.0 / 1080.0;  // 0.375
            let y_ratio = 288.0 / 2316.0;  // 0.124
            let adapted_x = (screen_width as f32 * x_ratio) as i32;
            let adapted_y = (screen_height as f32 * y_ratio) as i32;
            (adapted_x, adapted_y)
        };
        
        // 优先级1: 尝试从UI dump中动态获取发现好友按钮坐标（通配符模式）
        if let Ok(ui_dump) = self.get_ui_dump().await {
            if let Some(coord) = self.find_specific_element(&ui_dump, "discover_friends").await {
                let (dynamic_x, dynamic_y) = coord.center();
                info!("🎯 通配符动态获取发现好友坐标: ({}, {})", dynamic_x, dynamic_y);
                
                // 🛡️ 坐标差异保险机制：检查动态坐标与基准坐标的差异
                let diff_x = (dynamic_x - baseline_coords.0).abs();
                let diff_y = (dynamic_y - baseline_coords.1).abs();
                let max_diff_threshold = 200; // 最大允许差异像素
                
                if diff_x > max_diff_threshold || diff_y > max_diff_threshold {
                    warn!("⚠️ 发现好友动态坐标({}, {})与基准坐标({}, {})差异过大(x差异:{}, y差异:{})", 
                          dynamic_x, dynamic_y, baseline_coords.0, baseline_coords.1, diff_x, diff_y);
                    warn!("🛡️ 启用坐标保险机制，使用基准坐标: ({}, {})", baseline_coords.0, baseline_coords.1);
                    return Ok(baseline_coords);
                } else {
                    info!("✅ 发现好友动态坐标通过差异检验，差异范围合理(x差异:{}, y差异:{})", diff_x, diff_y);
                    return Ok((dynamic_x, dynamic_y));
                }
            } else {
                info!("⚠️ 通配符模式未找到发现好友按钮，使用基准坐标");
            }
        }
        
        // 优先级2: 使用基准坐标（基于成功ADB测试结果）
        info!("🔧 使用基准发现好友坐标: ({}, {})", baseline_coords.0, baseline_coords.1);
        info!("📱 适配分辨率{}x{} - 发现好友坐标: ({}, {})", 
              screen_width, screen_height, baseline_coords.0, baseline_coords.1);
        
        Ok(baseline_coords)
    }

    /// 获取适配的通讯录按钮坐标（带保险机制）
    async fn get_adaptive_contacts_coords(&self) -> Result<(i32, i32)> {
        let (screen_width, screen_height) = self.get_screen_size().await?;
        
        // 🛡️ 硬编码基准坐标（基于ADB实际测试）
        // 屏幕尺寸 1080x2316，实际测试坐标 (204, 362)，相对位置 (18.9%, 15.6%)
        let baseline_x = (screen_width as f32 * 0.189) as i32;
        let baseline_y = (screen_height as f32 * 0.156) as i32;
        let baseline_coords = (baseline_x, baseline_y);
        
        info!("🎯 通讯录硬编码基准坐标: ({}, {})", baseline_x, baseline_y);
        
        // 🔍 尝试动态搜索通讯录按钮
        if let Ok(ui_dump) = self.get_ui_dump().await {
            info!("🔍 尝试动态搜索通讯录按钮...");
            
            if let Some(coord) = self.find_specific_element(&ui_dump, "contacts_button").await {
                let dynamic_center = coord.center();
                let dynamic_x = dynamic_center.0;
                let dynamic_y = dynamic_center.1;
                
                info!("🎯 动态搜索到通讯录按钮: ({}, {})", dynamic_x, dynamic_y);
                
                // 🛡️ 坐标差异检查（保险机制）
                let diff_x = (dynamic_x - baseline_x).abs();
                let diff_y = (dynamic_y - baseline_y).abs();
                let max_diff_threshold = std::cmp::max(screen_width / 10, screen_height / 10); // 10%屏幕尺寸
                
                info!("� 坐标差异检查: 动态({}, {}) vs 基准({}, {}), 差异({}, {}), 阈值({})", 
                      dynamic_x, dynamic_y, baseline_x, baseline_y, diff_x, diff_y, max_diff_threshold);
                
                if diff_x > max_diff_threshold || diff_y > max_diff_threshold {
                    warn!("⚠️ 通讯录动态坐标({}, {})与基准坐标({}, {})差异过大(x差异:{}, y差异:{})", 
                          dynamic_x, dynamic_y, baseline_x, baseline_y, diff_x, diff_y);
                    warn!("🛡️ 启用坐标保险机制，使用基准坐标: ({}, {})", baseline_x, baseline_y);
                    return Ok(baseline_coords);
                } else {
                    info!("✅ 通讯录动态坐标通过差异检验，差异范围合理(x差异:{}, y差异:{})", diff_x, diff_y);
                    return Ok((dynamic_x, dynamic_y));
                }
            } else {
                info!("⚠️ 动态搜索未找到通讯录按钮，使用基准坐标");
            }
        }
        
        // 🔧 使用基准坐标（基于成功ADB测试结果）
        info!("�📱 屏幕适配 - 通讯录坐标: ({}, {}) [实际测试验证]", baseline_x, baseline_y);
        Ok(baseline_coords)
    }

    /// 处理菜单点击失败的情况
    async fn handle_menu_click_failure(&self, current_state: PageState) -> Result<NavigationResult> {
        error!("🚨 菜单点击失败处理，当前状态: {:?}", current_state);
        
        match current_state {
            PageState::MainPage => {
                warn!("⚠️ 仍在主页面，可能点击位置不准确，尝试重新点击");
                // 等待更长时间后重试
                sleep(Duration::from_millis(1000)).await;
                let menu_coords = self.get_adaptive_menu_coords().await?;
                if let Err(e) = self.adb_tap(menu_coords.0, menu_coords.1).await {
                    return Ok(NavigationResult {
                        success: false,
                        message: format!("重试点击菜单失败: {}", e),
                    });
                }
                sleep(Duration::from_millis(3000)).await;
                
                // 再次验证
                let retry_state = self.recognize_current_page().await?;
                if matches!(retry_state.current_state, PageState::SidebarOpen) {
                    info!("✅ 重试成功，侧边栏已打开");
                    return self.navigate_from_sidebar().await;
                } else {
                    return Ok(NavigationResult {
                        success: false,
                        message: format!("重试后仍无法打开侧边栏，当前状态: {:?}", retry_state.current_state),
                    });
                }
            },
            PageState::Unknown => {
                error!("❌ 进入未知页面状态，尝试返回主页");
                if let Err(e) = self.return_to_home().await {
                    return Ok(NavigationResult {
                        success: false,
                        message: format!("返回主页失败: {}", e),
                    });
                }
                return Ok(NavigationResult {
                    success: false,
                    message: "页面状态异常，已返回主页".to_string(),
                });
            },
            _ => {
                return Ok(NavigationResult {
                    success: false,
                    message: format!("意外的页面状态: {:?}，停止操作", current_state),
                });
            }
        }
    }

    /// 处理发现好友按钮点击失败的情况
    async fn handle_discover_friends_click_failure(&self) -> Result<NavigationResult> {
        error!("🚨 发现好友按钮点击失败处理");
        
        // 尝试重新点击发现好友按钮
        warn!("⚠️ 尝试重新点击发现好友按钮");
        let retry_coords = self.get_adaptive_discover_friends_coords().await?;
        
        if let Err(e) = self.adb_tap(retry_coords.0, retry_coords.1).await {
            return Ok(NavigationResult {
                success: false,
                message: format!("重试点击发现好友失败: {}", e),
            });
        }
        
        sleep(Duration::from_millis(3000)).await;
        
        // 再次验证
        let retry_state = self.recognize_current_page().await?;
        match retry_state.current_state {
            PageState::DiscoverFriends | PageState::WebViewFriends | PageState::ContactsList => {
                info!("✅ 重试成功，进入发现好友相关页面");
                return self.navigate_from_discover_friends().await;
            },
            _ => {
                return Ok(NavigationResult {
                    success: false,
                    message: format!("重试后仍无法进入发现好友页面，当前状态: {:?}", retry_state.current_state),
                });
            }
        }
    }
}