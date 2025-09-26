// Execution context metrics related commands
use crate::services::execution::collect_execution_metrics_json;

#[tauri::command]
pub async fn get_execution_context_metrics() -> Result<serde_json::Value, String> {
    Ok(collect_execution_metrics_json())
}
