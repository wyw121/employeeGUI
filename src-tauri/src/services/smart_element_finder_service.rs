use serde::{Deserialize, Serialize};
use tauri::command;
use crate::services::adb_service::AdbService;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationBarConfig {
    pub position_type: String, // "bottom", "top", "side", "floating"
    pub position_ratio: Option<PositionRatio>,
    pub button_count: Option<i32>,
    pub button_patterns: Vec<String>,
    pub target_button: String,
    pub click_action: String, // "single_tap", "double_tap", "long_press"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionRatio {
    pub x_start: f64,
    pub x_end: f64,
    pub y_start: f64,
    pub y_end: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedElement {
    pub text: String,
    pub bounds: String,
    pub content_desc: String,
    pub clickable: bool,
    pub position: (i32, i32), // center position
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ElementFinderResult {
    pub success: bool,
    pub message: String,
    pub found_elements: Option<Vec<DetectedElement>>,
    pub target_element: Option<DetectedElement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClickResult {
    pub success: bool,
    pub message: String,
}

pub struct SmartElementFinderService {
    adb_service: AdbService,
}

impl SmartElementFinderService {
    pub fn new(adb_service: AdbService) -> Self {
        Self { adb_service }
    }

    /// 检查应用是否在前台
    pub async fn check_app_foreground(&self, device_id: &str, app_name: &str) -> Result<bool, String> {
        // 获取当前UI信息判断是否为指定应用
        let ui_xml = self.adb_service.dump_ui_hierarchy(device_id).await
            .map_err(|e| format!("Failed to dump UI: {}", e))?;
            
        // 检查XML中是否包含应用包名（简单检测）
        let package_name = match app_name {
            "小红书" => "com.xingin.xhs",
            "微信" => "com.tencent.mm", 
            "抖音" => "com.ss.android.ugc.aweme",
            _ => return Ok(false), // 未知应用
        };
        
        let is_foreground = ui_xml.contains(&format!("package=\"{}\"", package_name));
        Ok(is_foreground)
    }
    
    /// 从桌面启动应用
    pub async fn launch_app_from_desktop(&self, device_id: &str, app_name: &str) -> Result<(), String> {
        // 获取当前UI信息
        let ui_xml = self.adb_service.dump_ui_hierarchy(device_id).await
            .map_err(|e| format!("Failed to dump UI: {}", e))?;
            
        // 查找应用图标位置
        if let Some(app_bounds) = self.find_app_icon_bounds(&ui_xml, app_name) {
            // 计算点击位置（中心点）
            match Self::calculate_center_position(&app_bounds) {
                Ok(center) => {
                    // 点击应用图标
                    self.adb_service.tap_screen(device_id, center.0, center.1).await
                        .map_err(|e| format!("Failed to tap app icon: {}", e))?;
                    Ok(())
                }
                Err(e) => Err(format!("无法计算 {} 图标的中心位置: {}", app_name, e))
            }
        } else {
            Err(format!("在桌面上未找到 {} 应用图标", app_name))
        }
    }
    
    /// 在XML中查找应用图标的bounds
    fn find_app_icon_bounds(&self, ui_xml: &str, app_name: &str) -> Option<String> {
        let lines: Vec<&str> = ui_xml.lines().collect();
        
        for line in lines {
            if line.trim().starts_with("<node") && line.contains(&format!("text=\"{}\"", app_name)) {
                // 提取bounds属性
                if let Some(start) = line.find("bounds=\"") {
                    let start = start + 8; // "bounds=\"".len()
                    if let Some(end) = line[start..].find("\"") {
                        return Some(line[start..start + end].to_string());
                    }
                }
            }
        }
        None
    }

    /// 解析bounds字符串 "[x1,y1][x2,y2]" -> ((x1, y1), (x2, y2))
    fn parse_bounds(bounds_str: &str) -> Result<((i32, i32), (i32, i32)), String> {
        let bounds_str = bounds_str.trim_matches(|c| c == '[' || c == ']');
        let parts: Vec<&str> = bounds_str.split("][").collect();
        
        if parts.len() != 2 {
            return Err(format!("Invalid bounds format: {}", bounds_str));
        }

        let parse_coords = |coord_str: &str| -> Result<(i32, i32), String> {
            let coords: Vec<&str> = coord_str.split(',').collect();
            if coords.len() != 2 {
                return Err("Invalid coordinate format".to_string());
            }
            let x: i32 = coords[0].parse().map_err(|_| "Invalid x coordinate")?;
            let y: i32 = coords[1].parse().map_err(|_| "Invalid y coordinate")?;
            Ok((x, y))
        };

        let top_left = parse_coords(parts[0])?;
        let bottom_right = parse_coords(parts[1])?;

        Ok((top_left, bottom_right))
    }

    /// 计算元素中心位置
    fn calculate_center_position(bounds: &str) -> Result<(i32, i32), String> {
        let ((x1, y1), (x2, y2)) = Self::parse_bounds(bounds)?;
        let center_x = (x1 + x2) / 2;
        let center_y = (y1 + y2) / 2;
        Ok((center_x, center_y))
    }

    /// 检查元素是否在指定区域内
    fn is_in_region(bounds: &str, screen_size: (i32, i32), region: &PositionRatio) -> bool {
        if let Ok(((x1, y1), (x2, y2))) = Self::parse_bounds(bounds) {
            let (screen_width, screen_height) = screen_size;
            
            let region_x1 = (region.x_start * screen_width as f64) as i32;
            let region_x2 = (region.x_end * screen_width as f64) as i32;
            let region_y1 = (region.y_start * screen_height as f64) as i32;
            let region_y2 = (region.y_end * screen_height as f64) as i32;

            let element_center_x = (x1 + x2) / 2;
            let element_center_y = (y1 + y2) / 2;

            element_center_x >= region_x1 && element_center_x <= region_x2 &&
            element_center_y >= region_y1 && element_center_y <= region_y2
        } else {
            false
        }
    }

    /// 获取屏幕尺寸
    async fn get_screen_size(&self, device_id: &str) -> Result<(i32, i32), String> {
        let output = self.adb_service.execute_adb_command(device_id, "shell wm size").await
            .map_err(|e| format!("Failed to get screen size: {}", e))?;

        // 解析输出: "Physical size: 1080x1920"
        for line in output.lines() {
            if line.contains("Physical size:") || line.contains("size:") {
                if let Some(size_part) = line.split(':').nth(1) {
                    let size_part = size_part.trim();
                    let dimensions: Vec<&str> = size_part.split('x').collect();
                    if dimensions.len() == 2 {
                        if let (Ok(width), Ok(height)) = (dimensions[0].parse::<i32>(), dimensions[1].parse::<i32>()) {
                            return Ok((width, height));
                        }
                    }
                }
            }
        }
        
        // 默认尺寸
        Ok((1080, 1920))
    }

    /// 智能元素查找主方法
    pub async fn smart_element_finder(&self, device_id: &str, config: NavigationBarConfig) -> Result<ElementFinderResult, String> {
        // 1. 获取屏幕尺寸
        let screen_size = self.get_screen_size(device_id).await?;
        println!("Screen size: {:?}", screen_size);

        // 2. 获取UI层次结构
        let ui_xml = self.adb_service.dump_ui_hierarchy(device_id).await
            .map_err(|e| format!("Failed to dump UI: {}", e))?;

        // 3. 解析XML并查找导航栏区域内的元素
        let position_ratio = config.position_ratio.as_ref().ok_or("Position ratio is required")?;
        
        let mut found_elements = Vec::new();
        let mut target_element: Option<DetectedElement> = None;

        // 解析XML (这里需要实现XML解析逻辑)
        if let Ok(elements) = self.parse_navigation_elements(&ui_xml, screen_size, position_ratio) {
            for element in elements {
                // 检查是否为导航按钮
                let is_navigation_button = self.is_navigation_button(&element, &config.button_patterns);
                
                if is_navigation_button {
                    let detected = DetectedElement {
                        text: element.text.clone(),
                        bounds: element.bounds.clone(),
                        content_desc: element.content_desc.clone(),
                        clickable: element.clickable,
                        position: Self::calculate_center_position(&element.bounds)
                            .unwrap_or((0, 0)),
                    };

                    found_elements.push(detected.clone());

                    // 检查是否为目标按钮
                    if self.is_target_button(&element, &config.target_button) {
                        target_element = Some(detected);
                    }
                }
            }
        }

        let success = target_element.is_some();
        let message = if success {
            format!("成功找到目标按钮'{}'", config.target_button)
        } else if found_elements.is_empty() {
            "未找到任何导航按钮".to_string()
        } else {
            format!("找到{}个导航按钮，但未找到目标按钮'{}'", found_elements.len(), config.target_button)
        };

        Ok(ElementFinderResult {
            success,
            message,
            found_elements: Some(found_elements),
            target_element,
        })
    }

    /// 解析导航区域内的元素
    fn parse_navigation_elements(&self, ui_xml: &str, screen_size: (i32, i32), region: &PositionRatio) -> Result<Vec<UIElement>, String> {
        let mut elements = Vec::new();
        
        println!("🔍 开始解析导航元素，屏幕尺寸: {:?}, 区域: {:?}", screen_size, region);
        
        // 计算实际区域范围
        let (screen_width, screen_height) = screen_size;
        let region_y1 = (region.y_start * screen_height as f64) as i32;
        let region_y2 = (region.y_end * screen_height as f64) as i32;
        println!("📍 目标区域Y范围: {} - {}", region_y1, region_y2);
        
        // 处理单行XML格式 - 将所有node标签分离
        let mut xml_nodes = Vec::new();
        let mut current_pos = 0;
        
        while let Some(start) = ui_xml[current_pos..].find("<node ") {
            let absolute_start = current_pos + start;
            // 查找对应的结束标签
            let mut bracket_count = 0;
            let mut end_pos = absolute_start;
            let mut in_quotes = false;
            let mut escape_next = false;
            
            for (i, ch) in ui_xml[absolute_start..].char_indices() {
                let abs_i = absolute_start + i;
                
                if escape_next {
                    escape_next = false;
                    continue;
                }
                
                match ch {
                    '\\' => escape_next = true,
                    '"' => in_quotes = !in_quotes,
                    '<' if !in_quotes => bracket_count += 1,
                    '>' if !in_quotes => {
                        bracket_count -= 1;
                        if bracket_count == 0 {
                            end_pos = abs_i + 1;
                            break;
                        }
                    },
                    _ => {}
                }
            }
            
            if end_pos > absolute_start {
                let node_xml = &ui_xml[absolute_start..end_pos];
                xml_nodes.push(node_xml);
                current_pos = end_pos;
            } else {
                // 如果没找到结束，跳过这个开始位置
                current_pos = absolute_start + 5;
            }
        }
        
        println!("🔍 分离得到 {} 个XML节点", xml_nodes.len());
        
        // 解析每个节点
        for node_xml in &xml_nodes {
            if let Some(element) = self.parse_ui_element_from_line(node_xml) {
                if Self::is_in_region(&element.bounds, screen_size, region) {
                    println!("✅ 找到区域内元素: text='{}', desc='{}', bounds='{}', clickable={}", 
                        element.text, element.content_desc, element.bounds, element.clickable);
                    elements.push(element);
                } else {
                    // 如果有文本内容，但不在区域内，也打印出来用于调试
                    if !element.text.is_empty() || !element.content_desc.is_empty() {
                        if let Ok(((_, y1), (_, y2))) = Self::parse_bounds(&element.bounds) {
                            let center_y = (y1 + y2) / 2;
                            if center_y > region_y1 - 200 && center_y < region_y2 + 200 {
                                println!("⚠️ 区域外相关元素: text='{}', desc='{}', bounds='{}', center_y={}, clickable={}", 
                                    element.text, element.content_desc, element.bounds, center_y, element.clickable);
                            }
                        }
                    }
                }
            }
        }

        println!("📊 解析完成，找到 {} 个区域内元素", elements.len());
        Ok(elements)
    }

    /// 从XML行解析UI元素
    fn parse_ui_element_from_line(&self, line: &str) -> Option<UIElement> {
        let get_attribute = |line: &str, attr: &str| -> String {
            if let Some(start) = line.find(&format!("{}=\"", attr)) {
                let start = start + attr.len() + 2;
                if let Some(end) = line[start..].find("\"") {
                    return line[start..start + end].to_string();
                }
            }
            String::new()
        };

        let text = get_attribute(line, "text");
        let content_desc = get_attribute(line, "content-desc");
        let bounds = get_attribute(line, "bounds");
        let clickable = get_attribute(line, "clickable") == "true";

        // 只要有bounds就认为是有效元素
        if !bounds.is_empty() {
            Some(UIElement {
                text,
                content_desc,
                bounds,
                clickable,
            })
        } else {
            None
        }
    }

    /// 检查是否为导航按钮
    fn is_navigation_button(&self, element: &UIElement, patterns: &[String]) -> bool {
        // 首先输出调试信息
        println!("🔍 检查导航按钮: text='{}' desc='{}' clickable={} patterns={:?}", 
            element.text, element.content_desc, element.clickable, patterns);

        if patterns.is_empty() {
            // 如果没有指定模式，检查是否为常见的导航按钮
            // 只要是可点击的，就认为是潜在的导航元素
            let has_any_identifier = !element.text.is_empty() || !element.content_desc.is_empty();
            let is_clickable = element.clickable;
            
            let is_nav = is_clickable && has_any_identifier;
            
            if is_nav {
                println!("✅ 识别为导航按钮: text='{}' desc='{}' clickable={}", 
                    element.text, element.content_desc, is_clickable);
            }
            
            return is_nav;
        }

        // 检查是否匹配指定的模式
        for pattern in patterns {
            let text_match = element.text.contains(pattern);
            let desc_match = element.content_desc.contains(pattern);
            
            if text_match || desc_match {
                println!("🎯 匹配导航模式 '{}': text='{}' desc='{}' text_match={} desc_match={}", 
                    pattern, element.text, element.content_desc, text_match, desc_match);
                return true;
            }
        }
        
        println!("❌ 未匹配任何导航模式");
        false
    }

    /// 检查是否为目标按钮
    fn is_target_button(&self, element: &UIElement, target: &str) -> bool {
        let result = element.text.contains(target) || element.content_desc.contains(target);
        println!("🔍 检查目标按钮 '{}' vs 元素 text:'{}' desc:'{}' -> {}", 
            target, element.text, element.content_desc, result);
        result
    }

    /// 点击检测到的元素
    pub async fn click_detected_element(&self, device_id: &str, element: DetectedElement, click_type: &str) -> Result<ClickResult, String> {
        let (x, y) = element.position;
        
        let command = match click_type {
            "single_tap" => format!("shell input tap {} {}", x, y),
            "double_tap" => format!("shell input tap {} {} && sleep 0.1 && input tap {} {}", x, y, x, y),
            "long_press" => format!("shell input swipe {} {} {} {} 1000", x, y, x, y), // 长按1秒
            _ => format!("shell input tap {} {}", x, y),
        };

        match self.adb_service.execute_adb_command(device_id, &command).await {
            Ok(_) => Ok(ClickResult {
                success: true,
                message: format!("成功点击元素 '{}' 在位置 ({}, {})", element.text, x, y),
            }),
            Err(e) => Ok(ClickResult {
                success: false,
                message: format!("点击失败: {}", e),
            }),
        }
    }
}

#[derive(Debug, Clone)]
struct UIElement {
    text: String,
    content_desc: String,
    bounds: String,
    clickable: bool,
}

// Tauri command 接口
#[command]
pub async fn smart_element_finder(
    device_id: String,
    config: NavigationBarConfig,
    adb_service: tauri::State<'_, std::sync::Mutex<AdbService>>,
) -> Result<ElementFinderResult, String> {
    let service = {
        let lock = adb_service.lock().map_err(|e| e.to_string())?;
        lock.clone()
    };
    let finder_service = SmartElementFinderService::new(service);
    finder_service.smart_element_finder(&device_id, config).await
}

#[command]
pub async fn click_detected_element(
    device_id: String,
    element: DetectedElement,
    click_type: String,
    adb_service: tauri::State<'_, std::sync::Mutex<AdbService>>,
) -> Result<ClickResult, String> {
    let service = {
        let lock = adb_service.lock().map_err(|e| e.to_string())?;
        lock.clone()
    };
    let finder_service = SmartElementFinderService::new(service);
    finder_service.click_detected_element(&device_id, element, &click_type).await
}