/**
 * Universal UI 页面分析器
 * 增强的XML解析和元素分类功能
 * 基于SmartElementFinderService的智能分类逻辑
 */

use std::collections::HashMap;
use quick_xml::{Reader, events::Event};
use serde::{Deserialize, Serialize};
use anyhow::Result as AnyResult;
use tracing::{info, warn, error};
use crate::types::page_analysis::ElementBounds;
use crate::screenshot_service::ScreenshotService;

#[derive(Debug, Serialize)]
pub struct UniversalPageCaptureResult {
    pub xml_content: String,
    pub xml_file_name: String,
    pub xml_relative_path: String,
    pub xml_absolute_path: String,
    pub screenshot_file_name: Option<String>,
    pub screenshot_relative_path: Option<String>,
    pub screenshot_absolute_path: Option<String>,
}

/// UI元素结构（增强版）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIElement {
    pub id: String,
    pub element_type: String,
    pub text: String,
    pub content_desc: String,
    pub resource_id: Option<String>,
    pub class_name: String,
    pub bounds: ElementBounds,
    pub is_clickable: bool,
    pub is_scrollable: bool,
    pub is_enabled: bool,
    pub is_focused: bool,
    pub is_selected: bool,
    pub children: Vec<UIElement>,
    pub parent: Option<String>,
    pub depth: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageAnalysisResult {
    pub page_type: String,
    pub package_name: String,
    pub activity_name: String,
    pub total_elements: usize,
    pub interactive_elements: usize,
    pub navigation_elements: Vec<UIElement>,
    pub unique_elements: Vec<UIElement>,
    pub element_groups: HashMap<String, Vec<UIElement>>,
    pub analysis_time_ms: u128,
}

pub struct UniversalUIPageAnalyzer {
    navigation_patterns: HashMap<String, Vec<String>>,
}

impl Default for UniversalUIPageAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

impl UniversalUIPageAnalyzer {
    pub fn new() -> Self {
        let mut navigation_patterns = HashMap::new();
        
        // 小红书导航模式
        navigation_patterns.insert(
            "com.xingin.xhs".to_string(),
            vec!["首页".to_string(), "发现".to_string(), "发布".to_string(), "消息".to_string(), "我".to_string()]
        );
        
        // 微信导航模式
        navigation_patterns.insert(
            "com.tencent.mm".to_string(),
            vec!["微信".to_string(), "通讯录".to_string(), "发现".to_string(), "我".to_string()]
        );
        
        Self {
            navigation_patterns,
        }
    }

    /// 分析页面XML内容
    pub fn analyze_page(&self, xml_content: &str, package_name: &str, activity_name: &str) -> AnyResult<PageAnalysisResult> {
        let start_time = std::time::Instant::now();
        
        info!("🔍 开始分析页面: {} - {}", package_name, activity_name);
        
        // 1. 解析XML元素
        let elements = self.parse_xml_elements(xml_content)?;
        
        // 2. 过滤交互元素
        let interactive_elements = self.filter_interactive_elements(&elements);
        
        // 3. 识别导航元素
        let navigation_elements = self.identify_navigation_elements(&interactive_elements, package_name);
        
        // 4. 去重和分组
        let (unique_elements, element_groups) = self.deduplicate_and_group_elements(&interactive_elements);
        
        let analysis_time_ms = start_time.elapsed().as_millis();
        
        let result = PageAnalysisResult {
            page_type: self.identify_page_type(xml_content, package_name),
            package_name: package_name.to_string(),
            activity_name: activity_name.to_string(),
            total_elements: elements.len(),
            interactive_elements: interactive_elements.len(),
            navigation_elements,
            unique_elements,
            element_groups,
            analysis_time_ms,
        };
        
        info!("✅ 页面分析完成，耗时: {}ms", analysis_time_ms);
        Ok(result)
    }

