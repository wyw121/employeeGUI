// 通用UI查找器使用示例 - 展示如何适配各种应用和场景
// 这个模块完全适配任何Android应用的UI自动化需求

use crate::services::universal_ui_finder::*;

/// 使用示例：展示完整的功能演示
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 通用UI自动化查找器演示");
    println!("{}", "=".repeat(50));
    
    // 创建通用查找器实例
    let mut finder = UniversalUIFinder::new("adb", None)?;
    
    // 启用详细日志
    finder.set_logging(true, true);
    
    println!("📱 支持的应用列表:");
    for (i, app) in finder.get_supported_apps().iter().enumerate() {
        println!("   {}. {}", i + 1, app);
    }
    println!();
    
    // === 示例1: 小红书导航栏按钮 ===
    run_xiaohongshu_examples(&mut finder).await?;
    
    // === 示例2: 微信侧边栏按钮 ===
    run_wechat_examples(&mut finder).await?;
    
    // === 示例3: 支付宝复杂操作 ===
    run_alipay_examples(&mut finder).await?;
    
    // === 示例4: 批量操作演示 ===
    run_batch_operations(&mut finder).await?;
    
    // === 示例5: 🆕 直接ADB操作模式 ===
    run_direct_adb_examples(&mut finder).await?;
    
    // === 示例6: 自定义应用配置 ===
    run_custom_app_example(&mut finder).await?;
    
    println!("\n🎉 所有示例演示完成！");
    
    Ok(())
}

/// 小红书应用示例
async fn run_xiaohongshu_examples(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("📱 === 小红书应用示例 ===");
    
    // 1. 简单导航栏点击
    println!("\n1️⃣ 点击底部导航栏 '我' 按钮:");
    match finder.quick_click("小红书", "我").await {
        Ok(result) => println!("   ✅ 成功 - 耗时: {:?}", result.execution_time),
        Err(e) => println!("   ❌ 失败: {}", e),
    }
    
    // 2. 侧边栏按钮点击 (需要预操作)
    println!("\n2️⃣ 点击侧边栏 '关注好友' 按钮:");
    match finder.smart_click("小红书", "关注好友", "左侧边栏").await {
        Ok(result) => {
            println!("   ✅ 成功 - 耗时: {:?}", result.execution_time);
            if let Some(element) = &result.found_element {
                println!("   📍 找到元素位置: ({}, {})", 
                         element.bounds.center().0, element.bounds.center().1);
            }
        },
        Err(e) => println!("   ❌ 失败: {}", e),
    }
    
    // 3. 手动构建复杂请求
    println!("\n3️⃣ 手动配置复杂查找:");
    let request = FindRequest {
        app_name: "小红书".to_string(),
        target_text: "创作中心".to_string(),
        position_hint: Some("左侧边栏".to_string()),
        pre_actions: Some(vec![
            "右滑展开".to_string(),
            "等待动画800ms".to_string(),
        ]),
        user_guidance: true,
        timeout: Some(30),
        retry_count: Some(3),
    };
    
    match finder.find_and_click(request).await {
        Ok(result) => println!("   ✅ 创作中心访问成功"),
        Err(e) => println!("   ⚠️ 创作中心访问: {}", e),
    }
    
    Ok(())
}

