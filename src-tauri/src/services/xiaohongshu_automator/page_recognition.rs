use anyhow::Result;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};
use super::{
    core::XiaohongshuAutomator,
    types::{PageRecognitionResult, PageState, UIElement, UIElementType},
};

/// 屏幕坐标和相对位置计算工具
#[derive(Debug, Clone)]
pub struct ScreenCoordinate {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl ScreenCoordinate {
    /// 创建新的屏幕坐标
    pub fn new(x: i32, y: i32, width: i32, height: i32) -> Self {
        Self { x, y, width, height }
    }

    /// 从相对位置计算绝对坐标
    pub fn from_relative(x_percent: f32, y_percent: f32, width_percent: f32, height_percent: f32, screen_width: i32, screen_height: i32) -> Self {
        let x = (screen_width as f32 * x_percent) as i32;
        let y = (screen_height as f32 * y_percent) as i32;
        let width = (screen_width as f32 * width_percent) as i32;
        let height = (screen_height as f32 * height_percent) as i32;
        Self::new(x, y, width, height)
    }

    /// 获取中心点坐标
    pub fn center(&self) -> (i32, i32) {
        (self.x + self.width / 2, self.y + self.height / 2)
    }

    /// 转换为相对位置
    pub fn to_relative(&self, screen_width: i32, screen_height: i32) -> (f32, f32, f32, f32) {
        let x_percent = self.x as f32 / screen_width as f32;
        let y_percent = self.y as f32 / screen_height as f32;
        let width_percent = self.width as f32 / screen_width as f32;
        let height_percent = self.height as f32 / screen_height as f32;
        (x_percent, y_percent, width_percent, height_percent)
    }
}

pub trait PageRecognitionExt {
    async fn recognize_current_page(&self) -> Result<PageRecognitionResult>;
    async fn analyze_page_state(&self, ui_dump: &str, ui_elements: &[UIElement]) -> Result<(PageState, f32, Vec<String>)>;
    async fn parse_ui_elements(&self, ui_dump: &str) -> Result<Vec<UIElement>>;
    fn parse_ui_element_line(&self, line: &str) -> Option<UIElement>;
    async fn get_screen_size(&self) -> Result<(i32, i32)>;
    async fn find_clickable_elements(&self, ui_dump: &str, text_patterns: &[&str]) -> Result<Vec<ScreenCoordinate>>;
    async fn find_follow_buttons(&self, ui_dump: &str) -> Result<Vec<(String, ScreenCoordinate)>>;
}

impl PageRecognitionExt for XiaohongshuAutomator {
    /// 智能页面识别
    async fn recognize_current_page(&self) -> Result<PageRecognitionResult> {
        info!("🔍 开始识别当前页面状态...");

        let ui_dump = self.get_ui_dump().await?;
        
        // 🔍 严格验证1：检查UI dump质量
        if ui_dump.is_empty() || ui_dump.len() < 200 {
            error!("❌ UI dump内容异常，长度: {}", ui_dump.len());
            return Ok(PageRecognitionResult {
                current_state: PageState::Unknown,
                confidence: 0.0,
                key_elements: vec!["UI dump异常".to_string()],
                ui_elements: vec![],
                message: "UI dump内容为空或过短，可能设备连接异常".to_string(),
            });
        }

        // 🔍 严格验证2：检查是否还在小红书应用内
        if !self.verify_xiaohongshu_context(&ui_dump) {
            error!("❌ 当前不在小红书应用内，停止操作");
            return Ok(PageRecognitionResult {
                current_state: PageState::Unknown,
                confidence: 0.0,
                key_elements: vec!["应用切换".to_string()],
                ui_elements: vec![],
                message: "不在小红书应用内，可能应用被切换或崩溃".to_string(),
            });
        }

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

    /// 分析页面状态 - 基于成功ADB测试的智能识别算法
    async fn analyze_page_state(&self, ui_dump: &str, _ui_elements: &[UIElement]) -> Result<(PageState, f32, Vec<String>)> {
        let mut key_elements = Vec::new();
        let mut confidence_scores = Vec::new();

        info!("🔍 智能分析UI内容，总长度: {} 字符", ui_dump.len());

        // 首先检查是否在Android桌面（增强识别）
        let desktop_indicators = [
            "com.android.launcher3",    // 原生桌面
            "launcher3",                // 桌面简称
            "com.android.launcher",     // 通用桌面
            "launcher",                 // 桌面关键词
            "com.miui.home",            // 小米桌面
            "com.huawei.android.launcher", // 华为桌面
            "com.oppo.launcher",        // OPPO桌面
            "com.vivo.launcher",        // VIVO桌面
            "桌面",                      // 中文桌面
            "主屏幕",                    // 主屏幕
            "主界面",                    // 主界面
        ];
        
        let is_desktop = desktop_indicators.iter().any(|&indicator| ui_dump.contains(indicator));
        
        if is_desktop {
            key_elements.push("Android桌面".to_string());
            confidence_scores.push((PageState::Home, 0.95));
            info!("✓ 检测到Android桌面特征 - 需要启动小红书应用");
        }

        // 检查WebView页面特征 - 基于成功测试发现
        if ui_dump.contains("com.xiaohongshu.webkit.WebView") || ui_dump.contains("NAF=\"true\"") {
            key_elements.push("小红书WebView页面".to_string());
            confidence_scores.push((PageState::DiscoverFriends, 0.95));
            info!("✓ 检测到WebView页面特征（发现好友功能）");
        }

        // 检查侧边栏特征 - 基于成功测试的特征模式（通配符增强）
        let has_friend_feature = ui_dump.contains("添加好友") || ui_dump.contains("发现好友") || 
                                ui_dump.contains("好友") || ui_dump.contains("content-desc=\" 发现好友\"");
        let has_sidebar_features = ui_dump.contains("创作者中心") || ui_dump.contains("我的草稿") || 
                                  ui_dump.contains("设置") || ui_dump.contains("浏览记录") || 
                                  ui_dump.contains("我的下载") || ui_dump.contains("订单");
        let has_recyclerview = ui_dump.contains("androidx.recyclerview.widget.RecyclerView");
        
        if has_friend_feature && has_sidebar_features && has_recyclerview {
            key_elements.push("侧边栏菜单".to_string());
            confidence_scores.push((PageState::SidebarOpen, 0.92));
            info!("✓ 检测到侧边栏特征（含好友相关选项）");
        }

        // 特别检查：DrawerLayout存在且侧边栏打开
        if ui_dump.contains("androidx.drawerlayout.widget.DrawerLayout") && 
           ui_dump.contains("bounds=\"[0,0][810,") {
            key_elements.push("DrawerLayout侧边栏已打开".to_string());
            confidence_scores.push((PageState::SidebarOpen, 0.95));
            info!("✓ 强烈检测到DrawerLayout侧边栏已打开！");
        }

        // 检查主页特征 - 基于成功测试的UI结构
        if (ui_dump.contains("关注") && ui_dump.contains("发现") && ui_dump.contains("长沙")) ||
           (ui_dump.contains("首页") && ui_dump.contains("热门") && ui_dump.contains("消息") && ui_dump.contains("我")) {
            key_elements.push("主页导航".to_string());
            confidence_scores.push((PageState::MainPage, 0.88));
            info!("✓ 检测到主页特征（关注、发现、长沙标签）");
        }

        // 检查菜单按钮是否可见 - 基于成功测试坐标
        if ui_dump.contains("content-desc=\"菜单\"") && ui_dump.contains("bounds=\"[27,96][135,204]\"") {
            key_elements.push("菜单按钮可见".to_string());
            if !confidence_scores.iter().any(|(state, _)| matches!(state, PageState::MainPage)) {
                confidence_scores.push((PageState::MainPage, 0.85));
                info!("✓ 检测到菜单按钮，确认主页状态");
            }
        }

        // 检查通讯录页面特征 (通讯录好友页面)
        if ui_dump.contains("通讯录好友") || 
           (ui_dump.contains("通讯录") && ui_dump.contains("wang")) ||
           (ui_dump.contains("通讯录") && ui_dump.contains("小红薯")) {
            key_elements.push("通讯录关注列表".to_string());
            confidence_scores.push((PageState::ContactsList, 0.95));
            info!("✓ 检测到通讯录页面特征");
        }

        // 检查用户资料页面特征
        if ui_dump.contains("粉丝") && ui_dump.contains("关注") && ui_dump.contains("获赞") {
            key_elements.push("用户资料页面".to_string());
            confidence_scores.push((PageState::UserProfile, 0.85));
            info!("✓ 检测到用户资料页面特征");
        }

        // 检查内容丰富度 - 排除空白或错误页面
        let content_density = self.calculate_content_density(ui_dump);
        if content_density < 0.1 {
            key_elements.push("内容稀少或错误页面".to_string());
            info!("⚠️ 页面内容密度低: {:.2}", content_density);
            // 降低所有置信度
            confidence_scores.iter_mut().for_each(|(_, conf)| *conf *= 0.7);
        }

        // 确定最佳匹配
        if let Some((page_state, confidence)) = confidence_scores.into_iter().max_by(|a, b| a.1.partial_cmp(&b.1).unwrap()) {
            info!("🎯 智能识别结果: {:?}, 置信度: {:.2}", page_state, confidence);
            Ok((page_state, confidence, key_elements))
        } else {
            info!("❓ 未识别出页面类型，返回未知状态");
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

    /// 获取屏幕尺寸
    async fn get_screen_size(&self) -> Result<(i32, i32)> {
        // 执行ADB命令获取屏幕尺寸
        let output = self.execute_adb_command(&["shell", "wm", "size"])?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // 解析输出，格式通常是: Physical size: 1080x2316
        if let Some(size_line) = output_str.lines().find(|line| line.contains("x")) {
            if let Some(size_part) = size_line.split(": ").nth(1) {
                let parts: Vec<&str> = size_part.split('x').collect();
                if parts.len() == 2 {
                    let width = parts[0].parse::<i32>().unwrap_or(1080);
                    let height = parts[1].parse::<i32>().unwrap_or(2316);
                    info!("📱 检测到屏幕尺寸: {}x{}", width, height);
                    return Ok((width, height));
                }
            }
        }
        
        // 默认返回常见的Android屏幕尺寸
        info!("⚠️ 无法检测屏幕尺寸，使用默认值: 1080x2316");
        Ok((1080, 2316))
    }

    /// 查找可点击元素
    async fn find_clickable_elements(&self, ui_dump: &str, text_patterns: &[&str]) -> Result<Vec<ScreenCoordinate>> {
        let mut elements = Vec::new();
        
        for line in ui_dump.lines() {
            // 检查是否包含目标文本
            let has_target_text = text_patterns.iter().any(|pattern| line.contains(pattern));
            
            if has_target_text && line.contains("clickable=\"true\"") {
                // 解析bounds属性，格式: bounds="[x,y][x2,y2]"
                if let Some(bounds_str) = line.split("bounds=\"").nth(1) {
                    if let Some(bounds_part) = bounds_str.split("\"").next() {
                        if let Some(coord) = self.parse_bounds(bounds_part) {
                            info!("🎯 找到可点击元素: {:?}", coord);
                            elements.push(coord);
                        }
                    }
                }
            }
        }
        
        Ok(elements)
    }

    /// 查找所有关注按钮及对应的联系人姓名
    async fn find_follow_buttons(&self, ui_dump: &str) -> Result<Vec<(String, ScreenCoordinate)>> {
        let mut follow_buttons = Vec::new();
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        for (i, line) in lines.iter().enumerate() {
            // 查找关注按钮
            if line.contains("text=\"关注\"") && line.contains("clickable=\"true\"") {
                if let Some(button_coord) = self.parse_bounds_from_line(line) {
                    // 向前查找联系人姓名（通常在关注按钮前几行）
                    let contact_name = self.find_contact_name_near_line(&lines, i);
                    info!("👤 找到关注按钮: {} -> {:?}", contact_name, button_coord);
                    follow_buttons.push((contact_name, button_coord));
                }
            }
        }
        
        Ok(follow_buttons)
    }
}

impl XiaohongshuAutomator {
    /// 计算页面内容密度 - 评估页面信息丰富程度
    fn calculate_content_density(&self, ui_dump: &str) -> f32 {
        let total_chars = ui_dump.len() as f32;
        
        // 计算有意义的内容特征
        let meaningful_patterns = [
            "text=", "resource-id=", "class=", "bounds=", 
            "clickable=\"true\"", "content-desc=", "package=\"com.xingin.xhs\""
        ];
        
        let meaningful_content: usize = meaningful_patterns.iter()
            .map(|pattern| ui_dump.matches(pattern).count())
            .sum();
        
        let density = (meaningful_content as f32) / (total_chars / 100.0);
        info!("📊 内容密度分析: 总字符数={}, 有意义元素={}, 密度={:.3}", 
              total_chars as usize, meaningful_content, density);
        
        density.min(1.0) // 限制最大值为1.0
    }

    /// 智能查找特定元素 - 基于实际测试修复的版本
    pub async fn find_specific_element(&self, ui_dump: &str, element_type: &str) -> Option<ScreenCoordinate> {
        match element_type {
            "menu_button" => {
                info!("🔍 开始查找菜单按钮...");
                info!("📄 UI dump格式检测: {} 字符, {} 行", ui_dump.len(), ui_dump.lines().count());
                
                // 健壮性检查：处理单行和多行UI dump
                let is_single_line = ui_dump.lines().count() <= 2; // XML声明 + 单行内容
                if is_single_line {
                    info!("📋 检测到单行UI dump格式");
                } else {
                    info!("📋 检测到多行UI dump格式");
                }
                
                // 方法1: 增强的菜单按钮搜索（同时支持单行和多行）
                let menu_patterns = vec![
                    r#"content-desc="菜单""#,
                    r#"content-desc='菜单'"#,
                    r#"text="菜单""#,
                    r#"text='菜单'"#,
                ];
                
                for pattern in menu_patterns {
                    if let Some(menu_start) = ui_dump.find(pattern) {
                        info!("🎯 找到菜单文本: {}", pattern);
                        
                        // 向前查找节点开始
                        let before_menu = &ui_dump[..menu_start];
                        if let Some(node_start) = before_menu.rfind("<node") {
                            // 向后查找节点结束
                            let after_menu = &ui_dump[menu_start..];
                            if let Some(node_end_relative) = after_menu.find("/>").or_else(|| after_menu.find("</node>")) {
                                let node_end = menu_start + node_end_relative + if after_menu.chars().nth(node_end_relative).unwrap() == '/' { 2 } else { 7 };
                                let node_content = &ui_dump[node_start..node_end];
                                
                                info!("🎯 找到菜单节点: {}", &node_content[..node_content.len().min(200)]);
                                
                                // 提取bounds
                                if let Some(bounds_start) = node_content.find(r#"bounds=""#) {
                                    let bounds_content = &node_content[bounds_start + 8..];
                                    if let Some(bounds_end) = bounds_content.find('"') {
                                        let bounds_str = &bounds_content[..bounds_end];
                                        info!("🎯 提取到菜单按钮bounds: {}", bounds_str);
                                        if let Some(coord) = self.parse_bounds(bounds_str) {
                                            let center = coord.center();
                                            info!("✅ 菜单按钮坐标: ({}, {}) - 范围: [{},{}][{},{}]", 
                                                center.0, center.1, coord.x, coord.y, coord.x + coord.width, coord.y + coord.height);
                                            return Some(coord);
                                        }
                                    }
                                }
                            }
                        }
                        break; // 找到第一个匹配的模式就跳出
                    }
                }
                
                // 方法2: 兼容性处理 - 如果是多行格式，尝试逐行搜索
                if !is_single_line {
                    info!("🔄 尝试多行模式搜索...");
                    for line in ui_dump.lines() {
                        if (line.contains("菜单") || line.contains("menu")) && 
                           line.contains("bounds=") && 
                           (line.contains("clickable=\"true\"") || line.contains("ImageView")) {
                            
                            if let Some(bounds_start) = line.find(r#"bounds=""#) {
                                let bounds_content = &line[bounds_start + 8..];
                                if let Some(bounds_end) = bounds_content.find('"') {
                                    let bounds_str = &bounds_content[..bounds_end];
                                    info!("🎯 多行模式找到菜单按钮bounds: {}", bounds_str);
                                    if let Some(coord) = self.parse_bounds(bounds_str) {
                                        let center = coord.center();
                                        info!("✅ 菜单按钮坐标: ({}, {})", center.0, center.1);
                                        return Some(coord);
                                    }
                                }
                            }
                        }
                    }
                }
                
                // 方法3: 位置特征匹配（适配单行和多行格式）
                info!("🔄 尝试位置特征匹配...");
                
                // 使用正则表达式在整个UI dump中查找所有bounds
                use regex::Regex;
                let bounds_regex = Regex::new(r"bounds=\[(\d+),(\d+)\]\[(\d+),(\d+)\]").ok()?;
                let mut potential_candidates = Vec::new();
                
                for captures in bounds_regex.captures_iter(ui_dump) {
                    let x1: i32 = captures[1].parse().ok()?;
                    let y1: i32 = captures[2].parse().ok()?;
                    let x2: i32 = captures[3].parse().ok()?;
                    let y2: i32 = captures[4].parse().ok()?;
                    
                    // 检查是否在左上角区域 (基于实际测试，菜单按钮在 [27,96][135,204])
                    if x1 >= 20 && x1 <= 50 && y1 >= 80 && y1 <= 120 && 
                       x2 >= 120 && x2 <= 150 && y2 >= 180 && y2 <= 220 {
                        potential_candidates.push((x1, y1, x2, y2));
                    }
                }
                
                if !potential_candidates.is_empty() {
                    let (x1, y1, x2, y2) = potential_candidates[0];
                    info!("🎯 位置特征匹配找到菜单按钮: bounds=[{},{},{},{}]", x1, y1, x2, y2);
                    let coord = ScreenCoordinate::new(x1, y1, x2 - x1, y2 - y1);
                    let center = coord.center();
                    info!("✅ 菜单按钮坐标: ({}, {})", center.0, center.1);
                    return Some(coord);
                }
                
                // 方法4: 调试输出 - 显示UI dump的前1000个字符
                info!("🔍 UI dump调试预览: {}", &ui_dump[..ui_dump.len().min(1000)]);
                
                warn!("⚠️ 所有菜单按钮查找方法都失败，将使用硬编码坐标 (81,150)");
                // 返回已知的有效坐标
                return Some(ScreenCoordinate::new(27, 96, 108, 108));
            },
            "discover_friends" => {
                info!("🔍 开始查找发现好友按钮...");
                info!("📄 UI dump格式检测: {} 字符, {} 行", ui_dump.len(), ui_dump.lines().count());
                
                // 健壮性检查：处理单行和多行UI dump
                let is_single_line = ui_dump.lines().count() <= 2;
                if is_single_line {
                    info!("📋 检测到单行UI dump格式");
                } else {
                    info!("📋 检测到多行UI dump格式");
                }
                
                // 方法1: 增强的发现好友按钮搜索（同时支持单行和多行）
                let discover_patterns = vec![
                    r#"content-desc="发现好友""#,
                    r#"content-desc='发现好友'"#,
                    r#"text="发现好友""#,
                    r#"text='发现好友'"#,
                    "发现好友", // 通用文本匹配
                ];
                
                for pattern in discover_patterns {
                    if let Some(discover_friends_start) = ui_dump.find(pattern) {
                        info!("🎯 找到发现好友文本: {}", pattern);
                        
                        // 向前查找节点开始
                        let before_discover = &ui_dump[..discover_friends_start];
                        if let Some(node_start) = before_discover.rfind("<node") {
                            // 向后查找节点结束
                            let after_discover = &ui_dump[discover_friends_start..];
                            if let Some(node_end_relative) = after_discover.find("/>").or_else(|| after_discover.find("</node>")) {
                                let node_end = discover_friends_start + node_end_relative + if after_discover.chars().nth(node_end_relative).unwrap() == '/' { 2 } else { 7 };
                                let node_content = &ui_dump[node_start..node_end];
                                
                                info!("🎯 找到发现好友节点: {}", &node_content[..node_content.len().min(200)]);
                                
                                // 提取bounds
                                if let Some(bounds_start) = node_content.find(r#"bounds=""#) {
                                    let bounds_content = &node_content[bounds_start + 8..];
                                    if let Some(bounds_end) = bounds_content.find('"') {
                                        let bounds_str = &bounds_content[..bounds_end];
                                        info!("🎯 提取到发现好友按钮bounds: {}", bounds_str);
                                        if let Some(coord) = self.parse_bounds(bounds_str) {
                                            let center = coord.center();
                                            info!("✅ 发现好友按钮坐标: ({}, {}) - 范围: [{},{}][{},{}]", 
                                                center.0, center.1, coord.x, coord.y, coord.x + coord.width, coord.y + coord.height);
                                            return Some(coord);
                                        }
                                    }
                                }
                            }
                        }
                        break; // 找到第一个匹配的模式就跳出
                    }
                }
                
                // 方法2: 兼容性处理 - 如果是多行格式，尝试逐行搜索
                if !is_single_line {
                    info!("🔄 尝试多行模式搜索发现好友...");
                    for line in ui_dump.lines() {
                        if (line.contains("发现好友") || line.contains("discover")) && 
                           line.contains("bounds=") && 
                           (line.contains("clickable=\"true\"") || line.contains("TextView")) {
                            
                            if let Some(bounds_start) = line.find(r#"bounds=""#) {
                                let bounds_content = &line[bounds_start + 8..];
                                if let Some(bounds_end) = bounds_content.find('"') {
                                    let bounds_str = &bounds_content[..bounds_end];
                                    info!("🎯 多行模式找到发现好友按钮bounds: {}", bounds_str);
                                    if let Some(coord) = self.parse_bounds(bounds_str) {
                                        let center = coord.center();
                                        info!("✅ 发现好友按钮坐标: ({}, {})", center.0, center.1);
                                        return Some(coord);
                                    }
                                }
                            }
                        }
                    }
                }
                
                // 方法2: 查找包含"添加好友"文本的区域，然后找其父级按钮
                if let Some(add_friends_start) = ui_dump.find(r#"text="添加好友""#) {
                    info!("🎯 找到添加好友文本，查找其父级按钮容器");
                    
                    // 向前查找最近的Button节点
                    let before_text = &ui_dump[..add_friends_start];
                    let mut search_pos = before_text.len();
                    
                    while search_pos > 0 {
                        if let Some(button_pos) = before_text[..search_pos].rfind(r#"class="android.widget.Button""#) {
                            // 找到Button，向前查找其节点开始
                            if let Some(node_start) = before_text[..button_pos].rfind("<node") {
                                // 向后查找节点结束（从添加好友文本之后开始）
                                let after_text = &ui_dump[add_friends_start..];
                                if let Some(button_end_relative) = after_text.find("/>").or_else(|| after_text.find("</node>")) {
                                    let button_end = add_friends_start + button_end_relative + if after_text.chars().nth(button_end_relative).unwrap() == '/' { 2 } else { 7 };
                                    let button_content = &ui_dump[node_start..button_end];
                                    
                                    info!("🎯 找到发现好友按钮容器: {}", &button_content[..button_content.len().min(200)]);
                                    
                                    // 提取bounds
                                    if let Some(bounds_start) = button_content.find(r#"bounds=""#) {
                                        let bounds_content = &button_content[bounds_start + 8..];
                                        if let Some(bounds_end) = bounds_content.find('"') {
                                            let bounds_str = &bounds_content[..bounds_end];
                                            info!("🎯 提取到发现好友按钮容器bounds: {}", bounds_str);
                                            if let Some(coord) = self.parse_bounds(bounds_str) {
                                                let center = coord.center();
                                                info!("✅ 发现好友按钮坐标: ({}, {}) - 范围: [{},{}][{},{}]", 
                                                    center.0, center.1, coord.x, coord.y, coord.x + coord.width, coord.y + coord.height);
                                                return Some(coord);
                                            }
                                        }
                                    }
                                    break;
                                }
                            }
                            search_pos = button_pos;
                        } else {
                            break;
                        }
                    }
                }
                
                warn!("⚠️ 发现好友按钮查找失败，使用基于实际测试的硬编码坐标 (405, 288)");
                // 基于真实UI dump的发现好友按钮坐标: bounds="[36,204][774,372]"
                return Some(ScreenCoordinate::new(36, 204, 738, 168));
            },
            "contacts_button" => {
                info!("🔍 开始查找通讯录按钮...");
                
                // 方法1: 查找"通讯录"文本的可点击元素 （基于实际测试结果）
                for line in ui_dump.lines() {
                    if line.contains("text=\"通讯录\"") {
                        info!("🎯 找到通讯录文本行: {}", &line[..line.len().min(200)]);
                        
                        // 向上查找包含此文本的可点击父容器
                        if let Some(line_index) = ui_dump.lines().position(|l| l == line) {
                            let lines: Vec<&str> = ui_dump.lines().collect();
                            // 向上查找最近的可点击容器（通常是LinearLayout）
                            for i in (0..line_index).rev().take(5) {
                                if let Some(parent_line) = lines.get(i) {
                                    if parent_line.contains("clickable=\"true\"") && 
                                       parent_line.contains("android.widget.LinearLayout") {
                                        info!("🎯 找到通讯录按钮父容器: {}", &parent_line[..parent_line.len().min(200)]);
                                        if let Some(coord) = self.parse_bounds_from_line(parent_line) {
                                            let center = coord.center();
                                            info!("✅ 通讯录按钮坐标: ({}, {})", center.0, center.1);
                                            return Some(coord);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // 方法2: 基于位置特征查找（根据实际测试，通讯录按钮在 [48,228][360,497]）
                use regex::Regex;
                let bounds_regex = Regex::new(r"bounds=\[(\d+),(\d+)\]\[(\d+),(\d+)\]").ok()?;
                for line in ui_dump.lines() {
                    if line.contains("clickable=\"true\"") {
                        if let Some(captures) = bounds_regex.captures(line) {
                            let x1: i32 = captures[1].parse().ok()?;
                            let y1: i32 = captures[2].parse().ok()?;
                            let x2: i32 = captures[3].parse().ok()?;
                            let y2: i32 = captures[4].parse().ok()?;
                            
                            // 检查是否匹配通讯录按钮的位置特征
                            if x1 >= 40 && x1 <= 60 && y1 >= 220 && y1 <= 240 && 
                               x2 >= 350 && x2 <= 370 && y2 >= 490 && y2 <= 510 {
                                info!("🎯 位置特征匹配找到通讯录按钮: bounds=[{},{},{},{}]", x1, y1, x2, y2);
                                let coord = ScreenCoordinate::new(x1, y1, x2 - x1, y2 - y1);
                                let center = coord.center();
                                info!("✅ 通讯录按钮坐标: ({}, {})", center.0, center.1);
                                return Some(coord);
                            }
                        }
                    }
                }
                
                warn!("⚠️ 通讯录按钮查找失败，使用硬编码坐标 (204, 362)");
                return Some(ScreenCoordinate::new(48, 228, 312, 269));
            },
            "contacts_option" => {
                // 通配符模式：查找通讯录相关选项
                let contact_patterns = [
                    "text=\"通讯录\"",
                    "content-desc=\"通讯录\"", 
                    "text=\"联系人\"",
                    "content-desc=\"联系人\"",
                    "text=\"通讯录好友\"",
                    "content-desc=\"通讯录好友\"",
                ];
                
                for pattern in &contact_patterns {
                    if let Some(line) = ui_dump.lines().find(|line| 
                        line.contains(pattern) && line.contains("clickable=\"true\"")
                    ) {
                        info!("🎯 通过模式 '{}' 找到通讯录选项", pattern);
                        return self.parse_bounds_from_line(line);
                    }
                }
                
                info!("⚠️ 通讯录选项通配符匹配失败，使用已知坐标");
            },
            _ => {}
        }
        None
    }

    /// 解析bounds字符串为坐标
    fn parse_bounds(&self, bounds_str: &str) -> Option<ScreenCoordinate> {
        // 解析格式: [x1,y1][x2,y2]
        let bounds_str = bounds_str.trim_matches(['[', ']']);
        let coords: Vec<&str> = bounds_str.split("][").collect();
        
        if coords.len() == 2 {
            let start_coords: Vec<&str> = coords[0].split(',').collect();
            let end_coords: Vec<&str> = coords[1].split(',').collect();
            
            if start_coords.len() == 2 && end_coords.len() == 2 {
                let x1 = start_coords[0].parse::<i32>().ok()?;
                let y1 = start_coords[1].parse::<i32>().ok()?;
                let x2 = end_coords[0].parse::<i32>().ok()?;
                let y2 = end_coords[1].parse::<i32>().ok()?;
                
                let width = x2 - x1;
                let height = y2 - y1;
                let coord = ScreenCoordinate::new(x1, y1, width, height);
                
                return Some(coord);
            }
        }
        
        warn!("❌ bounds解析失败: '{}'", bounds_str);
        None
    }

    /// 从单行解析bounds
    fn parse_bounds_from_line(&self, line: &str) -> Option<ScreenCoordinate> {
        if let Some(bounds_str) = line.split("bounds=\"").nth(1) {
            if let Some(bounds_part) = bounds_str.split("\"").next() {
                return self.parse_bounds(bounds_part);
            }
        }
        None
    }

    /// 在指定行附近查找联系人姓名
    fn find_contact_name_near_line(&self, lines: &[&str], button_line_index: usize) -> String {
        // 向前查找联系人姓名，通常在关注按钮前1-5行内
        let search_start = button_line_index.saturating_sub(10);
        let search_end = button_line_index;
        
        for i in (search_start..search_end).rev() {
            if let Some(line) = lines.get(i) {
                // 查找包含姓名的行
                if line.contains("text=\"") && !line.contains("关注") && !line.contains("已关注") {
                    if let Some(text_start) = line.find("text=\"") {
                        let text_part = &line[text_start + 6..];
                        if let Some(text_end) = text_part.find("\"") {
                            let name = &text_part[..text_end];
                            // 过滤掉空字符串和一些无关的文本
                            if !name.is_empty() && name.len() < 20 && !name.contains("resource-id") {
                                return name.to_string();
                            }
                        }
                    }
                }
            }
        }
        
        // 如果没有找到姓名，返回默认值
        "未知联系人".to_string()
    }

    /// 查找左上角区域的可点击元素（用作菜单按钮备选方案）  
    fn find_top_left_clickable_element(&self, ui_dump: &str) -> Option<ScreenCoordinate> {
        use regex::Regex;
        let bounds_regex = Regex::new(r"bounds=\[(\d+),(\d+)\]\[(\d+),(\d+)\]").ok()?;
        
        for line in ui_dump.lines() {
            if !line.contains("clickable=\"true\"") {
                continue;
            }
            
            if let Some(bounds_match) = bounds_regex.captures(line) {
                let x1: i32 = bounds_match[1].parse().ok()?;
                let y1: i32 = bounds_match[2].parse().ok()?;
                let x2: i32 = bounds_match[3].parse().ok()?;
                let y2: i32 = bounds_match[4].parse().ok()?;
                
                // 左上角区域检测：x < 200, y < 300
                if x1 < 200 && y1 < 300 && x2 > x1 && y2 > y1 {
                    // 排除太小的元素（宽高至少30像素）
                    if (x2 - x1) >= 30 && (y2 - y1) >= 30 {
                        info!("🎯 发现左上角可点击元素: bounds=[{},{},{},[{}]]", x1, y1, x2, y2);
                        return Some(ScreenCoordinate { x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
                    }
                }
            }
        }
        
        None
    }

    /// 🔍 严格验证：检查是否还在小红书应用内
    fn verify_xiaohongshu_context(&self, ui_dump: &str) -> bool {
        // 小红书应用特有的标识符
        let xiaohongshu_identifiers = [
            "com.xingin.xhs",           // 包名
            "小红书",                    // 应用名
            "首页",                      // 主要页面
            "发现",                      // 主要标签
            "我",                        // 个人页面
            "购物",                      // 购物标签
            "消息",                      // 消息标签
            "社区",                      // 社区功能
            "笔记",                      // 内容形式
        ];

        // 至少要包含一个强特征标识符
        let has_strong_identifier = xiaohongshu_identifiers.iter()
            .any(|&identifier| ui_dump.contains(identifier));

        if !has_strong_identifier {
            warn!("⚠️ 未发现小红书应用特征标识符");
            return false;
        }

        // 排除明显不是小红书的页面
        let non_xiaohongshu_indicators = [
            "android.settings",         // 系统设置
            "com.android.launcher",     // 桌面
            "系统界面",                   // 系统UI
            "权限请求",                   // 权限对话框
            "安装应用",                   // 安装界面
            "网络连接",                   // 网络设置
        ];

        let has_non_xiaohongshu = non_xiaohongshu_indicators.iter()
            .any(|&indicator| ui_dump.contains(indicator));

        if has_non_xiaohongshu {
            warn!("⚠️ 检测到非小红书页面标识符");
            return false;
        }

        true
    }
}