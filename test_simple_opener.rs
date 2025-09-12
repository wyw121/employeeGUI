// 测试智能VCF打开器 - 简化版本
use std::process::Command;
use std::thread;
use std::time::Duration;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🤖 测试智能VCF打开器 - 简化版本");
    
    // 确认设备连接
    let devices_output = Command::new("adb")
        .args(&["devices"])
        .output()?;
    
    let devices_str = String::from_utf8_lossy(&devices_output.stdout);
    println!("设备列表:\n{}", devices_str);
    
    let device_id = extract_device_id(&devices_str)?;
    println!("🎯 使用设备: {}", device_id);
    
    // 第一步：读取当前UI状态
    println!("📍 第1步: 读取当前UI状态");
    let ui_state = get_ui_state(&device_id)?;
    analyze_current_state(&ui_state);
    
    // 第二步：基于UI状态执行操作
    if ui_state.contains("使用通讯录打开") {
        println!("📍 第2步: 检测到应用选择对话框");
        
        if ui_state.contains("始终") {
            println!("👆 点击'始终'按钮...");
            // 从XML解析坐标: bounds="[827,1613][939,1708]"
            // 中心点: (883, 1660)
            click_coordinates(&device_id, 883, 1660)?;
            println!("✅ 已点击'始终'按钮");
        } else if ui_state.contains("仅此一次") {
            println!("👆 点击'仅此一次'按钮...");
            // 从XML解析坐标: bounds="[685,1613][827,1708]"
            // 中心点: (756, 1660)
            click_coordinates(&device_id, 756, 1660)?;
            println!("✅ 已点击'仅此一次'按钮");
        }
        
        // 等待UI响应
        println!("⏳ 等待UI响应 (3秒)...");
        thread::sleep(Duration::from_millis(3000));
        
        // 第三步：检查新状态
        println!("📍 第3步: 检查操作后的UI状态");
        let new_ui_state = get_ui_state(&device_id)?;
        
        // 保存新状态
        std::fs::write("ui_after_action.xml", new_ui_state.as_bytes())?;
        println!("💾 新UI状态已保存到: ui_after_action.xml");
        
        analyze_result_state(&new_ui_state);
    } else {
        println!("❓ 未识别的UI状态，无法执行自动操作");
        println!("💡 建议手动检查设备屏幕");
    }
    
    println!("🎉 测试完成！");
    Ok(())
}

fn get_ui_state(device_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    // 刷新UI dump
    let _ = Command::new("adb")
        .args(&["-s", device_id, "shell", "uiautomator", "dump"])
        .output()?;
    
    thread::sleep(Duration::from_millis(1000));
    
    // 读取UI XML
    let result = Command::new("adb")
        .args(&["-s", device_id, "shell", "cat", "/sdcard/window_dump.xml"])
        .output()?;
    
    if !result.status.success() {
        let error = String::from_utf8_lossy(&result.stderr);
        return Err(format!("读取UI失败: {}", error).into());
    }
    
    let xml_content = String::from_utf8_lossy(&result.stdout).to_string();
    
    if xml_content.trim().is_empty() {
        return Err("UI内容为空".into());
    }
    
    Ok(xml_content)
}

fn click_coordinates(device_id: &str, x: i32, y: i32) -> Result<(), Box<dyn std::error::Error>> {
    println!("👆 点击坐标: ({}, {})", x, y);
    
    let result = Command::new("adb")
        .args(&["-s", device_id, "shell", "input", "tap", &x.to_string(), &y.to_string()])
        .output()?;
    
    if !result.status.success() {
        let error = String::from_utf8_lossy(&result.stderr);
        return Err(format!("点击失败: {}", error).into());
    }
    
    Ok(())
}

fn analyze_current_state(ui_content: &str) {
    println!("🧠 分析当前UI状态:");
    
    if ui_content.contains("使用通讯录打开") {
        println!("  📱 状态: 应用选择对话框");
        println!("  🎯 目标: 选择通讯录应用");
        
        if ui_content.contains("始终") {
            println!("  ✅ 可选操作: 点击'始终'按钮");
        }
        if ui_content.contains("仅此一次") {
            println!("  ✅ 可选操作: 点击'仅此一次'按钮");
        }
    } else if ui_content.contains("package=\"com.android.contacts\"") {
        println!("  📱 状态: 联系人应用");
        println!("  🎯 目标: 查找导入选项");
    } else if ui_content.contains("package=\"com.android.documentsui\"") {
        println!("  📱 状态: 文件管理器");
        println!("  🎯 目标: 查找VCF文件");
    } else {
        println!("  ❓ 状态: 未知应用");
    }
}

fn analyze_result_state(ui_content: &str) {
    println!("🧠 分析操作结果:");
    
    if ui_content.contains("package=\"com.android.contacts\"") {
        println!("  🎉 成功: 已进入联系人应用");
        
        if ui_content.contains("导入") || ui_content.contains("Import") {
            println!("  📥 发现: 导入选项可用");
        }
        
        if ui_content.contains("联系人") {
            println!("  👥 确认: 在联系人界面");
        }
    } else if ui_content.contains("使用通讯录打开") {
        println!("  ⚠️ 状态: 仍在应用选择界面");
        println!("  💡 建议: 可能需要再次点击");
    } else {
        println!("  ❓ 状态: 进入了其他界面");
        println!("  💡 建议: 检查ui_after_action.xml文件");
    }
}

fn extract_device_id(devices_output: &str) -> Result<String, Box<dyn std::error::Error>> {
    for line in devices_output.lines() {
        if line.contains("device") && !line.contains("List of devices") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 && parts[1] == "device" {
                return Ok(parts[0].to_string());
            }
        }
    }
    Err("没有找到连接的设备".into())
}