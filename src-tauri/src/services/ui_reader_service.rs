use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::process::Command as AsyncCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct UIElement {
    pub text: String,
    pub resource_id: String,
    pub class: String,
    pub package: String,
    pub content_desc: String,
    pub clickable: bool,
    pub bounds: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceUIState {
    pub device_id: String,
    pub xml_content: String,
    pub elements: Vec<UIElement>,
    pub timestamp: String,
    pub page_type: String,
    pub suggested_action: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum UIPageType {
    Desktop,                    // 桌面
    FileManagerEmpty,           // 文件管理器-空目录
    FileManagerBrowsing,        // 文件管理器-浏览中
    FileManagerWithVcf,         // 文件管理器-找到VCF文件
    ContactsApp,                // 联系人应用
    PermissionDialog,           // 权限对话框
    Unknown(String),            // 未知页面
}

#[derive(Debug, Serialize, Deserialize)]
pub enum NextAction {
    OpenFileManager,        // 打开文件管理器
    NavigateToDownloads,    // 导航到下载目录
    CheckDownloadFolder,    // 检查下载文件夹
    LookForVcfFile,        // 查找VCF文件
    ClickVcfFile,          // 点击VCF文件
    ConfirmImport,         // 确认导入
    GrantPermission,       // 授予权限
    AnalyzeCurrentState,   // 分析当前状态
}

/// 实时读取设备UI界面状态
#[tauri::command]
pub async fn read_device_ui_state(device_id: String) -> Result<DeviceUIState, String> {
    println!("🔍 开始读取设备 {} 的UI状态", device_id);
    
    // 1. 使用adb获取当前UI dump
    let ui_xml = get_ui_dump(&device_id).await?;
    
    // 2. 解析XML获取关键元素
    let elements = parse_ui_elements(&ui_xml)?;
    
    // 3. 分析页面类型
    let page_type = analyze_ui_state(&elements);
    
    // 4. 建议下一步操作
    let suggested_action = suggest_next_action(&page_type, &elements);
    
    // 5. 获取当前时间戳
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    let ui_state = DeviceUIState {
        device_id: device_id.clone(),
        xml_content: ui_xml,
        elements,
        timestamp,
        page_type: format!("{:?}", page_type),
        suggested_action: format!("{:?}", suggested_action),
    };
    
    println!("✅ UI状态读取完成，页面类型: {:?}, 建议操作: {:?}", page_type, suggested_action);
    
    // 保存到文件供调试
    let _ = save_ui_state_to_file(&ui_state, "current_ui_state.xml").await;
    
    Ok(ui_state)
}

/// 获取设备UI dump XML
async fn get_ui_dump(device_id: &str) -> Result<String, String> {
    println!("📱 正在获取设备 {} 的UI dump...", device_id);
    
    // 先尝试刷新UI dump
    let refresh_result = AsyncCommand::new("adb")
        .args(&["-s", device_id, "shell", "uiautomator", "dump"])
        .output()
        .await;
    
    match refresh_result {
        Ok(output) if output.status.success() => {
            println!("🔄 UI dump刷新成功");
        }
        Ok(output) => {
            let error = String::from_utf8_lossy(&output.stderr);
            println!("⚠️ UI dump刷新警告: {}", error);
        }
        Err(e) => {
            println!("⚠️ UI dump刷新失败: {}", e);
        }
    }
    
    // 等待一下让UI dump生成
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    // 读取UI dump文件
    let result = AsyncCommand::new("adb")
        .args(&["-s", device_id, "shell", "cat", "/sdcard/window_dump.xml"])
        .output()
        .await;
    
    match result {
        Ok(output) if output.status.success() => {
            let xml_content = String::from_utf8_lossy(&output.stdout).to_string();
            if xml_content.trim().is_empty() {
                return Err("UI dump文件为空".to_string());
            }
            println!("📄 成功读取UI dump，大小: {} 字符", xml_content.len());
            Ok(xml_content)
        }
        Ok(output) => {
            let error = String::from_utf8_lossy(&output.stderr);
            Err(format!("读取UI dump失败: {}", error))
        }
        Err(e) => Err(format!("执行adb命令失败: {}", e)),
    }
}

/// 解析XML内容获取UI元素
fn parse_ui_elements(xml_content: &str) -> Result<Vec<UIElement>, String> {
    let mut elements = Vec::new();
    
    // 使用字符串匹配解析元素
    let lines: Vec<&str> = xml_content.lines().collect();
    
    for line in lines {
        if line.contains("<node") && line.contains("bounds=") {
            if let Ok(element) = parse_node_element(line) {
                elements.push(element);
            }
        }
    }
    
    println!("🔍 解析到 {} 个UI元素", elements.len());
    Ok(elements)
}

/// 解析单个node元素
fn parse_node_element(line: &str) -> Result<UIElement, String> {
    // 提取各个属性
    let text = extract_attribute(line, "text").unwrap_or_default();
    let resource_id = extract_attribute(line, "resource-id").unwrap_or_default();
    let class = extract_attribute(line, "class").unwrap_or_default();
    let package = extract_attribute(line, "package").unwrap_or_default();
    let content_desc = extract_attribute(line, "content-desc").unwrap_or_default();
    let bounds = extract_attribute(line, "bounds").unwrap_or_default();
    
    let clickable = extract_attribute(line, "clickable")
        .unwrap_or("false".to_string()) == "true";
    
    Ok(UIElement {
        text,
        resource_id,
        class,
        package,
        content_desc,
        clickable,
        bounds,
    })
}

/// 提取XML属性值
fn extract_attribute(line: &str, attr_name: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr_name);
    if let Some(start) = line.find(&pattern) {
        let start_pos = start + pattern.len();
        if let Some(end) = line[start_pos..].find('"') {
            return Some(line[start_pos..start_pos + end].to_string());
        }
    }
    None
}

/// 分析当前UI状态并识别页面类型
fn analyze_ui_state(elements: &[UIElement]) -> UIPageType {
    if elements.is_empty() {
        return UIPageType::Unknown("no_elements".to_string());
    }
    
    // 检查当前应用包名
    if let Some(first_element) = elements.first() {
        println!("🧠 分析UI状态，package: {}", first_element.package);
        
        match first_element.package.as_str() {
            "com.android.documentsui" => {
                if elements.iter().any(|e| e.text.contains("无任何文件") || e.text.contains("No items")) {
                    UIPageType::FileManagerEmpty
                } else if elements.iter().any(|e| e.text.contains("contacts_import.vcf") || e.text.contains(".vcf")) {
                    UIPageType::FileManagerWithVcf
                } else {
                    UIPageType::FileManagerBrowsing
                }
            }
            "com.android.contacts" => UIPageType::ContactsApp,
            "com.android.packageinstaller" => UIPageType::PermissionDialog,
            package if package.contains("launcher") => UIPageType::Desktop,
            _ => UIPageType::Unknown(first_element.package.clone()),
        }
    } else {
        UIPageType::Unknown("no_elements".to_string())
    }
}

/// 根据UI状态建议下一步操作
fn suggest_next_action(page_type: &UIPageType, elements: &[UIElement]) -> NextAction {
    match page_type {
        UIPageType::Desktop => NextAction::OpenFileManager,
        UIPageType::FileManagerEmpty => {
            // 检查是否在下载目录
            if elements.iter().any(|e| e.text.contains("最近") || e.text.contains("Download") || e.text.contains("下载")) {
                NextAction::CheckDownloadFolder
            } else {
                NextAction::NavigateToDownloads
            }
        }
        UIPageType::FileManagerBrowsing => NextAction::LookForVcfFile,
        UIPageType::FileManagerWithVcf => NextAction::ClickVcfFile,
        UIPageType::ContactsApp => NextAction::ConfirmImport,
        UIPageType::PermissionDialog => NextAction::GrantPermission,
        UIPageType::Unknown(_) => NextAction::AnalyzeCurrentState,
    }
}

/// 保存UI状态到文件（用于调试）
async fn save_ui_state_to_file(ui_state: &DeviceUIState, file_path: &str) -> Result<(), String> {
    use tokio::fs;
    
    let content = format!(
        "<!-- UI状态时间: {} -->\n<!-- 设备ID: {} -->\n<!-- 页面类型: {} -->\n<!-- 建议操作: {} -->\n<!-- 元素数量: {} -->\n{}",
        ui_state.timestamp,
        ui_state.device_id,
        ui_state.page_type,
        ui_state.suggested_action,
        ui_state.elements.len(),
        ui_state.xml_content
    );
    
    fs::write(file_path, content)
        .await
        .map_err(|e| format!("保存文件失败: {}", e))?;
    
    println!("💾 UI状态已保存到: {}", file_path);
    Ok(())
}

/// 查找特定类型的UI元素
#[tauri::command]
pub async fn find_ui_elements(
    device_id: String,
    element_type: String, // "clickable", "text", "resource_id"
    search_value: String,
) -> Result<Vec<UIElement>, String> {
    let ui_state = read_device_ui_state(device_id).await?;
    
    let matching_elements: Vec<UIElement> = ui_state.elements
        .into_iter()
        .filter(|element| {
            match element_type.as_str() {
                "clickable" => element.clickable,
                "text" => element.text.contains(&search_value),
                "resource_id" => element.resource_id.contains(&search_value),
                "content_desc" => element.content_desc.contains(&search_value),
                "class" => element.class.contains(&search_value),
                _ => false,
            }
        })
        .collect();
    
    println!("🔍 找到 {} 个匹配的UI元素", matching_elements.len());
    Ok(matching_elements)
}