    /// 解析XML内容，提取UI元素（增强版）
    fn parse_xml_elements(&self, xml_content: &str) -> AnyResult<Vec<UIElement>> {
        let mut elements = Vec::new();
        let mut reader = Reader::from_str(xml_content);
        reader.config_mut().trim_text(true);
        
        let mut buf = Vec::new();
        let mut current_depth = 0;
        let mut id_counter = 0;
        
        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) => {
                    current_depth += 1;
                    
                    if e.name().as_ref() == b"node" {
                        id_counter += 1;
                        let element_id = format!("element_{}", id_counter);
                        
                        if let Ok(mut element) = self.parse_node_attributes(e, &element_id, current_depth) {
                            // 应用智能分类逻辑（基于SmartElementFinderService）
                            element = self.apply_smart_classification(&element, xml_content);
                            
                            // 只保留有价值的元素
                            if self.is_valuable_element(&element) {
                                elements.push(element);
                            }
                        }
                    }
                }
                Ok(Event::End(_)) => {
                    current_depth -= 1;
                }
                Ok(Event::Eof) => break,
                Err(e) => {
                    error!("XML解析错误: {}", e);
                    break;
                }
                _ => {}
            }
            buf.clear();
        }
        
        // 应用后处理：排序和优化
        let processed_elements = self.post_process_elements(elements);
        
        info!("✅ XML解析完成，提取到 {} 个有价值的UI元素", processed_elements.len());
        Ok(processed_elements)
    }

    /// 解析节点属性
    fn parse_node_attributes(&self, element: &quick_xml::events::BytesStart, element_id: &str, depth: u32) -> AnyResult<UIElement> {
        let mut text = String::new();
        let mut resource_id = None;
        let mut class_name = String::new();
        let mut content_desc = String::new();
        let mut bounds = ElementBounds { left: 0, top: 0, right: 0, bottom: 0 };
        let mut is_clickable = false;
        let mut is_scrollable = false;
        let mut is_enabled = true;
        let mut is_focused = false;
        let mut is_selected = false;
        
        for attr in element.attributes() {
            if let Ok(attr) = attr {
                match attr.key.as_ref() {
                    b"text" => {
                        text = String::from_utf8_lossy(&attr.value).to_string();
                    }
                    b"resource-id" => {
                        let id = String::from_utf8_lossy(&attr.value).to_string();
                        if !id.is_empty() {
                            resource_id = Some(id);
                        }
                    }
                    b"class" => {
                        class_name = String::from_utf8_lossy(&attr.value).to_string();
                    }
                    b"content-desc" => {
                        content_desc = String::from_utf8_lossy(&attr.value).to_string();
                    }
                    b"bounds" => {
                        if let Some(parsed_bounds) = self.parse_bounds(&String::from_utf8_lossy(&attr.value)) {
                            bounds = parsed_bounds;
                        }
                    }
                    b"clickable" => {
                        is_clickable = String::from_utf8_lossy(&attr.value) == "true";
                    }
                    b"scrollable" => {
                        is_scrollable = String::from_utf8_lossy(&attr.value) == "true";
                    }
                    b"enabled" => {
                        is_enabled = String::from_utf8_lossy(&attr.value) == "true";
                    }
                    b"focused" => {
                        is_focused = String::from_utf8_lossy(&attr.value) == "true";
                    }
                    b"selected" => {
                        is_selected = String::from_utf8_lossy(&attr.value) == "true";
                    }
                    _ => {}
                }
            }
        }

        // 智能分类元素类型
        let element_type = self.classify_element_type(&class_name, &text, is_clickable, &content_desc);

        Ok(UIElement {
            id: element_id.to_string(),
            element_type,
            text,
            content_desc,
            resource_id,
            class_name,
            bounds,
            is_clickable,
            is_scrollable,
            is_enabled,
            is_focused,
            is_selected,
            children: Vec::new(),
            parent: None,
            depth,
        })
    }

    /// 解析bounds字符串 "[left,top][right,bottom]"
    fn parse_bounds(&self, bounds_str: &str) -> Option<ElementBounds> {
        let bounds_str = bounds_str.trim();
        if bounds_str.starts_with('[') && bounds_str.ends_with(']') {
            let coords: Vec<&str> = bounds_str
                .trim_start_matches('[')
                .trim_end_matches(']')
                .split("][")
                .collect();
            
            if coords.len() == 2 {
                let left_top: Vec<&str> = coords[0].split(',').collect();
                let right_bottom: Vec<&str> = coords[1].split(',').collect();
                
                if left_top.len() == 2 && right_bottom.len() == 2 {
                    if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                        left_top[0].parse::<i32>(),
                        left_top[1].parse::<i32>(),
                        right_bottom[0].parse::<i32>(),
                        right_bottom[1].parse::<i32>(),
                    ) {
                        return Some(ElementBounds { left, top, right, bottom });
                    }
                }
            }
        }
        None
    }

    /// 智能分类元素类型（基于SmartElementFinderService逻辑）
    fn classify_element_type(&self, class_name: &str, text: &str, is_clickable: bool, content_desc: &str) -> String {
        let text_lower = text.to_lowercase();
        let content_lower = content_desc.to_lowercase();
        
        // 1. 基于类名的基础分类
        let base_type = if class_name.contains("Button") {
            "button"
        } else if class_name.contains("EditText") {
            "edit_text"
        } else if class_name.contains("TextView") {
            if is_clickable { "text_button" } else { "text_view" }
        } else if class_name.contains("ImageView") || class_name.contains("ImageButton") {
            if is_clickable { "image_button" } else { "image_view" }
        } else if class_name.contains("RecyclerView") || class_name.contains("ListView") {
            "list_container"
        } else if is_clickable && !text.is_empty() {
            "clickable_text"
        } else {
            "other"
        };

        // 2. 基于内容的智能分类（参考SmartElementFinderService）
        if text_lower.contains("搜索") || content_lower.contains("搜索") || text_lower.contains("search") {
            return "search_button".to_string();
        } else if text_lower.contains("发布") || text_lower.contains("发送") || text_lower.contains("post") {
            return "action_button".to_string();
        } else if text_lower.contains("关注") || text_lower.contains("follow") {
            return "social_button".to_string();
        } else if text_lower.contains("首页") || text_lower.contains("主页") || text_lower.contains("home") {
            return "nav_home".to_string();
        } else if text_lower.contains("消息") || text_lower.contains("message") || text_lower.contains("通知") {
            return "nav_message".to_string();
        } else if text_lower.contains("我") || text_lower.contains("个人") || text_lower.contains("profile") {
            return "nav_profile".to_string();
        } else if text_lower.contains("发现") || text_lower.contains("discover") {
            return "nav_discover".to_string();
        }

        base_type.to_string()
    }

    /// 应用智能分类（基于SmartElementFinderService的区域和内容分析）
    fn apply_smart_classification(&self, element: &UIElement, _xml_content: &str) -> UIElement {
        let mut enhanced = element.clone();
        
        // 根据Y坐标判断区域
        let y_position = element.bounds.top;
        
        // 区域分类
        let region = if y_position < 200 {
            "header"
        } else if y_position > 1600 {
            "footer"
        } else {
            "content"
        };

        // 增强元素类型
        enhanced.element_type = match enhanced.element_type.as_str() {
            t if t.starts_with("nav_") => t.to_string(), // 导航元素保持原样
            t if t.starts_with("search_") => t.to_string(), // 搜索元素保持原样
            t if t.starts_with("action_") => t.to_string(), // 操作元素保持原样
            t if t.starts_with("social_") => t.to_string(), // 社交元素保持原样
            other => format!("{}_{}", region, other)
        };

        enhanced
    }

    /// 检查是否是有价值的元素（过滤装饰性元素）
    fn is_valuable_element(&self, element: &UIElement) -> bool {
        // 过滤太小的元素
        if element.bounds.width() < 10 || element.bounds.height() < 10 {
            return false;
        }
        
        // 保留有意义的元素
        element.is_clickable 
            || element.is_scrollable 
            || !element.text.trim().is_empty()
            || !element.content_desc.trim().is_empty()
            || element.element_type.contains("edit_text")
    }

    /// 后处理元素：排序和优化
    fn post_process_elements(&self, mut elements: Vec<UIElement>) -> Vec<UIElement> {
        // 按页面层次结构排序
        elements.sort_by(|a, b| {
            // 首先按Y坐标排序（从上到下）
            a.bounds.top.cmp(&b.bounds.top)
                .then_with(|| a.bounds.left.cmp(&b.bounds.left))
                // 然后按元素重要性排序
                .then_with(|| {
                    let priority_b = self.get_element_priority(&b.element_type);
                    let priority_a = self.get_element_priority(&a.element_type);
                    priority_b.cmp(&priority_a)
                })
        });
        
        elements
    }

    /// 获取元素优先级（用于排序）
    fn get_element_priority(&self, element_type: &str) -> u32 {
        match element_type {
            t if t.contains("search") => 10,
            t if t.contains("nav_") => 9,
            t if t.contains("action_") => 8,
            t if t.contains("social_") => 7,
            t if t.contains("button") => 6,
            t if t.contains("edit_text") => 5,
            t if t.contains("clickable") => 4,
            t if t.contains("text") => 3,
            t if t.contains("image") => 2,
            _ => 1
        }
    }

    /// 过滤交互元素
    fn filter_interactive_elements(&self, elements: &[UIElement]) -> Vec<UIElement> {
        elements
            .iter()
            .filter(|e| {
                // 可点击，或者有文本内容，或者是输入框
                e.is_clickable 
                || !e.text.trim().is_empty() 
                || e.element_type == "edit_text"
                || e.is_scrollable
            })
            .filter(|e| {
                // 过滤掉太小的元素（可能是装饰性元素）
                e.bounds.width() > 20 && e.bounds.height() > 20
            })
            .cloned()
            .collect()
    }

    /// 识别导航元素
    fn identify_navigation_elements(&self, elements: &[UIElement], package_name: &str) -> Vec<UIElement> {
        let mut nav_elements = Vec::new();
        
        // 获取该应用的导航模式
        if let Some(nav_patterns) = self.navigation_patterns.get(package_name) {
            for element in elements {
                for pattern in nav_patterns {
                    if (element.text.contains(pattern) || element.content_desc.contains(pattern)) && element.is_clickable {
                        // 检查是否在底部区域（可能是底部导航栏）
                        if element.bounds.top > 1500 {
                            nav_elements.push(element.clone());
                            break;
                        }
                    }
                }
            }
        }
        
        // 如果没找到预定义的导航，尝试识别常见导航模式
        if nav_elements.is_empty() {
            nav_elements = elements
                .iter()
                .filter(|e| {
                    e.is_clickable && 
                    e.bounds.top > 1500 && // 底部区域
                    (!e.text.trim().is_empty() || !e.content_desc.trim().is_empty())
                })
                .cloned()
                .collect();
        }
        
        nav_elements
    }

    /// 去重和分组元素
    pub fn deduplicate_and_group_elements(&self, elements: &[UIElement]) -> (Vec<UIElement>, HashMap<String, Vec<UIElement>>) {
        let mut unique_elements = Vec::new();
        let mut element_groups: HashMap<String, Vec<UIElement>> = HashMap::new();
        let mut seen_signatures = std::collections::HashSet::new();

        for element in elements {
            // 创建元素签名用于去重
            let signature = format!("{}_{}_{}_{}", 
                element.element_type, 
                element.text, 
                element.bounds.left, 
                element.bounds.top
            );

            if seen_signatures.insert(signature) {
                // 按类型分组
                element_groups
                    .entry(element.element_type.clone())
                    .or_insert_with(Vec::new)
                    .push(element.clone());

                unique_elements.push(element.clone());
            }
        }

        (unique_elements, element_groups)
    }

    /// 识别页面类型
    fn identify_page_type(&self, xml_content: &str, package_name: &str) -> String {
        if package_name.contains("xhs") {
            if xml_content.contains("发现") && xml_content.contains("首页") {
                "xiaohongshu_main".to_string()
            } else if xml_content.contains("搜索") {
                "xiaohongshu_search".to_string()
            } else {
                "xiaohongshu_other".to_string()
            }
        } else if package_name.contains("tencent.mm") {
            "wechat".to_string()
        } else {
            "unknown".to_string()
        }
    }
}

