use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use regex::Regex;
use std::process::Output;
use crate::utils::adb_utils::execute_adb_command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct XmlElement {
    pub tag: String,
    pub attributes: HashMap<String, String>,
    pub text: Option<String>,
    pub children: Vec<XmlElement>,
    pub bounds: Option<(i32, i32, i32, i32)>, // (left, top, right, bottom)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct XmlCondition {
    pub condition_type: String, // "exists", "text_contains", "attribute_equals", etc.
    pub selector: String,        // CSS-like selector
    pub value: Option<String>,   // Expected value for comparison
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct XmlJudgmentResult {
    pub success: bool,
    pub matched: bool,
    pub elements: Vec<XmlElement>,
    pub error: Option<String>,
}

pub struct XmlJudgmentService;

// 添加便捷的包装函数，处理 execute_adb_command 的 Result<Output> 返回值
async fn execute_adb_with_result(args: &[&str]) -> Result<Output, String> {
    match execute_adb_command(args) {
        Ok(output) => {
            if output.status.success() {
                Ok(output)
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("ADB命令执行失败: {}", stderr))
            }
        }
        Err(e) => Err(format!("ADB命令执行错误: {}", e))
    }
}

impl XmlJudgmentService {
    /// 获取设备当前UI的XML结构
    pub async fn get_ui_xml(device_id: &str) -> Result<String, String> {
        // 先dump UI hierarchy
        match execute_adb_with_result(&["-s", device_id, "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"]).await {
            Ok(dump_result) => {
                tracing::info!("✅ uiautomator dump 执行成功: {}", String::from_utf8_lossy(&dump_result.stdout));
            }
            Err(e) => {
                tracing::error!("❌ uiautomator dump 执行失败: {}", e);
                return Err(format!("UI dump 失败: {}", e));
            }
        }

        // 等待文件生成，增加更长的等待时间
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // 先检查文件是否存在
        match execute_adb_with_result(&["-s", device_id, "shell", "ls", "-la", "/sdcard/ui_dump.xml"]).await {
            Ok(ls_result) => {
                tracing::info!("📂 文件状态: {}", String::from_utf8_lossy(&ls_result.stdout));
            }
            Err(e) => {
                tracing::warn!("⚠️  文件检查失败: {}", e);
            }
        }

        // 读取XML文件内容
        let cat_result = execute_adb_with_result(&["-s", device_id, "shell", "cat", "/sdcard/ui_dump.xml"]).await?;

        // 检查读取到的内容长度
        let xml_content = String::from_utf8_lossy(&cat_result.stdout);
        tracing::info!("📄 XML内容长度: {} bytes", xml_content.len());

        // 清理临时文件
        let _ = execute_adb_command(&["-s", device_id, "shell", "rm", "/sdcard/ui_dump.xml"]);

        Ok(xml_content.to_string())
    }

    /// 解析XML字符串为结构化数据
    #[allow(dead_code)]
    pub fn parse_xml(xml_content: &str) -> Result<XmlElement, String> {
        // 简化的XML解析实现
        // 在实际项目中建议使用 quick-xml 或其他专业XML解析库
        
        let xml_content = xml_content.trim();
        if xml_content.is_empty() {
            return Err("XML内容为空".to_string());
        }

        // 提取根节点
        if let Some(start) = xml_content.find('<') {
            if let Some(end) = xml_content.rfind('>') {
                let root_xml = &xml_content[start..=end];
                return Self::parse_element(root_xml);
            }
        }

        Err("无效的XML格式".to_string())
    }

    /// 解析单个XML元素
    fn parse_element(element_str: &str) -> Result<XmlElement, String> {
        // 简化的元素解析
        let tag_regex = Regex::new(r"<(\w+)([^>]*)>").map_err(|e| e.to_string())?;
        
        if let Some(captures) = tag_regex.captures(element_str) {
            let tag = captures.get(1).unwrap().as_str().to_string();
            let attrs_str = captures.get(2).unwrap().as_str();
            
            let attributes = Self::parse_attributes(attrs_str);
            let bounds = Self::extract_bounds(&attributes);
            
            // 提取文本内容
            let text_regex = Regex::new(&format!(r"<{}[^>]*>(.*?)</{}>", tag, tag)).map_err(|e| e.to_string())?;
            let text = text_regex.captures(element_str)
                .and_then(|cap| cap.get(1))
                .map(|m| m.as_str().trim().to_string())
                .filter(|s| !s.is_empty());

            return Ok(XmlElement {
                tag,
                attributes,
                text,
                children: vec![], // 简化实现，不递归解析子元素
                bounds,
            });
        }

        Err("无法解析XML元素".to_string())
    }

