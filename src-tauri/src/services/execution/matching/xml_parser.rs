//! xml_parser.rs - Android UI XML 解析和元素匹配工具
//! 
//! 提供 XML UI 层次结构解析功能，支持基于多种属性的元素查找和匹配。

use std::collections::HashMap;
use anyhow::{Result, anyhow};
use serde_json::Value;
use tracing::{debug, warn, info};

/// XML 元素信息
#[derive(Debug, Clone)]
pub struct XmlElement {
    pub tag: String,
    pub attributes: HashMap<String, String>,
    pub text: Option<String>,
    pub bounds: Option<(i32, i32, i32, i32)>, // (left, top, right, bottom)
    pub children: Vec<XmlElement>,
}

impl XmlElement {
    /// 从 bounds 字符串解析坐标
    /// 格式: "[left,top][right,bottom]" 
    pub fn parse_bounds(bounds_str: &str) -> Option<(i32, i32, i32, i32)> {
        let bounds_str = bounds_str.trim();
        if !bounds_str.starts_with('[') || !bounds_str.contains("][") {
            return None;
        }
        
        // 分割两个坐标对
        let parts: Vec<&str> = bounds_str[1..].split("][").collect();
        if parts.len() != 2 {
            return None;
        }
        
        let left_top = parts[0];
        let right_bottom = parts[1].trim_end_matches(']');
        
        // 解析左上角坐标
        let left_top_coords: Vec<&str> = left_top.split(',').collect();
        if left_top_coords.len() != 2 {
            return None;
        }
        
        // 解析右下角坐标
        let right_bottom_coords: Vec<&str> = right_bottom.split(',').collect();
        if right_bottom_coords.len() != 2 {
            return None;
        }
        
        // 转换为数值
        let left: i32 = left_top_coords[0].parse().ok()?;
        let top: i32 = left_top_coords[1].parse().ok()?;
        let right: i32 = right_bottom_coords[0].parse().ok()?;
        let bottom: i32 = right_bottom_coords[1].parse().ok()?;
        
        Some((left, top, right, bottom))
    }
    
    /// 获取元素中心点坐标
    pub fn get_center(&self) -> Option<(i32, i32)> {
        if let Some((left, top, right, bottom)) = self.bounds {
            let center_x = (left + right) / 2;
            let center_y = (top + bottom) / 2;
            Some((center_x, center_y))
        } else {
            None
        }
    }
    
    /// 检查是否匹配给定的属性条件
    pub fn matches_criteria(&self, criteria: &HashMap<String, Value>) -> bool {
        for (field, expected_value) in criteria {
            let actual_value = match field.as_str() {
                "text" => self.text.as_ref().map(|s| s.as_str()).unwrap_or(""),
                "class" => self.attributes.get("class").map(|s| s.as_str()).unwrap_or(""),
                "package" => self.attributes.get("package").map(|s| s.as_str()).unwrap_or(""),
                "resource-id" => self.attributes.get("resource-id").map(|s| s.as_str()).unwrap_or(""),
                "content-desc" => self.attributes.get("content-desc").map(|s| s.as_str()).unwrap_or(""),
                "clickable" => self.attributes.get("clickable").map(|s| s.as_str()).unwrap_or("false"),
                "enabled" => self.attributes.get("enabled").map(|s| s.as_str()).unwrap_or("true"),
                _ => self.attributes.get(field).map(|s| s.as_str()).unwrap_or(""),
            };
            
            // 支持字符串和正则表达式匹配
            match expected_value {
                Value::String(s) => {
                    if !actual_value.contains(s) {
                        return false;
                    }
                }
                Value::Bool(b) => {
                    let actual_bool = actual_value == "true";
                    if actual_bool != *b {
                        return false;
                    }
                }
                _ => {
                    if actual_value != expected_value.to_string() {
                        return false;
                    }
                }
            }
        }
        
        true
    }
    
    /// 递归查找匹配条件的所有元素
    pub fn find_all_matching(&self, criteria: &HashMap<String, Value>) -> Vec<&XmlElement> {
        let mut results = Vec::new();
        
        if self.matches_criteria(criteria) {
            results.push(self);
        }
        
        for child in &self.children {
            results.extend(child.find_all_matching(criteria));
        }
        
        results
    }
    
    /// 查找第一个匹配条件的元素
    pub fn find_first_matching(&self, criteria: &HashMap<String, Value>) -> Option<&XmlElement> {
        if self.matches_criteria(criteria) {
            return Some(self);
        }
        
        for child in &self.children {
            if let Some(found) = child.find_first_matching(criteria) {
                return Some(found);
            }
        }
        
        None
    }
}

/// XML UI 解析器
pub struct XmlUiParser {
    root: Option<XmlElement>,
}