// ==================== Tauri Commands ====================

/// 分析Universal UI页面
#[tauri::command]
pub async fn analyze_universal_ui_page(
    device_id: String,
) -> Result<UniversalPageCaptureResult, String> {
    use crate::xml_judgment_service::XmlJudgmentService;
    use std::fs;
    use chrono::Utc;
    
    info!("🔍 开始分析页面，设备ID: {}", device_id);
    
    // 获取设备当前UI的XML结构
    match XmlJudgmentService::get_ui_xml(&device_id).await {
        Ok(xml_content) => {
            info!("✅ 成功获取XML内容，长度: {}", xml_content.len());
            
            // 保存XML到本地文件用于调试分析  
            let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
            let filename = format!("ui_dump_{}_{}.xml", device_id, timestamp);
            
            // 保存到项目根目录的debug_xml文件夹，避免触发Tauri重新编译
            let project_root = std::env::current_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."))
                .parent()
                .unwrap_or_else(|| std::path::Path::new(".."))
                .to_path_buf();
            let debug_dir = project_root.join("debug_xml");
            let filepath = debug_dir.join(&filename);
            
            // 确保debug_xml目录存在
            if let Err(e) = fs::create_dir_all(&debug_dir) {
                warn!("创建debug_xml目录失败: {}", e);
            }
            
            // 保存XML文件
            let mut xml_absolute_path = filepath.to_string_lossy().to_string();
            match fs::write(&filepath, &xml_content) {
                Ok(_) => {
                    info!("📄 XML已保存到: {}", filepath.display());
                    if let Ok(canonical) = filepath.canonicalize() {
                        xml_absolute_path = canonical.to_string_lossy().to_string();
                    }
                },
                Err(e) => {
                    warn!("保存XML文件失败: {}", e);
                }
            }

            // 捕获截图并与XML同步命名
            let screenshot_filename = format!("ui_dump_{}_{}.png", device_id, timestamp);
            let screenshot_path = debug_dir.join(&screenshot_filename);
            let (screenshot_relative_path, screenshot_absolute_path) = match ScreenshotService::capture_screenshot_to_path(&device_id, &screenshot_path) {
                Ok(path) => {
                    let relative = screenshot_filename.clone();
                    (Some(relative), Some(path.to_string_lossy().to_string()))
                }
                Err(err) => {
                    warn!("截图捕获失败，将继续返回XML: {}", err);
                    (None, None)
                }
            };

            let result = UniversalPageCaptureResult {
                xml_relative_path: filename.clone(),
                xml_absolute_path,
                xml_content,
                xml_file_name: filename,
                screenshot_file_name: screenshot_relative_path.clone(),
                screenshot_relative_path,
                screenshot_absolute_path,
            };

            Ok(result)
        },
        Err(e) => {
            error!("❌ 获取设备UI XML失败: {}", e);
            Err(format!("获取设备UI XML失败: {}", e))
        }
    }
}

