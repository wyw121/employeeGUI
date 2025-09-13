use anyhow::Result;
use std::process::Command;
use tracing::info;

/// 详细分析小红书UI结构
pub async fn analyze_xiaohongshu_ui(device_id: &str) -> Result<()> {
    info!("🔍 开始详细分析小红书UI结构...");
    
    // 获取UI dump
    let ui_dump = get_ui_dump(device_id).await?;
    
    info!("📊 UI dump总长度: {} 字符", ui_dump.len());
    
    // 分析关键元素
    analyze_clickable_elements(&ui_dump);
    analyze_navigation_elements(&ui_dump);
    analyze_avatar_elements(&ui_dump);
    
    Ok(())
}

async fn get_ui_dump(device_id: &str) -> Result<String> {
    let _dump_output = Command::new("adb")
        .args(&["-s", device_id, "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"])
        .output()?;

    let output = Command::new("adb")
        .args(&["-s", device_id, "shell", "cat", "/sdcard/ui_dump.xml"])
        .output()?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn analyze_clickable_elements(ui_dump: &str) {
    info!("🖱️ 分析可点击元素...");
    
    let mut count = 0;
    for line in ui_dump.lines() {
        if line.contains("clickable=\"true\"") {
            count += 1;
            
            // 提取关键信息
            let text = extract_attribute(line, "text").unwrap_or_default();
            let resource_id = extract_attribute(line, "resource-id").unwrap_or_default();
            let bounds = extract_attribute(line, "bounds").unwrap_or_default();
            let content_desc = extract_attribute(line, "content-desc").unwrap_or_default();
            
            if !text.is_empty() || !content_desc.is_empty() || resource_id.contains("avatar") || 
               resource_id.contains("profile") || resource_id.contains("menu") {
                info!("  [{}] 文本:'{}' 描述:'{}' ID:'{}' 位置:'{}'", 
                     count, text, content_desc, resource_id, bounds);
            }
        }
    }
    
    info!("📊 总计可点击元素: {}", count);
}

fn analyze_navigation_elements(ui_dump: &str) {
    info!("🧭 分析导航元素...");
    
    let nav_keywords = vec!["首页", "推荐", "关注", "发现", "我"];
    
    for keyword in nav_keywords {
        for line in ui_dump.lines() {
            if line.contains(&format!("text=\"{}\"", keyword)) {
                let bounds = extract_attribute(line, "bounds").unwrap_or_default();
                let clickable = line.contains("clickable=\"true\"");
                info!("  导航项 '{}': 位置:{} 可点击:{}", keyword, bounds, clickable);
            }
        }
    }
}

fn analyze_avatar_elements(ui_dump: &str) {
    info!("👤 分析头像/菜单元素...");
    
    let avatar_keywords = vec!["avatar", "profile", "menu", "头像", "菜单"];
    
    for keyword in avatar_keywords {
        for line in ui_dump.lines() {
            if line.to_lowercase().contains(&keyword.to_lowercase()) {
                let text = extract_attribute(line, "text").unwrap_or_default();
                let resource_id = extract_attribute(line, "resource-id").unwrap_or_default();
                let bounds = extract_attribute(line, "bounds").unwrap_or_default();
                let clickable = line.contains("clickable=\"true\"");
                
                info!("  头像相关 '{}': 文本:'{}' ID:'{}' 位置:{} 可点击:{}", 
                     keyword, text, resource_id, bounds, clickable);
            }
        }
    }
    
    // 分析左上角区域的元素
    info!("🔍 分析左上角区域元素...");
    for line in ui_dump.lines() {
        if let Some(bounds_str) = extract_attribute(line, "bounds") {
            if let Some((left, top, right, bottom)) = parse_bounds(&bounds_str) {
                // 左上角区域：x < 200, y < 200
                if left < 200 && top < 200 && line.contains("clickable=\"true\"") {
                    let text = extract_attribute(line, "text").unwrap_or_default();
                    let resource_id = extract_attribute(line, "resource-id").unwrap_or_default();
                    let content_desc = extract_attribute(line, "content-desc").unwrap_or_default();
                    
                    info!("  左上角元素: 位置:({},{},{},{}) 文本:'{}' 描述:'{}' ID:'{}'", 
                         left, top, right, bottom, text, content_desc, resource_id);
                }
            }
        }
    }
}

fn extract_attribute(line: &str, attr_name: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr_name);
    if let Some(start) = line.find(&pattern) {
        let start = start + pattern.len();
        if let Some(end) = line[start..].find('"') {
            return Some(line[start..start + end].to_string());
        }
    }
    None
}

fn parse_bounds(bounds_str: &str) -> Option<(i32, i32, i32, i32)> {
    let coords: Vec<i32> = bounds_str
        .replace("[", "")
        .replace("]", ",")
        .split(',')
        .filter_map(|s| s.trim().parse().ok())
        .collect();
    
    if coords.len() >= 4 {
        Some((coords[0], coords[1], coords[2], coords[3]))
    } else {
        None
    }
}