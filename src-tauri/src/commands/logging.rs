use crate::services::log_bridge::{AdbCommandLog, LogEntry, LOG_COLLECTOR};

#[tauri::command]
pub async fn get_logs() -> Result<Vec<LogEntry>, String> { Ok(LOG_COLLECTOR.get_logs()) }

#[tauri::command]
pub async fn get_adb_command_logs() -> Result<Vec<AdbCommandLog>, String> { Ok(LOG_COLLECTOR.get_adb_command_logs()) }

#[tauri::command]
pub async fn get_filtered_logs(
    level_filter: Option<Vec<String>>,
    category_filter: Option<Vec<String>>,
    source_filter: Option<Vec<String>>,
    start_time: Option<String>,
    end_time: Option<String>,
) -> Result<Vec<LogEntry>, String> {
    Ok(LOG_COLLECTOR.get_filtered_logs(level_filter, category_filter, source_filter, start_time, end_time))
}

#[tauri::command]
pub async fn clear_logs() -> Result<(), String> { LOG_COLLECTOR.clear_logs(); Ok(()) }

#[tauri::command]
pub async fn add_log_entry(
    level: String,
    category: String,
    source: String,
    message: String,
    details: Option<String>,
    device_id: Option<String>,
) -> Result<(), String> {
    LOG_COLLECTOR.add_log(&level, &category, &source, &message, details.as_deref(), device_id.as_deref());
    Ok(())
}