/// 微信应用示例
async fn run_wechat_examples(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("\n📱 === 微信应用示例 ===");
    
    // 1. 基础导航
    println!("\n1️⃣ 微信底部导航:");
    let wechat_nav_buttons = vec!["微信", "通讯录", "发现", "我"];
    
    for button in wechat_nav_buttons {
        match finder.quick_click("微信", button).await {
            Ok(_) => println!("   ✅ {} 按钮点击成功", button),
            Err(e) => println!("   ❌ {} 按钮失败: {}", button, e),
        }
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
    
    // 2. 个人页面设置
    println!("\n2️⃣ 访问微信设置页面:");
    match finder.smart_click("微信", "设置", "个人页面").await {
        Ok(_) => println!("   ✅ 设置页面打开成功"),
        Err(e) => println!("   ⚠️ 设置页面: {}", e),
    }
    
    Ok(())
}

/// 支付宝应用示例
async fn run_alipay_examples(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("\n📱 === 支付宝应用示例 ===");
    
    // 支付宝导航测试
    let alipay_buttons = vec!["首页", "理财", "生活", "口碑", "我的"];
    
    for button in alipay_buttons {
        println!("🔄 测试支付宝 '{}' 按钮", button);
        match finder.smart_click("支付宝", button, "下方导航栏").await {
            Ok(result) => {
                println!("   ✅ 成功 - 置信度: {:.1}%", 
                         result.found_element
                               .map(|e| e.confidence * 100.0 / 100.0)
                               .unwrap_or(0.0));
            },
            Err(e) => println!("   ❌ 失败: {}", e),
        }
    }
    
    Ok(())
}

/// 批量操作示例
async fn run_batch_operations(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("\n📱 === 批量操作示例 ===");
    
    let batch_ops = vec![
        BatchOperation {
            app_name: "小红书".to_string(),
            button_text: "我".to_string(),
            position_hint: Some("下方导航栏".to_string()),
            delay_after: Some(1000),
        },
        BatchOperation {
            app_name: "小红书".to_string(),
            button_text: "关注好友".to_string(),
            position_hint: Some("左侧边栏".to_string()),
            delay_after: Some(1500),
        },
        BatchOperation {
            app_name: "小红书".to_string(),
            button_text: "首页".to_string(),
            position_hint: Some("下方导航栏".to_string()),
            delay_after: None,
        },
    ];
    
    println!("🔄 执行批量操作序列 ({} 个操作)", batch_ops.len());
    
    match finder.batch_click(batch_ops).await {
        Ok(results) => {
            let success_count = results.iter().filter(|r| r.success).count();
            println!("   📊 批量操作完成: {}/{} 成功", success_count, results.len());
            
            for (i, result) in results.iter().enumerate() {
                let status = if result.success { "✅" } else { "❌" };
                println!("      {}. {} (耗时: {:?})", i + 1, status, result.execution_time);
            }
        },
        Err(e) => println!("   ❌ 批量操作失败: {}", e),
    }
    
    Ok(())
}

/// 自定义应用配置示例
async fn run_custom_app_example(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("\n📱 === 自定义应用配置示例 ===");
    
    // 添加一个自定义应用配置 (例如: 抖音)
    let douyin_config = AppConfig {
        package_name: "com.ss.android.ugc.aweme".to_string(),
        app_name: "抖音".to_string(),
        navigation_height: 128,
        button_min_size: (60, 35),
        button_max_size: (280, 90),
        common_buttons: vec![
            "首页".to_string(), "朋友".to_string(), "拍摄".to_string(), 
            "消息".to_string(), "我".to_string()
        ],
        sidebar_buttons: vec!["创作者服务中心".to_string(), "钱包".to_string()],
        requires_sidebar_for_follow: false,
        settings_in_profile: true,
        special_gestures: std::collections::HashMap::new(),
    };
    
    finder.add_custom_app("抖音".to_string(), douyin_config);
    
    println!("✅ 已添加抖音自定义配置");
    println!("📱 更新后支持的应用列表:");
    for (i, app) in finder.get_supported_apps().iter().enumerate() {
        let marker = if app == "抖音" { " 🆕" } else { "" };
        println!("   {}. {}{}", i + 1, app, marker);
    }
    
    // 测试自定义应用
    println!("\n🧪 测试自定义抖音配置:");
    match finder.quick_click("抖音", "我").await {
        Ok(_) => println!("   ✅ 抖音配置测试成功"),
        Err(e) => println!("   ⚠️ 抖音配置测试: {}", e),
    }
    
    Ok(())
}

/// 仅查找元素示例 (不执行点击)
async fn example_find_only(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("\n🔍 === 仅查找元素示例 ===");
    
    let request = FindRequest {
        app_name: "小红书".to_string(),
        target_text: "我".to_string(),
        position_hint: Some("下方导航栏".to_string()),
        pre_actions: None,
        user_guidance: false, // 禁用用户交互
        timeout: Some(10),
        retry_count: Some(1),
    };
    
    match finder.find_element_only(request).await {
        Ok(element) => {
            println!("✅ 找到元素:");
            println!("   📝 文本: '{}'", element.text);
            println!("   📍 位置: ({}, {})", element.bounds.center().0, element.bounds.center().1);
            println!("   📏 尺寸: {}x{}", element.bounds.width(), element.bounds.height());
            println!("   🎯 置信度: {:.1}%", element.confidence);
        },
        Err(e) => println!("❌ 查找失败: {}", e),
    }
    
    Ok(())
}

/// 错误处理和用户交互示例
async fn example_error_handling(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("\n🛠️ === 错误处理示例 ===");
    
    // 故意使用不存在的按钮测试错误处理
    let request = FindRequest {
        app_name: "小红书".to_string(),
        target_text: "不存在的按钮".to_string(), // 故意使用错误文本
        position_hint: Some("下方导航栏".to_string()),
        pre_actions: None,
        user_guidance: true, // 启用用户交互
        timeout: Some(10),
        retry_count: Some(2),
    };
    
    match finder.find_and_click(request).await {
        Ok(result) => {
            if result.user_intervention {
                println!("⚠️ 需要用户干预才完成操作");
            } else {
                println!("✅ 意外成功 (可能用户手动调整了)");
            }
        },
        Err(e) => {
            match e {
                FindError::ElementNotFound(_) => {
                    println!("❌ 预期的元素未找到错误: {}", e);
                },
                FindError::UserSkipped(_) => {
                    println!("⏭️ 用户选择跳过: {}", e);
                },
                _ => {
                    println!("❌ 其他错误: {}", e);
                }
            }
        }
    }
    
    Ok(())
}

/// 🆕 直接ADB操作示例 - 跳过应用检测
async fn run_direct_adb_examples(finder: &mut UniversalUIFinder) 
    -> Result<(), Box<dyn std::error::Error>> {
    
    println!("\n🔧 === 直接ADB操作示例 ===");
    println!("   💡 此模式跳过应用检测，直接执行UI操作");
    println!("   🎯 适用场景：测试当前界面、调试UI元素、快速验证");
    
    // 1. 简单的直接点击
    println!("\n1️⃣ 直接点击按钮 (无应用检测):");
    match finder.direct_click("我", Some("下方导航栏")).await {
        Ok(result) => {
            println!("   ✅ 直接点击成功 - 耗时: {:?}", result.execution_time);
            println!("   📍 跳过了应用检测步骤，直接定位并点击");
        },
        Err(e) => println!("   ⚠️ 直接点击: {}", e),
    }
    
    // 2. 带预操作的直接点击
    println!("\n2️⃣ 直接点击 + 预操作 (侧边栏展开):");
    let pre_actions = vec![
        "右滑展开".to_string(),
        "等待动画800ms".to_string(),
    ];
    
    match finder.direct_click_with_actions("关注好友", Some("左侧边栏"), pre_actions).await {
        Ok(result) => {
            println!("   ✅ 复杂直接操作成功");
            if let Some(element) = &result.found_element {
                println!("   📍 元素位置: ({}, {})", 
                         element.bounds.center().0, element.bounds.center().1);
                println!("   🎯 置信度: {:.1}%", element.confidence);
            }
        },
        Err(e) => println!("   ⚠️ 复杂直接操作: {}", e),
    }
    
    // 3. 手动构建直接ADB请求
    println!("\n3️⃣ 自定义直接ADB请求:");
    let direct_request = FindRequest {
        app_name: None, // 🔑 关键：设为None跳过应用检测
        target_text: "搜索".to_string(),
        position_hint: Some("顶部工具栏".to_string()),
        pre_actions: Some(vec!["等待页面加载".to_string()]),
        user_guidance: false, // 禁用用户交互，加快测试
        timeout: Some(10),
        retry_count: Some(1),
    };
    
    match finder.find_and_click(direct_request).await {
        Ok(result) => {
            println!("   ✅ 自定义直接请求成功");
            println!("   ⚡ 模式验证: 无应用检测 + 快速执行");
        },
        Err(e) => println!("   ⚠️ 自定义直接请求: {}", e),
    }
    
    // 4. 性能对比测试
    println!("\n4️⃣ 性能对比：指定应用 vs 直接ADB");
    
    // 测试指定应用模式的耗时
    let start_time = std::time::Instant::now();
    let _result1 = finder.quick_click("小红书", "我").await;
    let app_mode_time = start_time.elapsed();
    
    // 测试直接ADB模式的耗时
    let start_time = std::time::Instant::now();
    let _result2 = finder.direct_click("我", Some("下方导航栏")).await;
    let direct_mode_time = start_time.elapsed();
    
    println!("   📊 性能对比结果:");
    println!("      🏷️  指定应用模式: {:?}", app_mode_time);
    println!("      🔧 直接ADB模式: {:?}", direct_mode_time);
    
    if direct_mode_time < app_mode_time {
        let speedup = app_mode_time.as_millis() as f64 / direct_mode_time.as_millis() as f64;
        println!("      🚀 直接模式快 {:.1}x", speedup);
    }
    
    println!("\n💡 直接ADB模式使用建议:");
    println!("   ✅ 适用场景: UI测试、调试验证、当前界面操作");
    println!("   ❌ 不适用: 跨应用切换、需要应用状态管理的场景");
    println!("   ⚡ 优势: 跳过应用检测，执行速度更快");
    
    Ok(())
}

// 辅助函数：等待用户确认
async fn wait_for_user_confirmation(message: &str) {
    println!("⏸️  {}", message);
    print!("按 Enter 继续...");
    let mut input = String::new();
    std::io::stdin().read_line(&mut input).unwrap();
}