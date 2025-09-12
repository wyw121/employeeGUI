// 测试UI读取功能的独立程序
use std::process::Command;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 开始测试设备UI读取功能");
    
    // 1. 检查设备连接
    println!("📱 检查ADB设备连接...");
    let devices_output = Command::new("adb")
        .args(&["devices"])
        .output()?;
    
    let devices_str = String::from_utf8_lossy(&devices_output.stdout);
    println!("设备列表:\n{}", devices_str);
    
    // 提取设备ID
    let device_id = extract_device_id(&devices_str)?;
    println!("🎯 使用设备: {}", device_id);
    
    // 2. 获取UI dump
    println!("📄 获取UI dump...");
    let dump_result = Command::new("adb")
        .args(&["-s", &device_id, "shell", "uiautomator", "dump"])
        .output()?;
    
    if !dump_result.status.success() {
        let error = String::from_utf8_lossy(&dump_result.stderr);
        eprintln!("❌ UI dump失败: {}", error);
        return Err(format!("UI dump失败: {}", error).into());
    }
    
    println!("✅ UI dump成功");
    
    // 3. 读取UI XML
    println!("📖 读取UI XML文件...");
    let xml_output = Command::new("adb")
        .args(&["-s", &device_id, "shell", "cat", "/sdcard/window_dump.xml"])
        .output()?;
    
    if !xml_output.status.success() {
        let error = String::from_utf8_lossy(&xml_output.stderr);
        eprintln!("❌ 读取XML失败: {}", error);
        return Err(format!("读取XML失败: {}", error).into());
    }
    
    let xml_content = String::from_utf8_lossy(&xml_output.stdout);
    
    if xml_content.trim().is_empty() {
        eprintln!("❌ XML内容为空");
        return Err("XML内容为空".into());
    }
    
    println!("✅ XML读取成功，大小: {} 字符", xml_content.len());
    
    // 4. 保存到文件
    std::fs::write("current_ui_real.xml", xml_content.as_bytes())?;
    println!("💾 XML已保存到: current_ui_real.xml");
    
    // 5. 分析UI内容
    analyze_ui_content(&xml_content)?;
    
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

fn analyze_ui_content(xml_content: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧠 分析UI内容...");
    
    // 查找包名
    if let Some(package_start) = xml_content.find("package=\"") {
        let package_start = package_start + 9;
        if let Some(package_end) = xml_content[package_start..].find('"') {
            let package = &xml_content[package_start..package_start + package_end];
            println!("📦 当前应用包名: {}", package);
            
            // 分析应用类型
            match package {
                "com.android.documentsui" => {
                    println!("📁 识别为: 文件管理器应用");
                    if xml_content.contains("无任何文件") || xml_content.contains("No items") {
                        println!("📂 状态: 空目录");
                    } else if xml_content.contains(".vcf") || xml_content.contains("contacts") {
                        println!("📄 状态: 发现联系人文件");
                    } else {
                        println!("📋 状态: 浏览文件中");
                    }
                }
                "com.android.contacts" => {
                    println!("👥 识别为: 联系人应用");
                }
                package if package.contains("launcher") => {
                    println!("🏠 识别为: 桌面启动器");
                }
                _ => {
                    println!("❓ 未知应用: {}", package);
                }
            }
        }
    }
    
    // 统计UI元素
    let clickable_count = xml_content.matches("clickable=\"true\"").count();
    let text_elements = xml_content.matches("text=\"").filter(|_| true).count();
    
    println!("📊 UI统计:");
    println!("  • 可点击元素: {} 个", clickable_count);
    println!("  • 文本元素: {} 个", text_elements);
    
    // 查找关键元素
    if xml_content.contains("contacts_import.vcf") {
        println!("🎯 发现VCF文件: contacts_import.vcf");
    }
    
    if xml_content.contains("下载") || xml_content.contains("Download") {
        println!("📥 发现下载相关元素");
    }
    
    Ok(())
}