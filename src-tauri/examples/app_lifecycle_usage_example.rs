// AppLifecycleManager 使用示例
//
// 此示例展示如何使用新创建的独立应用生命周期管理模块

use crate::services::app_lifecycle_manager::{AppLifecycleManager, AppLaunchConfig, LaunchMethod};
use crate::services::adb_service::AdbService;

/// 使用示例：基本的应用启动流程
pub async fn basic_app_launch_example() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 开始应用生命周期管理示例");
    
    // 1. 创建 ADB 服务实例
    let adb_service = AdbService::new();
    
    // 2. 创建应用生命周期管理器
    let lifecycle_manager = AppLifecycleManager::new(adb_service);
    
    // 3. 配置启动参数
    let config = AppLaunchConfig {
        max_retries: 3,                    // 最大重试次数
        launch_timeout_secs: 30,           // 启动超时时间（秒）
        ready_check_interval_ms: 2000,     // 就绪检查间隔（毫秒）
        launch_method: LaunchMethod::ActivityManager, // 首选启动方法
        package_name: Some("com.xingin.xhs".to_string()), // 小红书包名
    };
    
    // 4. 启动应用并等待就绪
    let device_id = "your_device_id"; // 替换为实际设备ID
    let app_name = "小红书";
    
    match lifecycle_manager.ensure_app_running(device_id, app_name, config).await {
        Ok(result) => {
            println!("✅ 应用启动成功！");
            println!("📱 应用状态: {:?}", result.final_state);
            println!("⏱️  总耗时: {:?}ms", result.total_duration_ms);
            println!("🔄 重试次数: {}", result.retry_count);
            println!("📝 执行日志:");
            for log in result.execution_logs {
                println!("   {}", log);
            }
        },
        Err(error) => {
            println!("❌ 应用启动失败: {}", error.message);
            println!("📝 错误日志:");
            for log in error.execution_logs {
                println!("   {}", log);
            }
            return Err(error.message.into());
        }
    }
    
    Ok(())
}

/// 使用示例：高级配置的应用启动
pub async fn advanced_app_launch_example() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔧 高级应用生命周期管理示例");
    
    let adb_service = AdbService::new();
    let lifecycle_manager = AppLifecycleManager::new(adb_service);
    
    // 高级配置：更长的超时时间和更频繁的检查
    let advanced_config = AppLaunchConfig {
        max_retries: 5,                    // 增加重试次数
        launch_timeout_secs: 60,           // 更长的超时时间
        ready_check_interval_ms: 1000,     // 更频繁的检查间隔
        launch_method: LaunchMethod::MonkeyRunner, // 使用 Monkey 启动方法
        package_name: Some("com.tencent.mm".to_string()), // 微信包名
    };
    
    let device_id = "your_device_id";
    let app_name = "微信";
    
    println!("🚀 使用高级配置启动 {}", app_name);
    
    let result = lifecycle_manager.ensure_app_running(device_id, app_name, advanced_config).await;
    
    match result {
        Ok(success_result) => {
            println!("✅ {} 启动成功！", app_name);
            println!("📊 执行统计:");
            println!("   - 应用状态: {:?}", success_result.final_state);
            println!("   - 总耗时: {}ms", success_result.total_duration_ms);
            println!("   - 重试次数: {}", success_result.retry_count);
            println!("   - 日志条目: {}", success_result.execution_logs.len());
        },
        Err(failure_result) => {
            println!("❌ {} 启动失败", app_name);
            println!("💡 故障排除信息:");
            println!("   - 错误信息: {}", failure_result.message);
            println!("   - 重试次数: {}", failure_result.retry_count);
            
            // 打印详细的执行日志用于调试
            println!("📋 详细执行日志:");
            for (index, log_entry) in failure_result.execution_logs.iter().enumerate() {
                println!("   {}. {}", index + 1, log_entry);
            }
        }
    }
    
    Ok(())
}

