/**
 * ADB快速UI捕获和点击操作服务
 * 专门为联系人导入对话框自动化处理提供后端支持
 */

use std::process::{Command, Output};
use crate::services::safe_adb_manager::SafeAdbManager;
use tracing::{info, warn, error};

#[derive(serde::Deserialize)]
pub struct TapCoordinate {
    pub x: i32,
    pub y: i32,
}

#[derive(serde::Deserialize)]
pub struct TapByTextRequest {
    pub text: String,
}

#[derive(serde::Serialize)]
pub struct UIDumpResult {
    pub success: bool,
    pub xml_content: String,
    pub message: String,
}

#[derive(serde::Serialize)]
pub struct TapResult {
    pub success: bool,
    pub message: String,
}

/// 快速UI界面抓取 - 专为对话框检测优化
#[tauri::command]
pub async fn fast_ui_dump(device_id: String) -> Result<UIDumpResult, String> {
    info!("🔍 开始快速UI抓取 (设备: {})", device_id);

    let mut adb_manager = SafeAdbManager::new();
    
    // 确保ADB路径可用
    if let Err(e) = adb_manager.find_safe_adb_path() {
        return Ok(UIDumpResult {
            success: false,
            xml_content: String::new(),
            message: format!("无法找到ADB路径: {}", e),
        });
    }

    // 检查设备状态
    match adb_manager.is_device_online(&device_id) {
        Ok(false) | Err(_) => {
            return Ok(UIDumpResult {
                success: false,
                xml_content: String::new(),
                message: format!("设备 {} 未连接", device_id),
            });
        }
        Ok(true) => {
            // 设备在线，继续
        }
    }

    try {
        // 1. 执行UI dump到设备临时文件
        let dump_args = vec![
            "-s", &device_id, 
            "shell", "uiautomator", "dump", "/sdcard/ui_dump_temp.xml"
        ];
        
        let dump_result = adb_manager.execute_adb_command(dump_args)?;
        
        if !dump_result.contains("UI hierchary dumped") {
            return Ok(UIDumpResult {
                success: false,
                xml_content: String::new(),
                message: "UI dump执行失败".to_string(),
            });
        }

        // 2. 读取XML内容
        let cat_args = vec![
            "-s", &device_id,
            "shell", "cat", "/sdcard/ui_dump_temp.xml"
        ];
        
        let xml_content = adb_manager.execute_adb_command(cat_args)?;
        
        // 3. 清理临时文件
        let cleanup_args = vec![
            "-s", &device_id,
            "shell", "rm", "/sdcard/ui_dump_temp.xml"
        ];
        
        let _ = adb_manager.execute_adb_command(cleanup_args); // 忽略清理错误

        info!("✅ UI抓取成功，XML长度: {}", xml_content.len());
        
        Ok(UIDumpResult {
            success: true,
            xml_content,
            message: "UI抓取成功".to_string(),
        })

    } catch (e) {
        error!("❌ UI抓取失败: {}", e);
        Ok(UIDumpResult {
            success: false,
            xml_content: String::new(),
            message: format!("UI抓取异常: {}", e),
        })
    }
}

/// 基于坐标的快速点击
#[tauri::command]
pub async fn adb_tap(
    device_id: String,
    x: i32,
    y: i32,
) -> Result<TapResult, String> {
    info!("👆 执行坐标点击: ({}, {}) 设备: {}", x, y, device_id);

    let mut adb_manager = SafeAdbManager::new();
    
    // 确保ADB路径可用
    if let Err(e) = adb_manager.find_safe_adb_path() {
        return Ok(TapResult {
            success: false,
            message: format!("无法找到ADB路径: {}", e),
        });
    }

    // 检查设备状态
    match adb_manager.is_device_online(&device_id) {
        Ok(false) | Err(_) => {
            return Ok(TapResult {
                success: false,
                message: format!("设备 {} 未连接", device_id),
            });
        }
        Ok(true) => {
            // 设备在线，继续
        }
    }

    try {
        // 执行点击命令
        let tap_args = vec![
            "-s", &device_id,
            "shell", "input", "tap", &x.to_string(), &y.to_string()
        ];
        
        let result = adb_manager.execute_adb_command(tap_args)?;
        
        info!("✅ 点击操作完成: ({}, {})", x, y);
        
        Ok(TapResult {
            success: true,
            message: format!("点击坐标 ({}, {}) 成功", x, y),
        })

    } catch (e) {
        error!("❌ 点击操作失败: {}", e);
        Ok(TapResult {
            success: false,
            message: format!("点击操作异常: {}", e),
        })
    }
}

/// 基于文本的点击（备选方案）
#[tauri::command]
pub async fn adb_tap_by_text(
    device_id: String,
    text: String,
) -> Result<TapResult, String> {
    info!("📝 执行文本点击: '{}' 设备: {}", text, device_id);

    let mut adb_manager = SafeAdbManager::new();
    
    // 确保ADB路径可用
    if let Err(e) = adb_manager.find_safe_adb_path() {
        return Ok(TapResult {
            success: false,
            message: format!("无法找到ADB路径: {}", e),
        });
    }

    // 检查设备状态
    match adb_manager.is_device_online(&device_id) {
        Ok(false) | Err(_) => {
            return Ok(TapResult {
                success: false,
                message: format!("设备 {} 未连接", device_id),
            });
        }
        Ok(true) => {
            // 设备在线，继续
        }
    }

    try {
        // 1. 先抓取UI找到文本元素的坐标
        let dump_result = fast_ui_dump(device_id.clone()).await?;
        
        if !dump_result.success {
            return Ok(TapResult {
                success: false,
                message: "无法获取UI信息进行文本定位".to_string(),
            });
        }

        // 2. 解析XML找到包含指定文本的元素坐标
        let coordinates = parse_text_coordinates(&dump_result.xml_content, &text);
        
        match coordinates {
            Some((x, y)) => {
                // 3. 执行坐标点击
                adb_tap(device_id, x, y).await
            }
            None => {
                warn!("⚠️ 未找到文本 '{}' 对应的可点击元素", text);
                Ok(TapResult {
                    success: false,
                    message: format!("未找到文本 '{}' 对应的元素", text),
                })
            }
        }

    } catch (e) {
        error!("❌ 文本点击失败: {}", e);
        Ok(TapResult {
            success: false,
            message: format!("文本点击异常: {}", e),
        })
    }
}

/// 解析XML内容，提取指定文本元素的坐标
fn parse_text_coordinates(xml_content: &str, target_text: &str) -> Option<(i32, i32)> {
    use regex::Regex;
    
    // 构建正则表达式匹配包含目标文本的node元素
    let pattern = format!(r#"<node[^>]*text="[^"]*{}[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*clickable="true"[^>]*>"#, 
                          regex::escape(target_text));
    
    if let Ok(re) = Regex::new(&pattern) {
        if let Some(captures) = re.captures(xml_content) {
            if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                captures[1].parse::<i32>(),
                captures[2].parse::<i32>(),
                captures[3].parse::<i32>(),
                captures[4].parse::<i32>(),
            ) {
                // 返回中心点坐标
                let center_x = (left + right) / 2;
                let center_y = (top + bottom) / 2;
                return Some((center_x, center_y));
            }
        }
    }
    
    None
}