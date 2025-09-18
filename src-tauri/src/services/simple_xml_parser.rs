use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{info, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleUIElement {
    pub id: u32,
    pub element_type: String,
    pub text: String,
    pub content_desc: String,
    pub center_x: i32,
    pub center_y: i32,
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
    pub resource_id: String,
    pub class_name: String,
    pub clickable: bool,
    pub parent_id: Option<u32>,
    pub children_ids: Vec<u32>,
    pub depth: u32,
}

pub struct SimpleXmlParser;

impl SimpleXmlParser {
    pub fn parse_ui_xml(xml_content: &str) -> Result<Vec<SimpleUIElement>, String> {
        let mut elements: Vec<SimpleUIElement> = Vec::new();
        let mut id_counter = 0;
        let mut parent_stack: Vec<u32> = Vec::new();
        
        // 使用简单的字符串解析而非复杂的XML解析
        let lines: Vec<&str> = xml_content.lines().collect();
        
        for line in lines {
            let trimmed = line.trim();
            
            if trimmed.starts_with("<node ") && !trimmed.contains("</node>") {
                // 开始标签
                id_counter += 1;
                let current_id = id_counter;
                
                let element = Self::parse_node_attributes(trimmed, current_id, &parent_stack)?;
                
                // 设置父子关系
                if let Some(&parent_id) = parent_stack.last() {
                    // 更新父元素的children_ids
                    if let Some(parent) = elements.iter_mut().find(|e| e.id == parent_id) {
                        parent.children_ids.push(current_id);
                    }
                }
                
                elements.push(element);
                parent_stack.push(current_id);
                
            } else if trimmed.starts_with("</node>") {
                // 结束标签
                parent_stack.pop();
                
            } else if trimmed.starts_with("<node ") && trimmed.contains("/>") {
                // 自闭合标签
                id_counter += 1;
                let current_id = id_counter;
                
                let element = Self::parse_node_attributes(trimmed, current_id, &parent_stack)?;
                
                // 设置父子关系
                if let Some(&parent_id) = parent_stack.last() {
                    if let Some(parent) = elements.iter_mut().find(|e| e.id == parent_id) {
                        parent.children_ids.push(current_id);
                    }
                }
                
                elements.push(element);
            }
        }
        
        Ok(elements)
    }
    
    fn parse_node_attributes(line: &str, id: u32, parent_stack: &[u32]) -> Result<SimpleUIElement, String> {
        let mut attributes = HashMap::new();
        
        // 简单的属性解析
        let parts: Vec<&str> = line.split_whitespace().collect();
        for part in parts {
            if part.contains("=\"") {
                if let Some(eq_pos) = part.find("=\"") {
                    let key = &part[..eq_pos];
                    let value_with_quote = &part[eq_pos + 2..];
                    if let Some(quote_pos) = value_with_quote.rfind('"') {
                        let value = &value_with_quote[..quote_pos];
                        attributes.insert(key.to_string(), value.to_string());
                    }
                }
            }
        }
        
        // 解析bounds属性 "[left,top][right,bottom]"
        let bounds = attributes.get("bounds").unwrap_or(&"[0,0][0,0]".to_string()).clone();
        let (left, top, right, bottom) = Self::parse_bounds(&bounds)?;
        
        let center_x = (left + right) / 2;
        let center_y = (top + bottom) / 2;
        
        let element = SimpleUIElement {
            id,
            element_type: attributes.get("class").unwrap_or(&"Unknown".to_string()).clone(),
            text: attributes.get("text").unwrap_or(&"".to_string()).clone(),
            content_desc: attributes.get("content-desc").unwrap_or(&"".to_string()).clone(),
            center_x,
            center_y,
            left,
            top,
            right,
            bottom,
            resource_id: attributes.get("resource-id").unwrap_or(&"".to_string()).clone(),
            class_name: attributes.get("class").unwrap_or(&"".to_string()).clone(),
            clickable: attributes.get("clickable").unwrap_or(&"false".to_string()) == "true",
            parent_id: parent_stack.last().copied(),
            children_ids: Vec::new(),
            depth: parent_stack.len() as u32,
        };
        
        Ok(element)
    }
    
    fn parse_bounds(bounds_str: &str) -> Result<(i32, i32, i32, i32), String> {
        // 解析格式 "[left,top][right,bottom]"
        if !bounds_str.starts_with('[') || !bounds_str.ends_with(']') {
            return Err(format!("Invalid bounds format: {}", bounds_str));
        }
        
        let parts: Vec<&str> = bounds_str[1..bounds_str.len()-1].split("][").collect();
        if parts.len() != 2 {
            return Err(format!("Invalid bounds format: {}", bounds_str));
        }
        
        let left_top: Vec<&str> = parts[0].split(',').collect();
        let right_bottom: Vec<&str> = parts[1].split(',').collect();
        
        if left_top.len() != 2 || right_bottom.len() != 2 {
            return Err(format!("Invalid bounds format: {}", bounds_str));
        }
        
        let left = left_top[0].parse().map_err(|_| format!("Invalid left coordinate: {}", left_top[0]))?;
        let top = left_top[1].parse().map_err(|_| format!("Invalid top coordinate: {}", left_top[1]))?;
        let right = right_bottom[0].parse().map_err(|_| format!("Invalid right coordinate: {}", right_bottom[0]))?;
        let bottom = right_bottom[1].parse().map_err(|_| format!("Invalid bottom coordinate: {}", right_bottom[1]))?;
        
        Ok((left, top, right, bottom))
    }
}

/// 简化的提取页面元素函数
#[tauri::command]
pub async fn extract_page_elements_simple(
    xml_content: String,
) -> Result<Vec<SimpleUIElement>, String> {
    use tracing::info;
    
    info!("🔍 开始提取页面元素（简化版），XML长度: {}", xml_content.len());
    
    match SimpleXmlParser::parse_ui_xml(&xml_content) {
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