use serde::{Deserialize, Serialize};
use tokio::process::Command as AsyncCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct VcfOpenResult {
    pub success: bool,
    pub message: String,
    pub details: Option<String>,
    pub steps_completed: Vec<String>,
}

/// 基于实时UI状态的智能VCF打开器
/// 根据当前屏幕内容自动执行正确的操作
#[tauri::command]
pub async fn smart_vcf_opener(device_id: String) -> Result<VcfOpenResult, String> {
    println!("🤖 启动智能VCF打开器，设备: {}", device_id);
    
    let mut steps_completed = Vec::new();
    let mut attempts = 0;
    const MAX_ATTEMPTS: u32 = 10;
    
    while attempts < MAX_ATTEMPTS {
        attempts += 1;
        println!("📍 第 {} 次尝试分析UI状态", attempts);
        
        // 1. 获取当前UI状态
        let ui_state = match get_current_ui_state(&device_id).await {
            Ok(state) => state,
            Err(e) => {
                println!("❌ 获取UI状态失败: {}", e);
                continue;
            }
        };
        
        // 2. 分析当前状态并执行相应操作
        let action_result = match analyze_and_act(&device_id, &ui_state).await {
            Ok(result) => result,
            Err(e) => {
                println!("❌ 执行操作失败: {}", e);
                tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
                continue;
            }
        };
        
        steps_completed.push(action_result.step_name);
        
        // 3. 检查是否完成
        if action_result.is_complete {
            return Ok(VcfOpenResult {
                success: true,
                message: "VCF文件打开和导入完成".to_string(),
                details: Some(format!("总共执行了 {} 个步骤", steps_completed.len())),
                steps_completed,
            });
        }
        
        // 等待UI更新
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
    }
    
    Err(format!("超过最大尝试次数 ({})，操作未完成", MAX_ATTEMPTS))
}

#[derive(Debug)]
struct ActionResult {
    step_name: String,
    is_complete: bool,
}

