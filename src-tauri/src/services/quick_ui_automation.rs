use crate::services::safe_adb_manager::SafeAdbManager;
use serde::{Deserialize, Serialize};
use tauri::command;
use tracing::{info, warn, error};

/**
 * 快速UI操作结果
 */
#[derive(Debug, Serialize, Deserialize)]
pub struct QuickUiResult {
    pub success: bool,
    pub message: String,
    pub data: Option<String>,
    pub elapsed_ms: u64,
}

/**
 * 快速抓取页面XML内容
 * 
 * 专为对话框检测优化的快速UI dump命令
 */
#[command]
pub async fn adb_dump_ui_xml(device_id: String) -> Result<String, String> {
    let start_time = std::time::Instant::now();
    info!("🔍 快速抓取UI XML: device={}", device_id);

    let mut safe_adb = SafeAdbManager::new();

    // 确保ADB路径可用
    if let Err(e) = safe_adb.find_safe_adb_path() {
        return Err(format!("ADB路径不可用: {}", e));
    }

    // 验证设备连接
    match safe_adb.is_device_online(&device_id) {
        Ok(false) | Err(_) => {
            return Err(format!("设备 {} 未连接或检测失败", device_id));
        }
        Ok(true) => {
            // 设备在线，继续
        }
    }

    // 执行UI dump
    let dump_args = vec![
        "-s", &device_id,
        "exec-out", "uiautomator", "dump", "/dev/stdout"
    ];

    match safe_adb.execute_adb_command(&dump_args) {
        Ok(output) => {
            let elapsed = start_time.elapsed().as_millis();
            info!("✅ UI XML抓取完成: {}ms", elapsed);
            
            // 清理输出（移除可能的提示信息）
            let cleaned_xml = clean_ui_dump_output(&output);
            Ok(cleaned_xml)
        }
        Err(e) => {
            error!("❌ UI XML抓取失败: {}", e);
            Err(format!("UI抓取失败: {}", e))
        }
    }
}

/**
 * 通过resource-id点击元素
 */
#[command]
pub async fn adb_click_element(
    device_id: String,
    resource_id: String,
) -> Result<bool, String> {
    info!("👆 点击元素: device={}, resource_id={}", device_id, resource_id);

    let mut safe_adb = SafeAdbManager::new();

    // 确保ADB路径可用
    if let Err(e) = safe_adb.find_safe_adb_path() {
        return Err(format!("ADB路径不可用: {}", e));
    }

    // 验证设备连接
    match safe_adb.is_device_online(&device_id) {
        Ok(false) | Err(_) => {
            return Err(format!("设备 {} 未连接", device_id));
        }
        Ok(true) => {
            // 设备在线
        }
    }

    // 🚀 优化：直接使用坐标点击作为主方案（更快更可靠）
    // 备用方案改为主方案，因为坐标点击兼容性更好且速度更快
    info!("🎯 使用坐标点击方案（主方案）");
    match try_click_by_coordinates(&mut safe_adb, &device_id, &resource_id).await {
        Ok(true) => {
            info!("✅ 坐标点击成功");
            return Ok(true);
        }
        Ok(false) => {
            warn!("❌ 坐标点击返回false，尝试uiautomator方案");
        }
        Err(e) => {
            warn!("❌ 坐标点击失败，尝试uiautomator方案: {}", e);
        }
    }

    // 备用方案：使用uiautomator2通过resource-id点击元素
    info!("🔄 备用方案：使用uiautomator点击");
    let selector = format!("resourceId(\"{}\")", resource_id);
    let click_args = vec![
        "-s", &device_id,
        "shell", "uiautomator", "runtest", "UiAutomatorStub.jar",
        "-c", "com.github.uiautomatorstub.Stub", "-e", "cmd", "click",
        "-e", "selector", &selector
    ];

    match safe_adb.execute_adb_command(&click_args) {
        Ok(output) => {
            // 检查输出中是否包含成功指示
            if output.contains("OK") || output.contains("success") {
                info!("✅ uiautomator点击成功: {}", resource_id);
                Ok(true)
            } else {
                warn!("⚠️ uiautomator点击可能失败: {}", output);
                Err(format!("所有点击方案都失败了"))
            }
        }
        Err(e) => {
            error!("❌ uiautomator点击也失败: {}", e);
            Err(format!("所有点击方案都失败了: {}", e))
        }
    }
}