    /// 解析XML属性
    fn parse_attributes(attrs_str: &str) -> HashMap<String, String> {
        let mut attributes = HashMap::new();
        let attr_regex = Regex::new(r#"(\w+)="([^"]*)""#).unwrap();
        
        for captures in attr_regex.captures_iter(attrs_str) {
            if let (Some(key), Some(value)) = (captures.get(1), captures.get(2)) {
                attributes.insert(key.as_str().to_string(), value.as_str().to_string());
            }
        }
        
        attributes
    }

    /// 提取bounds坐标
    fn extract_bounds(attributes: &HashMap<String, String>) -> Option<(i32, i32, i32, i32)> {
        if let Some(bounds_str) = attributes.get("bounds") {
            // bounds格式: "[left,top][right,bottom]"
            let bounds_regex = Regex::new(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]").unwrap();
            if let Some(captures) = bounds_regex.captures(bounds_str) {
                let left = captures.get(1)?.as_str().parse().ok()?;
                let top = captures.get(2)?.as_str().parse().ok()?;
                let right = captures.get(3)?.as_str().parse().ok()?;
                let bottom = captures.get(4)?.as_str().parse().ok()?;
                return Some((left, top, right, bottom));
            }
        }
        None
    }

    /// 查找符合条件的UI元素
    pub async fn find_elements(device_id: &str, condition: &XmlCondition) -> Result<XmlJudgmentResult, String> {
        let xml_content = Self::get_ui_xml(device_id).await?;
        
        // 简化的元素查找实现
        let mut matched_elements = Vec::new();
        let mut matched = false;

        match condition.condition_type.as_str() {
            "resource_id" => {
                if xml_content.contains(&format!("resource-id=\"{}\"", condition.selector)) {
                    matched = true;
                    // 这里应该解析出具体的元素，简化实现
                    if let Ok(element) = Self::parse_element(&xml_content) {
                        matched_elements.push(element);
                    }
                }
            }
            "text" => {
                if xml_content.contains(&format!("text=\"{}\"", condition.selector)) {
                    matched = true;
                    if let Ok(element) = Self::parse_element(&xml_content) {
                        matched_elements.push(element);
                    }
                }
            }
            "text_contains" => {
                if let Some(value) = &condition.value {
                    if xml_content.contains(value) {
                        matched = true;
                        if let Ok(element) = Self::parse_element(&xml_content) {
                            matched_elements.push(element);
                        }
                    }
                }
            }
            "class" => {
                if xml_content.contains(&format!("class=\"{}\"", condition.selector)) {
                    matched = true;
                    if let Ok(element) = Self::parse_element(&xml_content) {
                        matched_elements.push(element);
                    }
                }
            }
            _ => {
                return Err(format!("不支持的条件类型: {}", condition.condition_type));
            }
        }

        Ok(XmlJudgmentResult {
            success: true,
            matched,
            elements: matched_elements,
            error: None,
        })
    }

    /// 等待元素出现
    pub async fn wait_for_element(
        device_id: &str, 
        condition: &XmlCondition, 
        timeout_ms: u64
    ) -> Result<XmlJudgmentResult, String> {
        let start_time = std::time::Instant::now();
        let timeout = std::time::Duration::from_millis(timeout_ms);

        loop {
            if start_time.elapsed() >= timeout {
                return Ok(XmlJudgmentResult {
                    success: true,
                    matched: false,
                    elements: vec![],
                    error: Some("等待超时".to_string()),
                });
            }

            let result = Self::find_elements(device_id, condition).await?;
            if result.matched {
                return Ok(result);
            }

            // 等待100ms后重试
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    }

    /// 检查页面状态
    pub async fn check_page_state(device_id: &str, expected_indicators: &[&str]) -> Result<bool, String> {
        let xml_content = Self::get_ui_xml(device_id).await?;
        
        for indicator in expected_indicators {
            if !xml_content.contains(indicator) {
                return Ok(false);
            }
        }
        
        Ok(true)
    }

    /// 获取元素中心点坐标
    #[allow(dead_code)]
    pub fn get_element_center(element: &XmlElement) -> Option<(i32, i32)> {
        if let Some((left, top, right, bottom)) = element.bounds {
            let center_x = (left + right) / 2;
            let center_y = (top + bottom) / 2;
            Some((center_x, center_y))
        } else {
            None
        }
    }
}

// Tauri命令包装器
use tauri::command;

#[command]
pub async fn get_device_ui_xml(device_id: String) -> Result<String, String> {
    XmlJudgmentService::get_ui_xml(&device_id).await
}

#[command]
pub async fn find_xml_ui_elements(
    device_id: String, 
    condition: XmlCondition
) -> Result<XmlJudgmentResult, String> {
    XmlJudgmentService::find_elements(&device_id, &condition).await
}

#[command]
pub async fn wait_for_ui_element(
    device_id: String,
    condition: XmlCondition,
    timeout_ms: u64
) -> Result<XmlJudgmentResult, String> {
    XmlJudgmentService::wait_for_element(&device_id, &condition, timeout_ms).await
}

#[command]
pub async fn check_device_page_state(
    device_id: String,
    indicators: Vec<String>
) -> Result<bool, String> {
    let indicator_refs: Vec<&str> = indicators.iter().map(|s| s.as_str()).collect();
    XmlJudgmentService::check_page_state(&device_id, &indicator_refs).await
}

// ====== 新增：按匹配条件查找元素（用于脚本步骤绑定） ======

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchCriteriaDTO {
    pub strategy: String,           // 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard'
    pub fields: Vec<String>,        // 勾选的字段
    pub values: std::collections::HashMap<String, String>, // 字段值
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MatchPreviewDTO {
    pub text: Option<String>,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
    pub package: Option<String>,
    pub bounds: Option<String>,
    pub xpath: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchResultDTO {
    pub ok: bool,
    pub message: String,
    pub total: Option<usize>,
    pub matchedIndex: Option<usize>,
    pub preview: Option<MatchPreviewDTO>,
}

#[command]
#[allow(non_snake_case)]
pub async fn match_element_by_criteria(
    deviceId: String,
    criteria: MatchCriteriaDTO,
) -> Result<MatchResultDTO, String> {
    // 读取当前XML
    let xml = XmlJudgmentService::get_ui_xml(&deviceId).await?;

    // 简单行级匹配：按 <node ...> 行过滤
    let lines: Vec<&str> = xml.lines().filter(|l| l.contains("<node")).collect();

    if lines.is_empty() {
        return Ok(MatchResultDTO { ok: false, message: "未解析到任何节点".into(), total: Some(0), matchedIndex: None, preview: None });
    }

    // 根据选择字段匹配；对 positionless/relaxed/strict/standard 策略忽略位置字段
    let ignore_bounds = criteria.strategy == "positionless" || criteria.strategy == "relaxed" || criteria.strategy == "strict" || criteria.strategy == "standard";

    let mut matched_idx: Option<usize> = None;
    for (idx, line) in lines.iter().enumerate() {
        let mut ok = true;
        for f in &criteria.fields {
            if *f == "bounds" && ignore_bounds { continue; }
            if let Some(v) = criteria.values.get(f) {
                // 宽松匹配：text/content-desc 使用包含，其他使用等值（字符串出现）
                if f == "text" || f == "content-desc" {
                    if !line.contains(&format!("{}=\"{}", f, v)) && !line.contains(v) {
                        ok = false; break;
                    }
                } else if f == "resource-id" {
                    if !line.contains(&format!("resource-id=\"{}\"", v)) && !line.contains(&format!("resource-id=\".*/{}\"", v)) {
                        if !line.contains(v) { ok = false; break; }
                    }
                } else {
                    if !line.contains(&format!("{}=\"{}\"", f, v)) { ok = false; break; }
                }
            }
        }
        if ok { matched_idx = Some(idx); break; }
    }

    if let Some(i) = matched_idx {
        // 构造预览
        let line = lines[i];
        let get_attr = |name: &str| -> Option<String> {
            let pat = format!("{}=\"", name);
            if let Some(s) = line.find(&pat) {
                let start = s + pat.len();
                if let Some(e) = line[start..].find('"') { return Some(line[start..start+e].to_string()); }
            }
            None
        };
        let preview = MatchPreviewDTO {
            text: get_attr("text"),
            resource_id: get_attr("resource-id"),
            class_name: get_attr("class"),
            package: get_attr("package"),
            bounds: get_attr("bounds"),
            xpath: None,
        };
        Ok(MatchResultDTO { ok: true, message: "已匹配".into(), total: Some(lines.len()), matchedIndex: Some(i), preview: Some(preview) })
    } else {
        Ok(MatchResultDTO { ok: false, message: "未找到匹配元素".into(), total: Some(lines.len()), matchedIndex: None, preview: None })
    }
}