/// 使用示例：集成到现有服务中
pub async fn integration_example() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔗 集成示例：在现有服务中使用应用生命周期管理");
    
    // 模拟现有服务的上下文
    let adb_service = AdbService::new();
    let lifecycle_manager = AppLifecycleManager::new(adb_service);
    
    // 通用配置可以作为服务的默认配置
    let default_config = AppLaunchConfig {
        max_retries: 3,
        launch_timeout_secs: 45,
        ready_check_interval_ms: 1500,
        launch_method: LaunchMethod::ActivityManager,
        package_name: None, // 让系统自动推断包名
    };
    
    let device_id = "your_device_id";
    
    // 批量启动多个应用的示例
    let apps_to_launch = vec![
        ("小红书", "com.xingin.xhs"),
        ("微信", "com.tencent.mm"),
        ("支付宝", "com.eg.android.AlipayGphone"),
    ];
    
    for (app_name, package_name) in apps_to_launch {
        let mut config = default_config.clone();
        config.package_name = Some(package_name.to_string());
        
        println!("📱 正在启动: {}", app_name);
        
        match lifecycle_manager.ensure_app_running(device_id, app_name, config).await {
            Ok(result) => {
                println!("   ✅ {} 启动成功 ({}ms)", app_name, result.total_duration_ms);
            },
            Err(error) => {
                println!("   ❌ {} 启动失败: {}", app_name, error.message);
                
                // 在实际应用中，你可能想要记录错误或采取其他措施
                // 比如发送告警、更新状态等
                
                // 继续处理下一个应用而不中断整个流程
                continue;
            }
        }
        
        // 在应用之间添加短暂延迟，避免系统过载
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
    }
    
    println!("🎉 批量应用启动流程完成");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_basic_lifecycle_manager_creation() {
        let adb_service = AdbService::new();
        let lifecycle_manager = AppLifecycleManager::new(adb_service);
        
        // 验证管理器创建成功（这里只是基础测试）
        // 在实际测试中，你可能需要模拟设备和应用
        assert!(true); // 占位符测试
    }
    
    #[tokio::test]
    async fn test_config_creation() {
        let config = AppLaunchConfig {
            max_retries: 5,
            launch_timeout_secs: 30,
            ready_check_interval_ms: 1000,
            launch_method: LaunchMethod::ActivityManager,
            package_name: Some("com.test.app".to_string()),
        };
        
        assert_eq!(config.max_retries, 5);
        assert_eq!(config.launch_timeout_secs, 30);
        assert_eq!(config.package_name, Some("com.test.app".to_string()));
    }
}

/// 工具函数：打印使用说明
pub fn print_usage_guide() {
    println!("📖 AppLifecycleManager 使用指南");
    println!("════════════════════════════════════");
    println!();
    println!("🏗️  基本用法:");
    println!("   1. 创建 AdbService 实例");
    println!("   2. 创建 AppLifecycleManager 实例");
    println!("   3. 配置 AppLaunchConfig");
    println!("   4. 调用 ensure_app_running()");
    println!();
    println!("⚙️  配置选项:");
    println!("   - max_retries: 最大重试次数 (建议: 3-5)");
    println!("   - launch_timeout_secs: 启动超时时间 (建议: 30-60秒)");
    println!("   - ready_check_interval_ms: 检查间隔 (建议: 1000-2000ms)");
    println!("   - launch_method: 启动方法 (ActivityManager/MonkeyRunner/DesktopIcon)");
    println!("   - package_name: 应用包名 (可选，系统会自动推断)");
    println!();
    println!("🔍 启动方法选择:");
    println!("   - ActivityManager: 推荐，通过系统服务启动");
    println!("   - MonkeyRunner: 备选，通过 Monkey 工具启动");
    println!("   - DesktopIcon: 实验性，通过点击桌面图标启动");
    println!();
    println!("📝 返回结果:");
    println!("   - 成功: AppLifecycleResult (包含状态、耗时、日志等)");
    println!("   - 失败: AppLifecycleResult (包含错误信息和诊断日志)");
    println!();
    println!("💡 最佳实践:");
    println!("   - 使用适当的超时时间，避免无限等待");
    println!("   - 检查返回的执行日志，便于调试问题");
    println!("   - 在生产环境中实现错误处理和重试逻辑");
    println!("   - 考虑设备性能，调整检查间隔");
}