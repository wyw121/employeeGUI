use crate::services::adb_service::core::AdbService;
use crate::types::page_analysis::*;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};
use regex::Regex;
use std::time::{SystemTime, UNIX_EPOCH};

/// 页面分析服务
/// 独立实现 XML 解析功能，专门用于页面元素分析
pub struct PageAnalyzerService {
    /// ADB 服务
    adb_service: Arc<AdbService>,
    /// 页面类型识别缓存
    page_type_cache: Arc<Mutex<HashMap<String, PageType>>>,
    /// 元素去重缓存
    deduplication_cache: Arc<Mutex<HashMap<String, Vec<ActionableElement>>>>,
}

impl PageAnalyzerService {
    /// 创建新的页面分析服务实例
    pub fn new() -> Self {
        Self {
            adb_service: Arc::new(AdbService::new()),
            page_type_cache: Arc::new(Mutex::new(HashMap::new())),
            deduplication_cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 分析当前页面，返回完整的分析结果
    pub async fn analyze_current_page(
        &self, 
        device_id: &str, 
        config: Option<PageAnalysisConfig>
    ) -> Result<PageAnalysisResult> {
        let config = config.unwrap_or_default();
        
        println!("🔍 开始分析页面，设备ID: {}", device_id);
        
        // 1. 获取 UI 层次结构 XML
        let xml_content = match self.get_ui_hierarchy_xml(device_id).await {
            Ok(xml) => xml,
            Err(e) => {
                return Ok(PageAnalysisResult {
                    page_info: self.create_default_page_info(),
                    actionable_elements: vec![],
                    element_statistics: ElementStatistics {
                        total_elements: 0,
                        unique_elements: 0,
                        type_counts: HashMap::new(),
                        group_counts: HashMap::new(),
                    },
                    success: false,
                    error_message: Some(format!("获取UI层次结构失败: {}", e)),
                });
            }
        };

        // 2. 分析页面基本信息
        let page_info = if config.analyze_page_type {
            self.analyze_page_info(&xml_content, device_id).await?
        } else {
            self.create_default_page_info()
        };

        // 3. 提取所有可操作元素
        let all_elements = self.extract_actionable_elements(&xml_content, &config).await?;
        
        // 4. 元素去重处理
        let deduplicated_elements = if config.enable_deduplication {
            self.deduplicate_elements(all_elements).await?
        } else {
            all_elements
        };

        // 5. 计算元素统计信息
        let statistics = self.calculate_element_statistics(&deduplicated_elements);

        println!("✅ 页面分析完成，找到 {} 个可操作元素", deduplicated_elements.len());

        Ok(PageAnalysisResult {
            page_info,
            actionable_elements: deduplicated_elements,
            element_statistics: statistics,
            success: true,
            error_message: None,
        })
    }

    /// 获取 UI 层次结构 XML
    async fn get_ui_hierarchy_xml(&self, device_id: &str) -> Result<String> {
        self.adb_service.dump_ui_hierarchy(device_id).await
            .map_err(|e| anyhow!("获取UI层次结构失败: {}", e))
    }

    /// 分析页面信息
    async fn analyze_page_info(&self, xml_content: &str, device_id: &str) -> Result<PageInfo> {
        let start_time = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let page_type = self.identify_page_type(xml_content);
        let (app_package, activity_name) = self.get_current_app_info(device_id).await
            .unwrap_or_else(|_| ("unknown.app".to_string(), "UnknownActivity".to_string()));

        Ok(PageInfo {
            page_name: format!("{}页面", app_package),
            app_package,
            activity_name,
            page_type,
            page_title: Some(self.extract_page_title(xml_content)),
            analysis_timestamp: start_time,
        })
    }

    /// 获取当前应用信息
    async fn get_current_app_info(&self, device_id: &str) -> Result<(String, String)> {
        // 获取当前 Activity 信息
        let output = self.adb_service.execute_adb_command(
            device_id, 
            "shell dumpsys activity activities | grep -E \"mResumedActivity|mFocusedActivity\" | head -1"
        ).await.map_err(|e| anyhow!("获取Activity信息失败: {}", e))?;

        // 解析包名和 Activity 名
        if let Some(captures) = Regex::new(r"ActivityRecord\{[^}]+ ([^/]+)/([^}]+)")
            .unwrap()
            .captures(&output) 
        {
            let package_name = captures.get(1).unwrap().as_str().to_string();
            let activity_name = captures.get(2).unwrap().as_str().to_string();
            return Ok((package_name, activity_name));
        }

        // 备用方法：获取前台应用包名
        let package_output = self.adb_service.execute_adb_command(
            device_id,
            "shell dumpsys window | grep -E \"mCurrentFocus\" | head -1"
        ).await.map_err(|e| anyhow!("获取窗口信息失败: {}", e))?;

        if let Some(captures) = Regex::new(r"mCurrentFocus=Window\{[^}]+ ([^/]+)/")
            .unwrap()
            .captures(&package_output)
        {
            let package_name = captures.get(1).unwrap().as_str().to_string();
            return Ok((package_name, "主页面".to_string()));
        }

        Ok(("未知应用".to_string(), "未知页面".to_string()))
    }

    /// 提取可操作元素（独立 XML 解析）
    async fn extract_actionable_elements(
        &self, 
        xml_content: &str, 
        config: &PageAnalysisConfig
    ) -> Result<Vec<ActionableElement>> {
        let mut actionable_elements = Vec::new();
        let mut element_counter = 0;

        // 使用正则表达式解析单行压缩 XML
        let element_regex = Regex::new(
            r#"<(\w+)[^>]*?(?:text="([^"]*)")?[^>]*?(?:content-desc="([^"]*)")?[^>]*?(?:resource-id="([^"]*)")?[^>]*?(?:class="([^"]*)")?[^>]*?(?:clickable="([^"]*)")?[^>]*?(?:bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]")?[^>]*?/?>"#
        ).map_err(|e| anyhow!("正则表达式错误: {}", e))?;

        for cap in element_regex.captures_iter(xml_content) {
            // 提取元素属性
            let node_name = cap.get(1).map(|m| m.as_str().to_string()).unwrap_or_default();
            let text = cap.get(2).map(|m| m.as_str().to_string()).unwrap_or_default();
            let content_desc = cap.get(3).map(|m| m.as_str().to_string()).unwrap_or_default();
            let resource_id = cap.get(4).map(|m| m.as_str().to_string()).unwrap_or_default();
            let class_name = cap.get(5).map(|m| m.as_str().to_string()).unwrap_or_default();
            let clickable = cap.get(6).map(|m| m.as_str() == "true").unwrap_or(false);
            
            // 解析边界
            let bounds = if let (Some(x1), Some(y1), Some(x2), Some(y2)) = (
                cap.get(7).and_then(|m| m.as_str().parse::<i32>().ok()),
                cap.get(8).and_then(|m| m.as_str().parse::<i32>().ok()),
                cap.get(9).and_then(|m| m.as_str().parse::<i32>().ok()),
                cap.get(10).and_then(|m| m.as_str().parse::<i32>().ok())
            ) {
                (x1, y1, x2, y2)
            } else {
                continue; // 跳过没有边界的元素
            };

            // 过滤元素
            if !self.should_include_parsed_element(&node_name, &text, &content_desc, bounds, clickable, config) {
                continue;
            }

            // 创建 ActionableElement
            let element_text = if !text.is_empty() { text.clone() } else { content_desc.clone() };
            let actionable_element = ActionableElement {
                id: format!("element_{}", element_counter),
                text: element_text,
                element_type: self.determine_element_type(&node_name, &text, &content_desc, &resource_id, &class_name),
                bounds: ElementBounds {
                    left: bounds.0,
                    top: bounds.1,
                    right: bounds.2,
                    bottom: bounds.3,
                },
                resource_id: if !resource_id.is_empty() { Some(resource_id.clone()) } else { None },
                class_name: class_name.clone(),
                is_clickable: clickable,
                is_editable: node_name.eq_ignore_ascii_case("edittext"),
                is_enabled: true, // 假设元素是启用的，可以通过其他属性判断
                is_scrollable: false, // 需要从更多属性中判断
                supported_actions: self.determine_possible_actions(&node_name, clickable),
                group_info: ElementGroupInfo {
                    group_key: format!("{}_{}", node_name, class_name),
                    group_type: ElementGroupType::Individual,
                    group_index: 0,
                    group_total: 1,
                    is_representative: true,
                },
                description: format!("{} - {}", node_name, if !text.is_empty() { &text } else { "无文本" }),
            };
            
            actionable_elements.push(actionable_element);
            element_counter += 1;
        }

        println!("📋 提取到 {} 个候选可操作元素", actionable_elements.len());
        Ok(actionable_elements)
    }

    /// 判断是否应该包含解析后的元素
    fn should_include_parsed_element(
        &self,
        node_name: &str,
        text: &str, 
        content_desc: &str,
        bounds: (i32, i32, i32, i32),
        clickable: bool,
        config: &PageAnalysisConfig
    ) -> bool {
        // 检查元素尺寸
        let width = bounds.2 - bounds.0;
        let height = bounds.3 - bounds.1;
        if width < config.min_element_size.0 || height < config.min_element_size.1 {
            return false;
        }

        // 检查文本长度
        let effective_text = if !text.is_empty() { text } else { content_desc };
        if !effective_text.is_empty() && effective_text.len() < config.min_text_length {
            return false;
        }

        // 检查是否可交互（目前只检查 clickable，可以扩展）
        if !clickable {
            return false;
        }

        true
    }

    /// 确定元素类型
    fn determine_element_type(
        &self,
        node_name: &str,
        text: &str,
        content_desc: &str,
        resource_id: &str,
        class_name: &str,
    ) -> ElementType {
        let class_lower = class_name.to_lowercase();
        let text_lower = text.to_lowercase();
        let desc_lower = content_desc.to_lowercase();

        if class_lower.contains("button") || node_name.eq_ignore_ascii_case("button") {
            ElementType::Button
        } else if class_lower.contains("edittext") || node_name.eq_ignore_ascii_case("edittext") {
            ElementType::EditText
        } else if class_lower.contains("imageview") || class_lower.contains("imagebutton") {
            ElementType::ImageView
        } else if class_lower.contains("textview") && (text_lower.contains("点击") || desc_lower.contains("点击")) {
            ElementType::TextView
        } else if class_lower.contains("checkbox") {
            ElementType::CheckBox
        } else if class_lower.contains("switch") {
            ElementType::Switch
        } else if class_lower.contains("tab") {
            ElementType::Tab
        } else {
            ElementType::Other(class_name.to_string())
        }
    }

    /// 确定可能的操作
    fn determine_possible_actions(&self, node_name: &str, clickable: bool) -> Vec<ElementAction> {
        let mut actions = vec![];
        
        if clickable {
            actions.push(ElementAction::Click);
        }
        
        if node_name.eq_ignore_ascii_case("edittext") {
            actions.push(ElementAction::InputText("".to_string()));
        }
        
        // 可以根据需要添加更多操作类型
        actions
    }

    /// 识别页面类型
    fn identify_page_type(&self, xml_content: &str) -> PageType {
        // 简单的页面类型识别逻辑
        if xml_content.contains("登录") || xml_content.contains("login") {
            PageType::Login
        } else if xml_content.contains("设置") || xml_content.contains("setting") {
            PageType::Settings
        } else if xml_content.contains("消息") || xml_content.contains("message") {
            PageType::Messages
        } else if xml_content.contains("详情") || xml_content.contains("detail") {
            PageType::Detail
        } else {
            PageType::Unknown("未识别页面类型".to_string())
        }
    }

    /// 提取页面标题
    fn extract_page_title(&self, xml_content: &str) -> String {
        // 尝试从常见的标题元素中提取标题
        let title_regex = Regex::new(r#"<[^>]*?text="([^"]*)"[^>]*?(?:id="[^"]*title[^"]*"|class="[^"]*title[^"]*")[^>]*/?>"#).unwrap();
        
        if let Some(captures) = title_regex.captures(xml_content) {
            captures.get(1).unwrap().as_str().to_string()
        } else {
            "未知页面".to_string()
        }
    }

    /// 创建默认页面信息
    fn create_default_page_info(&self) -> PageInfo {
        PageInfo {
            page_name: "未知页面".to_string(),
            app_package: "unknown.app".to_string(),
            activity_name: "UnknownActivity".to_string(),
            page_type: PageType::Unknown("默认页面".to_string()),
            page_title: Some("未知页面".to_string()),
            analysis_timestamp: SystemTime::now().duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        }
    }

    /// 元素去重
    async fn deduplicate_elements(&self, elements: Vec<ActionableElement>) -> Result<Vec<ActionableElement>> {
        // 简单去重：基于文本和位置
        let mut seen = std::collections::HashSet::new();
        let mut deduplicated = Vec::new();

        for element in elements {
            let key = format!("{}_{}", element.text, element.bounds.center_x());
            if seen.insert(key) {
                deduplicated.push(element);
            }
        }

        println!("🔄 去重完成，保留 {} 个元素", deduplicated.len());
        Ok(deduplicated)
    }

    /// 计算元素统计信息
    fn calculate_element_statistics(&self, elements: &[ActionableElement]) -> ElementStatistics {
        let mut type_counts = HashMap::new();
        
        for element in elements {
            let type_name = format!("{:?}", element.element_type);
            *type_counts.entry(type_name).or_insert(0) += 1;
        }

        ElementStatistics {
            total_elements: elements.len(),
            unique_elements: elements.len(), // 去重后的都是唯一的
            type_counts,
            group_counts: HashMap::new(), // 暂时不统计分组
        }
    }
}

impl Default for PageAnalyzerService {
    fn default() -> Self {
        Self::new()
    }
}