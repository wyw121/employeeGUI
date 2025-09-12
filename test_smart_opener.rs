// 测试智能VCF打开器
use std::process::Command;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🤖 测试智能VCF打开器");
    
    // 确认设备连接
    let devices_output = Command::new("adb")
        .args(&["devices"])
        .output()?;
    
    let devices_str = String::from_utf8_lossy(&devices_output.stdout);
    println!("设备列表:\n{}", devices_str);
    
    let device_id = extract_device_id(&devices_str)?;
    println!("🎯 使用设备: {}", device_id);
    
    // 根据当前UI状态，我们知道设备显示应用选择对话框
    // 我们需要点击"始终"按钮来选择通讯录
    
    println!("📱 当前状态: 应用选择对话框");
    println!("👆 准备点击'始终'按钮...");
    
    // 点击"始终"按钮 (从XML分析得到的坐标)
    let click_result = Command::new("adb")
        .args(&["-s", &device_id, "shell", "input", "tap", "883", "1660"])
        .output()?;
    
    if click_result.status.success() {
        println!("✅ 成功点击'始终'按钮");
    } else {
        let error = String::from_utf8_lossy(&click_result.stderr);
        println!("❌ 点击失败: {}", error);
    }
    
    // 等待UI响应
    println!("⏳ 等待UI响应...");
    std::thread::sleep(std::time::Duration::from_millis(3000));
    
    // 再次检查UI状态
    let _ = Command::new("adb")
        .args(&["-s", &device_id, "shell", "uiautomator", "dump"])
        .output()?;
    
    std::thread::sleep(std::time::Duration::from_millis(1000));
    
    let xml_output = Command::new("adb")
        .args(&["-s", &device_id, "shell", "cat", "/sdcard/window_dump.xml"])
        .output()?;
    
    if xml_output.status.success() {
        let xml_content = String::from_utf8_lossy(&xml_output.stdout);
        std::fs::write("ui_after_click.xml", xml_content.as_bytes())?;
        println!("💾 点击后的UI状态已保存到: ui_after_click.xml");
        
        // 分析新状态
        if xml_content.contains("package=\"com.android.contacts\"") {
            println!("🎉 成功进入联系人应用！");
        } else if xml_content.contains("导入") || xml_content.contains("Import") {
            println!("📥 检测到导入界面");
        } else {
            println!("❓ UI状态未知，请检查 ui_after_click.xml");
        }
    }
    
    println!("🎉 测试完成！");
    Ok(())
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