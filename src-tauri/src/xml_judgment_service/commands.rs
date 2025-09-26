use tauri::command;
use crate::xml_judgment_service::model::*;
use crate::xml_judgment_service::fetch::XmlJudgmentService;
use crate::xml_judgment_service::match_logic::perform_criteria_match;

// ------------- Public Tauri Commands (API preserved) -------------
#[command]
pub async fn get_device_ui_xml(device_id: String) -> Result<String, String> {
    XmlJudgmentService::get_ui_xml(&device_id).await
}

#[command]
pub async fn find_xml_ui_elements(device_id: String, condition: XmlCondition) -> Result<XmlJudgmentResult, String> {
    // Legacy simple implementation reused: treat whole xml root as single element for backward compat.
    let xml_content = XmlJudgmentService::get_ui_xml(&device_id).await?;
    let matched = match condition.condition_type.as_str() {
        "resource_id" => xml_content.contains(&format!("resource-id=\"{}\"", condition.selector)),
        "text" => xml_content.contains(&format!("text=\"{}\"", condition.selector)),
        "text_contains" => condition.value.as_ref().map(|v| xml_content.contains(v)).unwrap_or(false),
        "class" => xml_content.contains(&format!("class=\"{}\"", condition.selector)),
        other => return Err(format!("不支持的条件类型: {}", other)),
    };
    Ok(XmlJudgmentResult { success: true, matched, elements: vec![], error: None })
}

#[command]
pub async fn wait_for_ui_element(device_id: String, condition: XmlCondition, timeout_ms: u64) -> Result<XmlJudgmentResult, String> {
    let start_time = std::time::Instant::now();
    let timeout = std::time::Duration::from_millis(timeout_ms);
    loop {
        if start_time.elapsed() >= timeout {
            return Ok(XmlJudgmentResult { success: true, matched: false, elements: vec![], error: Some("等待超时".to_string()) });
        }
        let result = find_xml_ui_elements(device_id.clone(), condition.clone()).await?;
        if result.matched { return Ok(result); }
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
}

#[command]
pub async fn check_device_page_state(device_id: String, indicators: Vec<String>) -> Result<bool, String> {
    let refs: Vec<&str> = indicators.iter().map(|s| s.as_str()).collect();
    XmlJudgmentService::check_page_state(&device_id, &refs).await
}

#[command]
#[allow(non_snake_case)]
pub async fn match_element_by_criteria(deviceId: String, criteria: MatchCriteriaDTO) -> Result<MatchResultDTO, String> {
    perform_criteria_match(&deviceId, &criteria).await
}
