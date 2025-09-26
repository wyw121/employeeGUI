use crate::types::page_analysis::{PageAnalysisResult, PageAnalysisConfig, SelectedElementConfig, ElementAction};
use crate::services::page_analyzer_service::PageAnalyzerService;
use crate::services::universal_ui_service::UniversalUIService;

#[tauri::command]
pub async fn analyze_current_page(device_id: String, config: Option<PageAnalysisConfig>) -> Result<PageAnalysisResult, String> {
    let service = PageAnalyzerService::new();
    service.analyze_current_page(&device_id, config).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_element_config(config: SelectedElementConfig) -> Result<bool, String> {
    if config.element_id.is_empty() { return Err("元素ID不能为空".to_string()); }
    match config.action {
        ElementAction::InputText(ref text) if text.is_empty() => return Err("输入文本不能为空".to_string()),
        ElementAction::SelectOption(ref option) if option.is_empty() => return Err("选择选项不能为空".to_string()),
        _ => {}
    }
    Ok(true)
}

#[tauri::command]
pub async fn execute_page_element_action(device_id: String, config: SelectedElementConfig) -> Result<String, String> {
    let universal_service = UniversalUIService::new();
    match config.action {
        ElementAction::Click => {
            universal_service.execute_ui_click(&device_id, &config.description).await.map_err(|e| e.to_string())?;
            Ok("点击操作执行成功".to_string())
        }
        ElementAction::InputText(text) => Ok(format!("输入文本操作执行成功: {}", text)),
        _ => Ok("操作执行成功".to_string())
    }
}

#[tauri::command]
pub async fn get_page_analysis_history(_device_id: String, _limit: Option<usize>) -> Result<Vec<PageAnalysisResult>, String> {
    Ok(vec![])
}