/**
 * 通过坐标点击
 */
#[command]
pub async fn adb_tap_coordinate(
    device_id: String,
    x: i32,
    y: i32,
) -> Result<bool, String> {
    info!("🎯 坐标点击: device={}, x={}, y={}", device_id, x, y);

    let mut safe_adb = SafeAdbManager::new();

    // 确保ADB路径可用
    if let Err(e) = safe_adb.find_safe_adb_path() {
        return Err(format!("ADB路径不可用: {}", e));
    }

    // 验证设备连接
    match safe_adb.is_device_online(&device_id) {
        Ok(false) | Err(_) => {
            return Err(format!("设备 {} 未连接", device_id));
        }
        Ok(true) => {}
    }

    // 执行点击
    let x_str = x.to_string();
    let y_str = y.to_string();
    let tap_args = vec![
        "-s", &device_id,
        "shell", "input", "tap", 
        &x_str, &y_str
    ];

    match safe_adb.execute_adb_command(&tap_args) {
        Ok(_) => {
            info!("✅ 坐标点击完成");
            Ok(true)
        }
        Err(e) => {
            error!("❌ 坐标点击失败: {}", e);
            Err(format!("坐标点击失败: {}", e))
        }
    }
}

/**
 * 备用方案：通过查找元素坐标然后点击
 */
async fn try_click_by_coordinates(
    safe_adb: &mut SafeAdbManager,
    device_id: &str,
    resource_id: &str,
) -> Result<bool, String> {
    info!("🔄 备用方案：查找元素坐标并点击");

    // 先抓取XML
    let dump_args = vec![
        "-s", device_id,
        "exec-out", "uiautomator", "dump", "/dev/stdout"
    ];

    let xml_content = match safe_adb.execute_adb_command(&dump_args) {
        Ok(output) => clean_ui_dump_output(&output),
        Err(e) => {
            return Err(format!("获取UI内容失败: {}", e));
        }
    };

    // 解析XML找到元素坐标
    if let Some((x, y)) = extract_element_coordinates(&xml_content, resource_id) {
        info!("📍 找到元素坐标: ({}, {})", x, y);
        
        // 执行点击
        let x_str = x.to_string();
        let y_str = y.to_string();
        let tap_args = vec![
            "-s", device_id,
            "shell", "input", "tap",
            &x_str, &y_str
        ];

        match safe_adb.execute_adb_command(&tap_args) {
            Ok(_) => {
                info!("✅ 备用方案点击成功");
                Ok(true)
            }
            Err(e) => {
                error!("❌ 备用方案点击失败: {}", e);
                Err(format!("备用点击失败: {}", e))
            }
        }
    } else {
        Err(format!("未找到resource-id为 {} 的可点击元素", resource_id))
    }
}

/**
 * 清理UI dump输出
 */
fn clean_ui_dump_output(raw_output: &str) -> String {
    // 移除可能的提示信息，只保留XML内容
    if let Some(xml_start) = raw_output.find("<?xml") {
        raw_output[xml_start..].to_string()
    } else if let Some(hierarchy_start) = raw_output.find("<hierarchy") {
        // 有些设备可能直接输出hierarchy
        format!("<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>{}", &raw_output[hierarchy_start..])
    } else {
        // 如果找不到XML标记，返回原始输出
        raw_output.to_string()
    }
}

/**
 * 从XML中提取指定resource-id元素的中心坐标
 */
fn extract_element_coordinates(xml_content: &str, resource_id: &str) -> Option<(i32, i32)> {
    use regex::Regex;

    // 构建正则表达式匹配包含指定resource-id且clickable="true"的节点
    let pattern = format!(
        r#"<node[^>]*resource-id="{}"[^>]*clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*>"#,
        regex::escape(resource_id)
    );

    if let Ok(re) = Regex::new(&pattern) {
        if let Some(captures) = re.captures(xml_content) {
            if let (Some(left), Some(top), Some(right), Some(bottom)) = (
                captures.get(1)?.as_str().parse::<i32>().ok(),
                captures.get(2)?.as_str().parse::<i32>().ok(),
                captures.get(3)?.as_str().parse::<i32>().ok(),
                captures.get(4)?.as_str().parse::<i32>().ok(),
            ) {
                // 计算中心点
                let center_x = (left + right) / 2;
                let center_y = (top + bottom) / 2;
                return Some((center_x, center_y));
            }
        }
    }

    None
}