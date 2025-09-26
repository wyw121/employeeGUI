use regex::Regex;
use std::collections::HashMap;
use crate::xml_judgment_service::model::XmlElement;

/// Parse minimal attributes from root (simplified legacy logic)
pub fn parse_xml_root(xml_content: &str) -> Result<XmlElement, String> {
    let xml_content = xml_content.trim();
    if xml_content.is_empty() { return Err("XML内容为空".to_string()); }
    if let (Some(start), Some(end)) = (xml_content.find('<'), xml_content.rfind('>')) {
        let root_xml = &xml_content[start..=end];
        parse_element(root_xml)
    } else { Err("无效的XML格式".to_string()) }
}

fn parse_element(element_str: &str) -> Result<XmlElement, String> {
    let tag_regex = Regex::new(r"<(\w+)([^>]*)>").map_err(|e| e.to_string())?;
    if let Some(captures) = tag_regex.captures(element_str) {
        let tag = captures.get(1).unwrap().as_str().to_string();
        let attrs_str = captures.get(2).unwrap().as_str();
        let attributes = parse_attributes(attrs_str);
        let bounds = extract_bounds(&attributes);
        let text_regex = Regex::new(&format!(r"<{}[^>]*>(.*?)</{}>", tag, tag)).map_err(|e| e.to_string())?;
        let text = text_regex.captures(element_str)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().trim().to_string())
            .filter(|s| !s.is_empty());
        Ok(XmlElement { tag, attributes, text, children: vec![], bounds })
    } else { Err("无法解析XML元素".to_string()) }
}

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

fn extract_bounds(attributes: &HashMap<String, String>) -> Option<(i32, i32, i32, i32)> {
    attributes.get("bounds").and_then(|b| {
        let re = Regex::new(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]").unwrap();
        re.captures(b).map(|c| {
            (
                c.get(1).unwrap().as_str().parse().ok().unwrap_or(0),
                c.get(2).unwrap().as_str().parse().ok().unwrap_or(0),
                c.get(3).unwrap().as_str().parse().ok().unwrap_or(0),
                c.get(4).unwrap().as_str().parse().ok().unwrap_or(0),
            )
        })
    })
}

/// Extract only the opening <node ...> tags regardless of XML layout (compressed or multi-line)
pub fn extract_node_opening_tags(xml: &str) -> Vec<String> {
    let mut tags = Vec::new();
    let mut i = 0usize;
    while let Some(rel) = xml[i..].find("<node") {
        let start = i + rel;
        if let Some(end_rel) = xml[start..].find('>') {
            let end = start + end_rel + 1;
            tags.push(xml[start..end].trim().to_string());
            i = end;
        } else { break; }
    }
    tags
}

/// Utility extracting a given attribute value from a single node line
pub fn extract_field_value(line: &str, field: &str) -> Option<String> {
    if let Some(start) = line.find(&format!("{}=\"", field)) {
        let value_start = start + field.len() + 2;
        if let Some(end) = line[value_start..].find('"') {
            return Some(line[value_start..value_start+end].to_string());
        }
    }
    None
}