impl XmlUiParser {
    /// 创建新的 XML 解析器
    pub fn new() -> Self {
        Self { root: None }
    }
    
    /// 解析 XML 字符串（简化版本，实际应该使用 xml 解析库）
    pub fn parse(&mut self, xml_content: &str) -> Result<()> {
        // 这里是一个简化的解析实现
        // 实际项目中应该使用 roxmltree 或 quick-xml 等专业库
        
        debug!("开始解析 UI XML，长度: {} 字符", xml_content.len());
        
        // 查找根节点
        if let Some(start) = xml_content.find("<hierarchy") {
            let content = &xml_content[start..];
            self.root = Some(self.parse_element(content)?);
            info!("XML 解析成功");
            Ok(())
        } else {
            Err(anyhow!("无法找到 hierarchy 根节点"))
        }
    }
    
    /// 解析单个 XML 元素（简化实现）
    fn parse_element(&self, content: &str) -> Result<XmlElement> {
        // 这是一个高度简化的 XML 解析实现
        // 仅用于演示，实际应该使用专业的 XML 解析库
        
        let mut element = XmlElement {
            tag: "node".to_string(),
            attributes: HashMap::new(),
            text: None,
            bounds: None,
            children: Vec::new(),
        };
        
        // 解析属性（简化版）
        if let Some(bounds_start) = content.find("bounds=\"") {
            let bounds_start = bounds_start + 8;
            if let Some(bounds_end) = content[bounds_start..].find("\"") {
                let bounds_str = &content[bounds_start..bounds_start + bounds_end];
                element.bounds = XmlElement::parse_bounds(bounds_str);
            }
        }
        
        if let Some(text_start) = content.find("text=\"") {
            let text_start = text_start + 6;
            if let Some(text_end) = content[text_start..].find("\"") {
                let text_str = &content[text_start..text_start + text_end];
                if !text_str.is_empty() {
                    element.text = Some(text_str.to_string());
                }
            }
        }
        
        // 解析其他常见属性
        let attr_patterns = [
            ("class", "class=\""),
            ("package", "package=\""),
            ("resource-id", "resource-id=\""),
            ("content-desc", "content-desc=\""),
            ("clickable", "clickable=\""),
            ("enabled", "enabled=\""),
        ];
        
        for (attr_name, pattern) in &attr_patterns {
            if let Some(attr_start) = content.find(pattern) {
                let attr_start = attr_start + pattern.len();
                if let Some(attr_end) = content[attr_start..].find("\"") {
                    let attr_value = &content[attr_start..attr_start + attr_end];
                    element.attributes.insert(attr_name.to_string(), attr_value.to_string());
                }
            }
        }
        
        Ok(element)
    }
    
    /// 查找所有匹配条件的元素
    pub fn find_all_elements(&self, criteria: &HashMap<String, Value>) -> Vec<&XmlElement> {
        if let Some(root) = &self.root {
            root.find_all_matching(criteria)
        } else {
            Vec::new()
        }
    }
    
    /// 查找第一个匹配条件的元素
    pub fn find_first_element(&self, criteria: &HashMap<String, Value>) -> Option<&XmlElement> {
        if let Some(root) = &self.root {
            root.find_first_matching(criteria)
        } else {
            None
        }
    }
    
    /// 应用包含和排除条件过滤元素
    pub fn filter_elements<'a>(
        &self,
        elements: Vec<&'a XmlElement>,
        includes: &[HashMap<String, Value>],
        excludes: &[HashMap<String, Value>],
    ) -> Vec<&'a XmlElement> {
        elements
            .into_iter()
            .filter(|element| {
                // 检查包含条件
                let include_match = if includes.is_empty() {
                    true
                } else {
                    includes.iter().any(|include_criteria| {
                        element.matches_criteria(include_criteria)
                    })
                };
                
                // 检查排除条件
                let exclude_match = excludes.iter().any(|exclude_criteria| {
                    element.matches_criteria(exclude_criteria)
                });
                
                include_match && !exclude_match
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_bounds() {
        assert_eq!(
            XmlElement::parse_bounds("[522,212][648,268]"),
            Some((522, 212, 648, 268))
        );
        
        assert_eq!(
            XmlElement::parse_bounds("[0,0][100,50]"),
            Some((0, 0, 100, 50))
        );
        
        assert_eq!(XmlElement::parse_bounds("invalid"), None);
    }
    
    #[test]
    fn test_get_center() {
        let element = XmlElement {
            tag: "node".to_string(),
            attributes: HashMap::new(),
            text: None,
            bounds: Some((522, 212, 648, 268)),
            children: Vec::new(),
        };
        
        assert_eq!(element.get_center(), Some((585, 240)));
    }
}