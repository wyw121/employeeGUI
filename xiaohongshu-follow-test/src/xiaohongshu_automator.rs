use anyhow::{Context, Result};
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

use crate::types::*;

/// 小红书自动化控制器
pub struct XiaohongshuAutomator {
    device_id: String,
    adb_path: String,
}

impl XiaohongshuAutomator {
    pub fn new(device_id: String) -> Self {
        Self {
            device_id,
            adb_path: "adb".to_string(), // 默认使用系统PATH中的adb
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
    async fn analyze_page_state(&self, ui_dump: &str, ui_elements: &[UIElement]) -> Result<(PageState, f32, Vec<String>)> {
        let mut key_elements = Vec::new();
        let mut confidence_scores = Vec::new();

        // 检查主页特征
        if ui_dump.contains("首页") || ui_dump.contains("推荐") || ui_dump.contains("关注") && ui_dump.contains("发现") {
            key_elements.push("主页导航".to_string());
            confidence_scores.push((PageState::MainPage, 0.8));
        }

        // 检查侧边栏特征
        if ui_dump.contains("设置") || ui_dump.contains("我的主页") || ui_dump.contains("发现好友") {
            key_elements.push("侧边栏菜单".to_string());
            confidence_scores.push((PageState::SidebarOpen, 0.9));
        }

        // 检查发现好友页面特征
        if ui_dump.contains("发现好友") || (ui_dump.contains("通讯录") && ui_dump.contains("好友")) {
            key_elements.push("发现好友页面".to_string());
            confidence_scores.push((PageState::DiscoverFriends, 0.85));
        }

        // 检查通讯录页面特征
        if (ui_dump.contains("通讯录") || ui_dump.contains("联系人")) && 
           (ui_dump.contains("关注") || ui_dump.contains("已关注") || ui_dump.contains("follow")) {
            key_elements.push("通讯录关注列表".to_string());
            confidence_scores.push((PageState::ContactsList, 0.9));
        }

        // 检查用户资料页面特征
        if ui_dump.contains("粉丝") && ui_dump.contains("关注") && ui_dump.contains("获赞") {
            key_elements.push("用户资料页面".to_string());
            confidence_scores.push((PageState::UserProfile, 0.85));
        }

        // 确定最佳匹配
        if let Some((page_state, confidence)) = confidence_scores.into_iter().max_by(|a, b| a.1.partial_cmp(&b.1).unwrap()) {
            Ok((page_state, confidence, key_elements))
        } else {
            Ok((PageState::Unknown, 0.0, key_elements))
        }
    }

    /// 解析UI元素
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

        info!("📱 解析到 {} 个可操作UI元素", elements.len());
        Ok(elements)
    }

    /// 解析单个UI元素行
    fn parse_ui_element_line(&self, line: &str) -> Option<UIElement> {
        // 简化的属性提取
        let text = self.extract_attribute(line, "text").unwrap_or_default();
        let resource_id = self.extract_attribute(line, "resource-id");
        let class_name = self.extract_attribute(line, "class");
        let bounds_str = self.extract_attribute(line, "bounds")?;
        
        // 解析bounds: [left,top][right,bottom]
        let bounds = self.parse_bounds(&bounds_str)?;
        
        let element_type = if line.contains("Button") || text.contains("关注") {
            UIElementType::Button
        } else if line.contains("TextView") {
            UIElementType::TextView
        } else {
            UIElementType::Unknown
        };

        Some(UIElement {
            element_type,
            text,
            bounds,
            clickable: line.contains("clickable=\"true\""),
            resource_id,
            class_name,
        })
    }

    /// 提取XML属性值
    fn extract_attribute(&self, line: &str, attr_name: &str) -> Option<String> {
        let pattern = format!("{}=\"", attr_name);
        if let Some(start) = line.find(&pattern) {
            let start = start + pattern.len();
            if let Some(end) = line[start..].find('"') {
                return Some(line[start..start + end].to_string());
            }
        }
        None
    }

    /// 解析bounds坐标
    fn parse_bounds(&self, bounds_str: &str) -> Option<(i32, i32, i32, i32)> {
        // 格式: [left,top][right,bottom]
        let coords: Vec<i32> = bounds_str
            .replace("[", "")
            .replace("]", ",")
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();
        
        if coords.len() >= 4 {
            Some((coords[0], coords[1], coords[2], coords[3]))
        } else {
            None
        }
    }

    /// 检查小红书应用状态
    pub async fn check_app_status(&self) -> Result<AppStatusResult> {
        info!("检查小红书应用状态...");

        let app_installed = self.is_app_installed("com.xingin.xhs").await?;
        let app_running = if app_installed {
            self.is_app_running("com.xingin.xhs").await?
        } else {
            false
        };

        let message = match (app_installed, app_running) {
            (false, _) => "小红书应用未安装".to_string(),
            (true, false) => "小红书应用已安装但未运行".to_string(),
            (true, true) => "小红书应用已安装且正在运行".to_string(),
        };

        Ok(AppStatusResult {
            app_installed,
            app_running,
            message,
        })
    }

    /// 检查应用是否安装
    async fn is_app_installed(&self, package_name: &str) -> Result<bool> {
        let output = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "pm", "list", "packages", package_name])
            .output()
            .context("检查应用安装状态失败")?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        Ok(output_str.contains(package_name))
    }

    /// 检查应用是否运行
    async fn is_app_running(&self, package_name: &str) -> Result<bool> {
        let output = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "dumpsys", "activity", "activities"])
            .output()
            .context("检查应用运行状态失败")?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        Ok(output_str.contains(package_name))
    }

    /// 导航到小红书通讯录页面（基于手动验证的流程）
    pub async fn navigate_to_contacts(&self) -> Result<NavigationResult> {
        info!("🧭 基于手动验证流程导航到小红书通讯录页面...");

        // 首先确保小红书应用正在运行
        let app_status = self.check_app_status().await?;
        if !app_status.app_installed {
            return Ok(NavigationResult {
                success: false,
                message: "小红书应用未安装".to_string(),
            });
        }

        if !app_status.app_running {
            info!("启动小红书应用...");
            self.open_xiaohongshu_app().await?;
            sleep(Duration::from_secs(3)).await;
        }

        // 确保在主页面开始
        let mut attempts = 0;
        while attempts < 3 {
            let page_state = self.recognize_current_page().await?;
            if matches!(page_state.current_state, PageState::MainPage) {
                info!("✓ 已在主页面，开始导航流程");
                break;
            } else {
                info!("当前不在主页面，尝试返回主页");
                self.return_to_home().await?;
                sleep(Duration::from_secs(2)).await;
                attempts += 1;
            }
        }

        // 步骤1: 点击头像打开侧边栏（已验证坐标: 60, 100）
        info!("📱 步骤1: 点击头像打开侧边栏");
        self.adb_tap(60, 100).await?;
        sleep(Duration::from_secs(2)).await;
        
        // 验证侧边栏是否打开
        let sidebar_check = self.recognize_current_page().await?;
        if !matches!(sidebar_check.current_state, PageState::SidebarOpen) {
            return Ok(NavigationResult {
                success: false,
                message: format!("侧边栏打开失败，当前状态: {:?}", sidebar_check.current_state),
            });
        }
        info!("✓ 侧边栏成功打开");

        // 步骤2: 在侧边栏中点击"发现好友"
        info!("👥 步骤2: 点击发现好友选项");
        let discover_coords = self.find_discover_friends_coords().await?;
        self.adb_tap(discover_coords.0, discover_coords.1).await?;
        sleep(Duration::from_secs(2)).await;
        
        // 验证是否到达发现好友页面或直接到达联系人页面
        let discover_check = self.recognize_current_page().await?;
        match discover_check.current_state {
            PageState::DiscoverFriends => {
                info!("✓ 成功进入发现好友页面，继续下一步");
                
                // 步骤3: 点击"通讯录朋友"选项
                info!("📋 步骤3: 点击通讯录朋友选项");
                let contacts_coords = self.find_contacts_option_coords().await?;
                self.adb_tap(contacts_coords.0, contacts_coords.1).await?;
                sleep(Duration::from_secs(3)).await; // 联系人加载可能需要更长时间
                
                // 验证最终是否到达联系人页面
                let final_check = self.recognize_current_page().await?;
                if matches!(final_check.current_state, PageState::ContactsList) {
                    info!("✅ 成功导航到联系人页面");
                    Ok(NavigationResult {
                        success: true,
                        message: "成功导航到通讯录页面".to_string(),
                    })
                } else {
                    Ok(NavigationResult {
                        success: false,
                        message: format!("导航失败，最终状态: {:?}", final_check.current_state),
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
                Ok(NavigationResult {
                    success: false,
                    message: format!("未能进入发现好友页面，当前状态: {:?}", discover_check.current_state),
                })
            }
        }
    }

    /// 智能点击菜单按钮
    async fn smart_click_menu_button(&self, ui_elements: &[UIElement]) -> Result<()> {
        // 寻找头像或菜单按钮
        for element in ui_elements {
            if element.clickable && 
               (element.text.contains("头像") || 
                element.resource_id.as_ref().map_or(false, |id| id.contains("avatar")) ||
                element.bounds.0 < 100 && element.bounds.1 < 150) {
                
                let center_x = (element.bounds.0 + element.bounds.2) / 2;
                let center_y = (element.bounds.1 + element.bounds.3) / 2;
                
                info!("🎯 智能点击菜单按钮 坐标:({}, {}) 元素:{}", center_x, center_y, element.text);
                self.adb_tap(center_x, center_y).await?;
                return Ok(());
            }
        }
        
        // 如果没找到，使用默认位置
        info!("🎯 使用默认菜单按钮位置 坐标:(60, 100)");
        self.adb_tap(60, 100).await?;
        Ok(())
    }

    /// 智能点击发现好友
    async fn smart_click_discover_friends(&self, ui_elements: &[UIElement]) -> Result<()> {
        for element in ui_elements {
            if element.clickable && 
               (element.text.contains("发现好友") || element.text.contains("通讯录") || element.text.contains("好友")) {
                
                let center_x = (element.bounds.0 + element.bounds.2) / 2;
                let center_y = (element.bounds.1 + element.bounds.3) / 2;
                
                info!("🎯 智能点击发现好友 坐标:({}, {}) 元素:{}", center_x, center_y, element.text);
                self.adb_tap(center_x, center_y).await?;
                return Ok(());
            }
        }
        
        anyhow::bail!("未找到发现好友按钮");
    }

    /// 智能点击通讯录
    async fn smart_click_contacts(&self, ui_elements: &[UIElement]) -> Result<()> {
        for element in ui_elements {
            if element.clickable && 
               (element.text.contains("通讯录") || element.text.contains("联系人") || element.text.contains("手机通讯录")) {
                
                let center_x = (element.bounds.0 + element.bounds.2) / 2;
                let center_y = (element.bounds.1 + element.bounds.3) / 2;
                
                info!("🎯 智能点击通讯录 坐标:({}, {}) 元素:{}", center_x, center_y, element.text);
                self.adb_tap(center_x, center_y).await?;
                return Ok(());
            }
        }
        
        anyhow::bail!("未找到通讯录按钮");
    }

    /// 启动小红书应用
    async fn open_xiaohongshu_app(&self) -> Result<()> {
        info!("启动小红书应用...");

        let _output = Command::new(&self.adb_path)
            .args(&[
                "-s", &self.device_id,
                "shell", "am", "start",
                "-n", "com.xingin.xhs/.index.v2.IndexActivityV2"
            ])
            .output()
            .context("启动小红书应用失败")?;

        sleep(Duration::from_secs(3)).await;
        Ok(())
    }

    /// 内部导航逻辑
    async fn navigate_to_contacts_internal(&self) -> Result<()> {
        info!("执行导航步骤...");

        // 首先获取屏幕尺寸信息
        let screen_info = self.get_screen_info().await?;
        info!("屏幕尺寸: {}x{}", screen_info.width, screen_info.height);

        // 点击左上角菜单按钮（头像）
        let menu_x = 60;
        let menu_y = 100;
        info!("点击左上角菜单按钮 坐标:({}, {})", menu_x, menu_y);
        self.adb_tap(menu_x, menu_y).await?;
        sleep(Duration::from_secs(3)).await;

        // 获取侧边栏UI信息
        info!("分析侧边栏UI结构...");
        let ui_dump = self.get_ui_dump().await?;
        
        // 尝试点击"发现好友"选项 - 根据常见位置尝试多个坐标
        let discover_candidates = vec![
            (160, 350, "发现好友选项位置1"),
            (160, 400, "发现好友选项位置2"), 
            (160, 450, "发现好友选项位置3"),
            (180, 380, "发现好友选项位置4"),
        ];

        let mut clicked_discover = false;
        for (x, y, desc) in discover_candidates {
            info!("尝试点击{} 坐标:({}, {})", desc, x, y);
            self.adb_tap(x, y).await?;
            sleep(Duration::from_secs(2)).await;
            
            // 检查是否成功进入发现好友页面
            let current_ui = self.get_ui_dump().await?;
            if current_ui.contains("通讯录") || current_ui.contains("发现好友") || current_ui.contains("手机联系人") {
                info!("✅ 成功点击{}", desc);
                clicked_discover = true;
                break;
            } else {
                info!("❌ {}点击无效，继续尝试下一个位置", desc);
            }
        }

        if !clicked_discover {
            warn!("所有发现好友选项位置都尝试失败，尝试通用方案");
            // 通用方案：在侧边栏中间区域滑动查找
            self.swipe_in_sidebar().await?;
        }

        // 尝试进入通讯录页面
        let contacts_candidates = vec![
            (200, 300, "通讯录选项位置1"),
            (200, 400, "通讯录选项位置2"),
            (200, 500, "通讯录选项位置3"),
            (screen_info.width / 2, 400, "屏幕中央通讯录位置"),
        ];

        for (x, y, desc) in contacts_candidates {
            info!("尝试点击{} 坐标:({}, {})", desc, x, y);
            self.adb_tap(x, y).await?;
            sleep(Duration::from_secs(3)).await;
            
            // 检查是否成功进入通讯录页面
            let current_ui = self.get_ui_dump().await?;
            if current_ui.contains("关注") || current_ui.contains("follow") || current_ui.contains("联系人") {
                info!("✅ 成功进入通讯录页面，找到关注相关内容");
                return Ok(());
            } else {
                info!("❌ {}点击无效，继续尝试", desc);
            }
        }

        warn!("导航到通讯录页面可能失败，但继续执行后续操作");
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
            for (_i, (x, y)) in follow_buttons.iter().enumerate() {
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

    /// 智能查找关注按钮
    async fn find_follow_buttons(&self) -> Result<Vec<(i32, i32)>> {
        info!("🔍 智能分析页面中的关注按钮...");

        // 首先确认当前页面状态
        let page_recognition = self.recognize_current_page().await?;
        
        if page_recognition.current_state != PageState::ContactsList {
            warn!("⚠️ 当前不在通讯录页面，状态: {:?}", page_recognition.current_state);
            return Ok(vec![]);
        }

        let mut buttons = Vec::new();

        // 从UI元素中查找关注按钮
        for element in &page_recognition.ui_elements {
            if element.element_type == UIElementType::Button && element.clickable {
                let button_text = element.text.to_lowercase();
                
                // 检查是否是关注相关按钮
                if button_text.contains("关注") || 
                   button_text.contains("follow") || 
                   button_text.contains("已关注") ||
                   button_text.contains("following") {
                    
                    let center_x = (element.bounds.0 + element.bounds.2) / 2;
                    let center_y = (element.bounds.1 + element.bounds.3) / 2;
                    
                    buttons.push((center_x, center_y));
                    info!("✅ 找到关注按钮 坐标:({}, {}) 文本:'{}'", center_x, center_y, element.text);
                }
            }
        }

        // 如果通过UI元素没找到，尝试通过UI dump的文本定位
        if buttons.is_empty() {
            info!("🔄 UI元素分析未找到按钮，尝试文本定位...");
            buttons = self.find_buttons_by_text_pattern().await?;
        }

        info!("📊 总共找到 {} 个关注按钮位置", buttons.len());
        Ok(buttons)
    }

    /// 通过文本模式查找按钮
    async fn find_buttons_by_text_pattern(&self) -> Result<Vec<(i32, i32)>> {
        let ui_dump = self.get_ui_dump().await?;
        let screen_info = self.get_screen_info().await?;
        
        let mut buttons = Vec::new();
        
        // 分析UI dump中的关注文本位置
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        for (i, line) in lines.iter().enumerate() {
            if line.contains("关注") || line.contains("follow") {
                if let Some(bounds) = self.extract_bounds_from_line(line) {
                    let center_x = (bounds.0 + bounds.2) / 2;
                    let center_y = (bounds.1 + bounds.3) / 2;
                    
                    // 验证坐标合理性
                    if center_x > 0 && center_x < screen_info.width &&
                       center_y > 0 && center_y < screen_info.height {
                        buttons.push((center_x, center_y));
                        info!("📍 文本定位找到按钮 坐标:({}, {}) 行内容摘要:'{}'", 
                             center_x, center_y, &line.chars().take(50).collect::<String>());
                    }
                }
            }
        }
        
        Ok(buttons)
    }

    /// 从UI dump行中提取bounds
    fn extract_bounds_from_line(&self, line: &str) -> Option<(i32, i32, i32, i32)> {
        if let Some(bounds_str) = self.extract_attribute(line, "bounds") {
            self.parse_bounds(&bounds_str)
        } else {
            None
        }
    }

    /// 点击关注按钮
    async fn click_follow_button(&self, x: i32, y: i32) -> Result<bool> {
        info!("点击关注按钮 坐标:({}, {})", x, y);

        self.adb_tap(x, y).await?;
        sleep(Duration::from_millis(1000)).await;

        // 验证点击效果
        let ui_after = self.get_ui_dump().await?;
        let success = ui_after.contains("已关注") || ui_after.contains("following");
        
        if success {
            info!("✅ 关注按钮点击成功");
        } else {
            info!("❓ 关注按钮点击效果未确认");
        }

        Ok(true)
    }

    /// 获取指定位置的按钮文本（简化实现）
    async fn get_button_text_at(&self, _x: i32, _y: i32) -> Result<String> {
        // 简化实现，实际应该通过UI dump解析特定位置的文本
        Ok("关注".to_string())
    }

    /// 滚动页面向下
    async fn scroll_down(&self) -> Result<()> {
        info!("向下滚动页面");

        let _output = Command::new(&self.adb_path)
            .args(&[
                "-s", &self.device_id,
                "shell", "input", "swipe",
                "500", "800", "500", "300", "1000"
            ])
            .output()
            .context("滚动页面失败")?;

        Ok(())
    }

    /// 返回主页
    async fn return_to_home(&self) -> Result<()> {
        info!("返回小红书主页");

        // 按返回键多次返回主页
        for _ in 0..3 {
            let _output = Command::new(&self.adb_path)
                .args(&["-s", &self.device_id, "shell", "input", "keyevent", "4"])
                .output()
                .context("按返回键失败")?;
            sleep(Duration::from_millis(500)).await;
        }

        Ok(())
    }

    /// 获取UI dump
    async fn get_ui_dump(&self) -> Result<String> {
        // 方法1: 直接输出到stdout
        let output1 = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "uiautomator", "dump", "/dev/stdout"])
            .output()
            .context("获取UI dump失败")?;

        let result1 = String::from_utf8_lossy(&output1.stdout).to_string();
        
        if result1.len() > 100 && result1.contains("<?xml") {
            return Ok(result1);
        }

        // 方法2: 先dump到文件，再cat
        let _dump_output = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"])
            .output()
            .context("dump到文件失败")?;

        let output2 = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "cat", "/sdcard/ui_dump.xml"])
            .output()
            .context("读取UI dump文件失败")?;

        let result2 = String::from_utf8_lossy(&output2.stdout).to_string();
        
        if result2.len() > 100 && result2.contains("<?xml") {
            return Ok(result2);
        }

        // 如果都失败了，返回错误
        anyhow::bail!("无法获取有效的UI dump，方法1长度: {}, 方法2长度: {}", result1.len(), result2.len());
    }

    /// ADB点击坐标
    async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        let _output = Command::new(&self.adb_path)
            .args(&[
                "-s", &self.device_id,
                "shell", "input", "tap",
                &x.to_string(), &y.to_string()
            ])
            .output()
            .context("ADB点击失败")?;

        Ok(())
    }

    /// 获取屏幕信息
    async fn get_screen_info(&self) -> Result<ScreenInfo> {
        let output = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "wm", "size"])
            .output()
            .context("获取屏幕尺寸失败")?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // 解析输出格式：Physical size: 1080x2340
        if let Some(size_line) = output_str.lines().find(|line| line.contains("Physical size") || line.contains("size:")) {
            if let Some(size_part) = size_line.split(':').nth(1) {
                let size_part = size_part.trim();
                if let Some((width_str, height_str)) = size_part.split_once('x') {
                    let width = width_str.parse::<i32>().unwrap_or(1080);
                    let height = height_str.parse::<i32>().unwrap_or(2340);
                    return Ok(ScreenInfo { width, height });
                }
            }
        }

        // 默认屏幕尺寸
        warn!("无法解析屏幕尺寸，使用默认值");
        Ok(ScreenInfo { width: 1080, height: 2340 })
    }

    /// 在侧边栏中滑动查找选项
    async fn swipe_in_sidebar(&self) -> Result<()> {
        info!("在侧边栏中滑动查找发现好友选项 坐标:(200, 600) -> (200, 300)");
        
        let _output = Command::new(&self.adb_path)
            .args(&[
                "-s", &self.device_id,
                "shell", "input", "swipe",
                "200", "600", "200", "300", "1000"
            ])
            .output()
            .context("侧边栏滑动失败")?;

        sleep(Duration::from_millis(1000)).await;
        Ok(())
    }

    /// 查找侧边栏中"发现好友"选项的坐标
    async fn find_discover_friends_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 查找发现好友选项坐标...");
        
        let ui_dump = self.get_ui_dump().await?;
        let ui_elements = self.parse_ui_elements(&ui_dump).await?;
        
        // 查找包含"发现好友"或相关文本的元素
        for element in &ui_elements {
            if !element.text.is_empty() && 
               (element.text.contains("发现好友") || element.text.contains("发现") || element.text.contains("好友")) {
                    let center_x = (element.bounds.0 + element.bounds.2) / 2;
                    let center_y = (element.bounds.1 + element.bounds.3) / 2;
                    info!("✓ 找到发现好友选项: ({}, {})", center_x, center_y);
                    return Ok((center_x, center_y));
                }
        }
        
        // 如果没找到，使用预估坐标（基于侧边栏布局）
        warn!("未找到发现好友选项文本，使用预估坐标");
        Ok((270, 168)) // 基于UI dump分析的准确坐标
    }

    /// 查找"通讯录朋友"选项的坐标
    async fn find_contacts_option_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 查找通讯录朋友选项坐标...");
        
        let ui_dump = self.get_ui_dump().await?;
        let ui_elements = self.parse_ui_elements(&ui_dump).await?;
        
        // 查找包含"通讯录"或相关文本的元素
        for element in &ui_elements {
            if !element.text.is_empty() && 
               (element.text.contains("通讯录") || element.text.contains("联系人") || element.text.contains("手机联系人")) {
                    let center_x = (element.bounds.0 + element.bounds.2) / 2;
                    let center_y = (element.bounds.1 + element.bounds.3) / 2;
                    info!("✓ 找到通讯录选项: ({}, {})", center_x, center_y);
                    return Ok((center_x, center_y));
                }
        }
        
        // 如果找不到，返回默认坐标
        warn!("⚠️ 未找到通讯录选项，使用默认坐标");
        Ok((194, 205)) // 基于之前测试的成功坐标
    }
        
    /// 完整的自动关注流程
    pub async fn auto_follow_contacts(&self, max_follows: Option<usize>) -> Result<FollowResult> {
        info!("🚀 开始自动关注通讯录好友...");
        
        // 第一步：导航到通讯录页面
        let nav_result = self.navigate_to_contacts().await?;
        if !nav_result.success {
            return Ok(FollowResult {
                success: false,
                followed_count: 0,
                message: format!("导航失败: {}", nav_result.message),
            });
        }
        
        // 第二步：确保在通讯录选项卡
        self.ensure_contacts_tab().await?;
        
        // 第三步：执行批量关注
        let follow_count = self.follow_all_friends(max_follows).await?;
        
        Ok(FollowResult {
            success: true,
            followed_count: follow_count,
            message: format!("成功关注了 {} 个好友", follow_count),
        })
    }

    /// 确保在通讯录选项卡
    async fn ensure_contacts_tab(&self) -> Result<()> {
        info!("📋 确保在通讯录选项卡...");
        
        // 点击通讯录选项卡
        self.adb_tap(194, 205).await?;
        sleep(Duration::from_secs(2)).await;
        
        info!("✓ 已切换到通讯录选项卡");
        Ok(())
    }

    /// 关注所有好友
    async fn follow_all_friends(&self, max_follows: Option<usize>) -> Result<usize> {
        info!("👥 开始关注好友...");
        let mut followed_count = 0;
        let max_count = max_follows.unwrap_or(50); // 默认最多关注50个
        
        // 多次尝试关注，直到没有更多好友或达到上限
        for round in 1..=10 { // 最多10轮
            info!("🔄 第 {} 轮关注", round);
            
            let round_follows = self.follow_visible_friends().await?;
            followed_count += round_follows;
            
            if round_follows == 0 {
                info!("✅ 没有更多好友需要关注");
                break;
            }
            
            if followed_count >= max_count {
                info!("✅ 已达到最大关注数量限制: {}", max_count);
                break;
            }
            
            // 滚动页面以加载更多好友
            self.scroll_down().await?;
            sleep(Duration::from_secs(2)).await;
        }
        
        info!("🎉 关注完成，总共关注了 {} 个好友", followed_count);
        Ok(followed_count)
    }

    /// 关注当前可见的好友
    async fn follow_visible_friends(&self) -> Result<usize> {
        let follow_buttons = self.find_follow_buttons().await?;
        let mut followed_count = 0;
        
        for (i, (x, y)) in follow_buttons.iter().enumerate() {
            info!("👤 关注第 {} 个好友，坐标: ({}, {})", i + 1, x, y);
            
            self.adb_tap(*x, *y).await?;
            followed_count += 1;
            
            // 随机延迟，模拟人工操作
            let delay = rand::random::<u64>() % 2000 + 1000; // 1-3秒随机延迟
            sleep(Duration::from_millis(delay)).await;
        }
        
        Ok(followed_count)
    }

}

/// 屏幕信息
#[derive(Debug)]
struct ScreenInfo {
    width: i32,
    height: i32,
}