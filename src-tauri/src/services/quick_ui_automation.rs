use crate::services::safe_adb_manager::SafeAdbManager;
use serde::{Deserialize, Serialize};
use tauri::command;
use tracing::{info, warn, error};
use lazy_static::lazy_static;
use std::sync::Mutex;

// 全局ADB管理器实例，避免重复初始化
lazy_static! {
    static ref GLOBAL_ADB: Mutex<Option<SafeAdbManager>> = Mutex::new(None);
}

/// 获取或初始化全局ADB管理器
async fn get_global_adb() -> Result<SafeAdbManager, String> {
    let mut global_adb = GLOBAL_ADB.lock().unwrap();
    
    if global_adb.is_none() {
        info!("🎯 初始化全局ADB管理器");
        let mut adb = SafeAdbManager::new();
        
        // 一次性完成ADB路径查找和验证
        if let Err(e) = adb.find_safe_adb_path() {
            return Err(format!("ADB路径不可用: {}", e));
        }
        
        *global_adb = Some(adb);
        info!("✅ 全局ADB管理器初始化完成");
    }
    
    Ok(global_adb.as_ref().unwrap().clone())
}

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

    // 使用全局ADB管理器，避免重复初始化
    let mut safe_adb = get_global_adb().await?;

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

    // 使用全局ADB管理器，避免重复初始化和设备检查
    let mut safe_adb = get_global_adb().await?;

    // 🚀 极速优化：单次UI抓取 + 直接坐标点击（无备用方案）
    info!("🎯 使用极速坐标点击（一次抓取，直接点击）");
    
    // 一次性抓取UI XML
    let dump_args = vec![
        "-s", &device_id,
        "exec-out", "uiautomator", "dump", "/dev/stdout"
    ];

    let xml_content = match safe_adb.execute_adb_command(&dump_args) {
        Ok(output) => clean_ui_dump_output(&output),
        Err(e) => {
            return Err(format!("获取UI内容失败: {}", e));
        }
    };

    // 直接计算坐标并点击
    if let Some((x, y)) = extract_element_coordinates(&xml_content, &resource_id) {
        info!("� 找到元素坐标: ({}, {})", x, y);
        
        // 立即执行点击
        let x_str = x.to_string();
        let y_str = y.to_string();
        let tap_args = vec![
            "-s", &device_id,
            "shell", "input", "tap",
            &x_str, &y_str
        ];

        match safe_adb.execute_adb_command(&tap_args) {
            Ok(_) => {
                info!("✅ 极速坐标点击成功");
                return Ok(true);
            }
            Err(e) => {
                return Err(format!("坐标点击失败: {}", e));
            }
        }
    } else {
        return Err(format!("未找到resource-id为 {} 的可点击元素", resource_id));
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

    // 使用全局ADB管理器，跳过重复检查
    let mut safe_adb = get_global_adb().await?;

    // 直接执行点击，无需重复验证设备
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