// 完成最后的导入步骤
use std::process::Command;
use std::thread;
use std::time::Duration;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🎯 完成VCF导入的最后步骤");
    
    // 确认设备连接
    let devices_output = Command::new("adb")
        .args(&["devices"])
        .output()?;
    
    let devices_str = String::from_utf8_lossy(&devices_output.stdout);
    let device_id = extract_device_id(&devices_str)?;
    println!("🎯 使用设备: {}", device_id);
    
    // 读取当前UI状态
    let ui_state = get_ui_state(&device_id)?;
    
    if ui_state.contains("要从 vCard 中导入联系人吗") {
        println!("📱 检测到: VCF导入确认对话框");
        println!("💬 消息: 要从 vCard 中导入联系人吗？");
        
        if ui_state.contains("确定") {
            println!("👆 点击'确定'按钮完成导入...");
            
            // 从XML解析坐标: bounds="[810,975][922,1070]"
            // 中心点: (866, 1022)
            click_coordinates(&device_id, 866, 1022)?;
            println!("✅ 已点击'确定'按钮");
            
            // 等待导入完成
            println!("⏳ 等待导入完成 (5秒)...");
            thread::sleep(Duration::from_millis(5000));
            
            // 检查最终状态
            let final_state = get_ui_state(&device_id)?;
            std::fs::write("ui_final_state.xml", final_state.as_bytes())?;
            println!("💾 最终UI状态已保存到: ui_final_state.xml");
            
            analyze_final_result(&final_state);
        }
    } else {
        println!("❓ 未检测到导入确认对话框");
        println!("💡 当前UI状态已保存，请检查current_ui_state.xml");
        std::fs::write("current_ui_state.xml", ui_state.as_bytes())?;
    }
    
    println!("🎉 VCF导入流程完成！");
    Ok(())
}

fn get_ui_state(device_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    let _ = Command::new("adb")
        .args(&["-s", device_id, "shell", "uiautomator", "dump"])
        .output()?;
    
    thread::sleep(Duration::from_millis(1000));
    
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

fn analyze_final_result(ui_content: &str) {
    println!("🎊 分析最终结果:");
    
    if ui_content.contains("package=\"com.android.contacts\"") {
        if ui_content.contains("联系人") || ui_content.contains("Contacts") {
            println!("  🎉 成功: VCF文件已导入到联系人应用");
            println!("  👥 状态: 现在在联系人应用主界面");
        } else {
            println!("  ✅ 成功: 仍在联系人应用中");
        }
        
        // 检查是否有成功消息
        if ui_content.contains("成功") || ui_content.contains("完成") || ui_content.contains("导入") {
            println!("  💚 确认: 检测到成功相关信息");
        }
    } else if ui_content.contains("launcher") {
        println!("  🏠 状态: 已返回桌面");
        println!("  💡 建议: 手动打开联系人应用检查导入结果");
    } else {
        println!("  ❓ 状态: 未知界面");
        println!("  💡 建议: 检查ui_final_state.xml确认状态");
    }
    
    println!("  🔍 验证: 可以手动打开联系人应用查看导入的联系人");
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