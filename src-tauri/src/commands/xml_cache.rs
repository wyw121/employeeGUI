use tracing::info;

#[tauri::command]
pub async fn list_xml_cache_files() -> Result<Vec<String>, String> {
    use std::fs;
    let debug_dir = get_debug_xml_dir();
    if !debug_dir.exists() { return Ok(vec![]); }
    match fs::read_dir(&debug_dir) {
        Ok(entries) => {
            let mut xml_files = Vec::new();
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() { if let Some(name) = path.file_name().and_then(|f| f.to_str()) { if name.ends_with(".xml") && name.starts_with("ui_dump_") { xml_files.push(name.to_string()); } } }
            }
            xml_files.sort(); xml_files.reverse();
            Ok(xml_files)
        }
        Err(e) => Err(format!("读取debug_xml目录失败: {}", e))
    }
}

#[tauri::command]
pub async fn read_xml_cache_file(file_name: String) -> Result<String, String> {
    use std::fs;
    let debug_dir = get_debug_xml_dir();
    let file_path = debug_dir.join(&file_name);
    if !file_path.exists() { return Err(format!("XML缓存文件不存在: {}", file_name)); }
    fs::read_to_string(&file_path).map_err(|e| format!("读取XML缓存文件失败: {} - {}", file_name, e))
}

#[tauri::command]
pub async fn get_xml_file_size(file_name: String) -> Result<u64, String> {
    use std::fs;
    let debug_dir = get_debug_xml_dir();
    let file_path = debug_dir.join(&file_name);
    if !file_path.exists() { return Err(format!("XML缓存文件不存在: {}", file_name)); }
    fs::metadata(&file_path).map(|m| m.len()).map_err(|e| format!("获取文件大小失败: {} - {}", file_name, e))
}

#[tauri::command]
pub async fn delete_xml_cache_file(file_name: String) -> Result<(), String> {
    use std::fs;
    let debug_dir = get_debug_xml_dir();
    let file_path = debug_dir.join(&file_name);
    if !file_path.exists() { return Err(format!("XML缓存文件不存在: {}", file_name)); }
    fs::remove_file(&file_path).map_err(|e| format!("删除XML缓存文件失败: {} - {}", file_name, e))
}

#[tauri::command]
pub async fn parse_cached_xml_to_elements(xml_content: String) -> Result<serde_json::Value, String> {
    use crate::services::ui_reader_service::parse_ui_elements;
    match parse_ui_elements(&xml_content) {
        Ok(elements) => serde_json::to_value(&elements).map_err(|e| format!("序列化UI元素失败: {}", e)),
        Err(e) => Err(format!("解析XML内容失败: {}", e))
    }
}

fn get_debug_xml_dir() -> std::path::PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .parent()
        .unwrap_or_else(|| std::path::Path::new(".."))
        .join("debug_xml")
}
