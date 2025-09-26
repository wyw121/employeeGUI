//! Query-oriented helpers (element polling, basic condition matching)
//! Separated from fetch.rs to keep responsibilities focused.

use crate::xml_judgment_service::{XmlCondition, XmlJudgmentResult, XmlElement, XmlJudgmentService};

/// Simplified element search based on legacy condition matching (resource_id, text, text_contains, class)
pub async fn find_elements(device_id: &str, condition: &XmlCondition) -> Result<XmlJudgmentResult, String> {
    let xml_content = XmlJudgmentService::get_ui_xml(device_id).await?;
    let mut matched_elements: Vec<XmlElement> = Vec::new();
    let mut matched = false;
    match condition.condition_type.as_str() {
        "resource_id" => { if xml_content.contains(&format!("resource-id=\"{}\"", condition.selector)) { matched = true; } }
        "text" => { if xml_content.contains(&format!("text=\"{}\"", condition.selector)) { matched = true; } }
        "text_contains" => { if let Some(value) = &condition.value { if xml_content.contains(value) { matched = true; } } }
        "class" => { if xml_content.contains(&format!("class=\"{}\"", condition.selector)) { matched = true; } }
        other => { return Err(format!("不支持的条件类型: {}", other)); }
    }
    if matched {
        if let Ok(root) = crate::xml_judgment_service::parser::parse_xml_root(&xml_content) { matched_elements.push(root); }
    }
    Ok(XmlJudgmentResult { success: true, matched, elements: matched_elements, error: None })
}

/// Wait until a specific element (condition) appears or timeout occurs. Polls every 100ms.
pub async fn wait_for_element(device_id: &str, condition: &XmlCondition, timeout_ms: u64) -> Result<XmlJudgmentResult, String> {
    let start_time = std::time::Instant::now();
    let timeout = std::time::Duration::from_millis(timeout_ms);
    loop {
        if start_time.elapsed() >= timeout {
            return Ok(XmlJudgmentResult { success: true, matched: false, elements: vec![], error: Some("等待超时".to_string()) });
        }
        let result = find_elements(device_id, condition).await?;
        if result.matched { return Ok(result); }
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
}