/// 提取页面元素 - 统一智能解析器
#[tauri::command]
pub async fn extract_page_elements(
    xml_content: String,
) -> Result<Vec<UIElement>, String> {
    info!("🔍 开始提取页面元素，XML长度: {}", xml_content.len());
    
    let analyzer = UniversalUIPageAnalyzer::new();
    
    match analyzer.parse_xml_elements(&xml_content) {
        Ok(elements) => {
            info!("✅ 成功提取 {} 个元素", elements.len());
            Ok(elements)
        },
        Err(e) => {
            error!("❌ 提取元素失败: {}", e);
            Err(format!("提取元素失败: {}", e))
        }
    }
}

/// 分类UI元素
#[tauri::command]
pub async fn classify_ui_elements(
    elements: Vec<UIElement>,
) -> Result<HashMap<String, Vec<UIElement>>, String> {
    let mut classified: HashMap<String, Vec<UIElement>> = HashMap::new();
    
    for element in elements {
        let category = element.element_type.clone();
        classified.entry(category).or_insert_with(Vec::new).push(element);
    }
    
    Ok(classified)
}

/// 去重元素
#[tauri::command]
pub async fn deduplicate_elements(
    elements: Vec<UIElement>,
) -> Result<Vec<UIElement>, String> {
    let analyzer = UniversalUIPageAnalyzer::new();
    
    let (deduplicated, _groups) = analyzer.deduplicate_and_group_elements(&elements);
    Ok(deduplicated)
}

/// 识别页面类型
#[tauri::command]
pub async fn identify_page_type(
    xml_content: String,
    app_package: String,
) -> Result<String, String> {
    let analyzer = UniversalUIPageAnalyzer::new();
    
    let page_type = analyzer.identify_page_type(&xml_content, &app_package);
    Ok(page_type)
}