/// 获取当前UI状态
async fn get_current_ui_state(device_id: &str) -> Result<String, String> {
    // 刷新UI dump
    let mut dump_cmd = AsyncCommand::new("adb");
    dump_cmd.args(&["-s", device_id, "shell", "uiautomator", "dump"]);
    
    #[cfg(windows)]
    {
        dump_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    let _ = dump_cmd.output().await;
    
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    // 读取UI XML
    let mut read_cmd = AsyncCommand::new("adb");
    read_cmd.args(&["-s", device_id, "shell", "cat", "/sdcard/window_dump.xml"]);
    
    #[cfg(windows)]
    {
        read_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    let result = read_cmd.output()
        .await
        .map_err(|e| format!("执行adb命令失败: {}", e))?;
    
    if !result.status.success() {
        let error = String::from_utf8_lossy(&result.stderr);
        return Err(format!("读取UI失败: {}", error));
    }
    
    let xml_content = String::from_utf8_lossy(&result.stdout).to_string();
    
    if xml_content.trim().is_empty() {
        return Err("UI内容为空".to_string());
    }
    
    Ok(xml_content)
}

/// 分析UI状态并执行相应操作
async fn analyze_and_act(device_id: &str, ui_content: &str) -> Result<ActionResult, String> {
    println!("🧠 分析UI内容...");
    
    // 场景1: 应用选择对话框 - "使用通讯录打开"
    if ui_content.contains("使用通讯录打开") {
        println!("🎯 检测到: 应用选择对话框 - 通讯录选项");
        
        if ui_content.contains("始终") && ui_content.contains("button_always") {
            // 点击"始终"按钮
            click_element_by_resource_id(device_id, "android:id/button_always").await?;
            return Ok(ActionResult {
                step_name: "选择始终使用通讯录打开".to_string(),
                is_complete: false,
            });
        }
        
        if ui_content.contains("仅此一次") {
            // 点击"仅此一次"按钮
            click_element_by_resource_id(device_id, "android:id/button_once").await?;
            return Ok(ActionResult {
                step_name: "选择仅此一次使用通讯录".to_string(),
                is_complete: false,
            });
        }
    }
    
    // 场景2: 联系人应用 - 导入界面
    if ui_content.contains("package=\"com.android.contacts\"") {
        println!("🎯 检测到: 联系人应用界面");
        
        // 查找导入相关按钮
        if ui_content.contains("导入") || ui_content.contains("Import") {
            if let Ok(coords) = find_text_coordinates(ui_content, "导入") {
                click_coordinates(device_id, coords.0, coords.1).await?;
                return Ok(ActionResult {
                    step_name: "点击导入按钮".to_string(),
                    is_complete: false,
                });
            }
        }
        
        // 查找确认按钮
        if ui_content.contains("确定") || ui_content.contains("OK") {
            if let Ok(coords) = find_text_coordinates(ui_content, "确定") {
                click_coordinates(device_id, coords.0, coords.1).await?;
                return Ok(ActionResult {
                    step_name: "确认导入联系人".to_string(),
                    is_complete: true, // 导入完成
                });
            }
        }
        
        // 如果没有找到特定按钮，返回失败而不是盲目点击
        println!("⚠️  在联系人应用中未找到特定按钮，跳过盲目点击");
        return Ok(ActionResult {
            step_name: "在联系人应用中未找到可操作按钮".to_string(),
            is_complete: false,
        });
    }
    
    // 场景3: 文件管理器 - 需要打开VCF文件
    if ui_content.contains("package=\"com.android.documentsui\"") {
        println!("🎯 检测到: 文件管理器界面");
        
        // 查找VCF文件
        if ui_content.contains("contacts_import.vcf") || ui_content.contains(".vcf") {
            if let Ok(coords) = find_text_coordinates(ui_content, "contacts_import.vcf") {
                click_coordinates(device_id, coords.0, coords.1).await?;
                return Ok(ActionResult {
                    step_name: "点击VCF文件".to_string(),
                    is_complete: false,
                });
            }
        }
        
        // 如果在空目录，需要导航到下载文件夹
        if ui_content.contains("无任何文件") || ui_content.contains("No items") {
            // 尝试点击下载文件夹或导航按钮
            if let Ok(coords) = find_text_coordinates(ui_content, "下载") {
                click_coordinates(device_id, coords.0, coords.1).await?;
                return Ok(ActionResult {
                    step_name: "导航到下载文件夹".to_string(),
                    is_complete: false,
                });
            }
        }
    }
    
    // 场景4: 桌面 - 需要打开文件管理器
    if ui_content.contains("launcher") {
        println!("🎯 检测到: 桌面界面");
        
        // 打开文件管理器
        open_file_manager(device_id).await?;
        return Ok(ActionResult {
            step_name: "打开文件管理器".to_string(),
            is_complete: false,
        });
    }
    
    // 场景5: 权限对话框
    if ui_content.contains("权限") || ui_content.contains("Permission") {
        println!("🎯 检测到: 权限对话框");
        
        if ui_content.contains("允许") || ui_content.contains("Allow") {
            if let Ok(coords) = find_text_coordinates(ui_content, "允许") {
                click_coordinates(device_id, coords.0, coords.1).await?;
                return Ok(ActionResult {
                    step_name: "授予权限".to_string(),
                    is_complete: false,
                });
            }
        }
    }
    
    // 未知状态 - 等待或重试
    println!("❓ 未识别的UI状态，等待状态变化...");
    Ok(ActionResult {
        step_name: "等待UI状态更新".to_string(),
        is_complete: false,
    })
}

/// 通过资源ID点击元素
async fn click_element_by_resource_id(device_id: &str, resource_id: &str) -> Result<(), String> {
    println!("👆 点击资源ID: {}", resource_id);
    
    let mut click_cmd = AsyncCommand::new("adb");
    click_cmd.args(&["-s", device_id, "shell", "uiautomator2", "clickById", resource_id]);
    
    #[cfg(windows)]
    {
        click_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    let result = click_cmd.output().await;
    
    // 如果uiautomator2不可用，返回错误而不是使用硬编码坐标
    if result.is_err() {
        println!("⚠️ uiautomator2不可用，且无法获取按钮坐标，操作失败");
        return Err("无法点击按钮：uiautomator2不可用且无按钮坐标信息".to_string());
    }
    
    Ok(())
}

/// 点击指定坐标
async fn click_coordinates(device_id: &str, x: i32, y: i32) -> Result<(), String> {
    println!("👆 点击坐标: ({}, {})", x, y);
    // 走注入器优先助手，失败信息按旧风格返回
    let adb_path = crate::utils::adb_utils::get_adb_path();
    match crate::infra::adb::input_helper::tap_injector_first(&adb_path, device_id, x, y, None).await {
        Ok(()) => {
            println!("✅ 点击成功");
            Ok(())
        }
        Err(e) => Err(format!("点击失败: {}", e))
    }
}

/// 从XML中查找文本的坐标
fn find_text_coordinates(xml_content: &str, text: &str) -> Result<(i32, i32), String> {
    // 查找包含指定文本的node
    for line in xml_content.lines() {
        if line.contains(&format!("text=\"{}\"", text)) && line.contains("bounds=") {
            if let Some(bounds_start) = line.find("bounds=\"") {
                let bounds_start = bounds_start + 8;
                if let Some(bounds_end) = line[bounds_start..].find('"') {
                    let bounds_str = &line[bounds_start..bounds_start + bounds_end];
                    return parse_bounds_to_center(bounds_str);
                }
            }
        }
    }
    
    Err(format!("未找到文本: {}", text))
}

/// 解析bounds字符串并返回中心坐标
fn parse_bounds_to_center(bounds_str: &str) -> Result<(i32, i32), String> {
    // bounds格式: "[left,top][right,bottom]"
    let parts: Vec<&str> = bounds_str.split("][").collect();
    
    if parts.len() != 2 {
        return Err("bounds格式错误".to_string());
    }
    
    let left_top = parts[0].trim_start_matches('[');
    let right_bottom = parts[1].trim_end_matches(']');
    
    let left_top_coords: Vec<i32> = left_top.split(',')
        .map(|s| s.parse().unwrap_or(0))
        .collect();
    
    let right_bottom_coords: Vec<i32> = right_bottom.split(',')
        .map(|s| s.parse().unwrap_or(0))
        .collect();
    
    if left_top_coords.len() != 2 || right_bottom_coords.len() != 2 {
        return Err("坐标解析错误".to_string());
    }
    
    let center_x = (left_top_coords[0] + right_bottom_coords[0]) / 2;
    let center_y = (left_top_coords[1] + right_bottom_coords[1]) / 2;
    
    Ok((center_x, center_y))
}

/// 打开文件管理器
async fn open_file_manager(device_id: &str) -> Result<(), String> {
    println!("📂 打开文件管理器");
    
    let mut open_cmd = AsyncCommand::new("adb");
    open_cmd.args(&["-s", device_id, "shell", "am", "start", "-t", "text/vcard", "-d", "file:///sdcard/Download/contacts_import.vcf"]);
    
    #[cfg(windows)]
    {
        open_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    let result = open_cmd.output()
        .await
        .map_err(|e| format!("打开文件管理器失败: {}", e))?;
    
    if !result.status.success() {
        let error = String::from_utf8_lossy(&result.stderr);
        return Err(format!("打开文件管理器失败: {}", error));
    }
    
    Ok(())
}