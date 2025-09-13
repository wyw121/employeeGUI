mod xiaohongshu_automator;
mod types;
mod debug_helper;
mod ui_analyzer;

use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{info, Level};
use tracing_subscriber;
use xiaohongshu_automator::XiaohongshuAutomator;
use debug_helper::DebugHelper;
use ui_analyzer::analyze_xiaohongshu_ui;
use types::*;

#[derive(Parser)]
#[command(name = "xiaohongshu-follow")]
#[command(about = "小红书通讯录好友自动关注工具")]
#[command(version = "1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 检查小红书应用状态
    CheckApp {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
    },
    /// 导航到小红书通讯录页面
    Navigate {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
    },
    /// 执行自动关注通讯录好友
    Follow {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
        /// 最大关注数量
        #[arg(short, long, default_value = "20")]
        max_follows: usize,
    },
    /// 从GUI接收联系人并执行关注（用于GUI集成）
    FollowFromGui {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
        /// 最大关注数量
        #[arg(short, long, default_value = "5")]
        max_follows: usize,
        /// 联系人JSON数据（可选，用于GUI集成）
        #[arg(short, long)]
        contacts_json: Option<String>,
    },
    /// 完整流程：导入通讯录 + 自动关注
    Complete {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
        /// 联系人文件路径（CSV格式）
        #[arg(short, long)]
        contacts_file: String,
        /// 最大处理页数
        #[arg(short, long, default_value = "5")]
        max_pages: usize,
        /// 关注间隔（毫秒）
        #[arg(short, long, default_value = "2000")]
        interval: u64,
    },
    /// 调试UI状态（调试用）
    Debug {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
    },
    /// 分析UI结构（调试用）
    Analyze {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志系统
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::CheckApp { device } => {
            info!("🔍 检查设备 {} 上的小红书应用状态", device);
            check_app_status(&device).await?;
        }
        Commands::Navigate { device } => {
            info!("🧭 导航到设备 {} 的小红书通讯录页面", device);
            navigate_to_contacts(&device).await?;
        }
        Commands::Follow {
            device,
            max_follows,
        } => {
            info!("❤️ 开始在设备 {} 上执行自动关注", device);
            auto_follow_contacts(&device, Some(max_follows)).await?;
        }
        Commands::FollowFromGui {
            device,
            max_follows,
            contacts_json,
        } => {
            info!("❤️ 开始在设备 {} 上执行 自动关注", device);
            if let Some(json_data) = contacts_json {
                info!("📋 收到GUI联系人数据: {}", json_data);
                // 这里可以解析联系人数据，但目前仍使用通用关注逻辑
            }
            auto_follow_contacts(&device, Some(max_follows)).await?;
        }
        Commands::Complete {
            device,
            contacts_file,
            max_pages,
            interval,
        } => {
            info!("🚀 开始完整流程：导入通讯录 + 自动关注");
            complete_workflow(&device, &contacts_file, max_pages, interval).await?;
        }
        Commands::Debug { device } => {
            info!("🔧 调试设备 {} 的UI状态", device);
            debug_ui_state(&device).await?;
        }
        Commands::Analyze { device } => {
            info!("🔍 分析设备 {} 的UI结构", device);
            analyze_xiaohongshu_ui(&device).await?;
        }
    }

    Ok(())
}

/// 检查小红书应用状态
async fn check_app_status(device_id: &str) -> Result<()> {
    let automator = XiaohongshuAutomator::new(device_id.to_string());
    
    let result = automator.check_app_status().await?;
    
    info!("📱 应用状态检查结果:");
    info!("  - 应用已安装: {}", if result.app_installed { "✅" } else { "❌" });
    info!("  - 应用正在运行: {}", if result.app_running { "✅" } else { "❌" });
    info!("  - 消息: {}", result.message);
    
    if !result.app_installed {
        info!("⚠️ 请先安装小红书应用");
    } else if !result.app_running {
        info!("💡 建议先手动打开小红书应用");
    } else {
        info!("✅ 应用状态正常，可以执行自动关注");
    }
    
    Ok(())
}

/// 导航到通讯录页面
async fn navigate_to_contacts(device_id: &str) -> Result<()> {
    let automator = XiaohongshuAutomator::new(device_id.to_string());
    
    let result = automator.navigate_to_contacts().await?;
    
    info!("🧭 导航结果:");
    info!("  - 导航成功: {}", if result.success { "✅" } else { "❌" });
    info!("  - 消息: {}", result.message);
    
    if result.success {
        info!("✅ 已成功导航到通讯录页面，可以开始自动关注");
    } else {
        info!("❌ 导航失败，请检查应用状态或手动导航");
    }
    
    Ok(())
}

/// 执行自动关注
async fn auto_follow(
    device_id: &str,
    max_pages: usize,
    interval: u64,
    skip_existing: bool,
    return_home: bool,
) -> Result<()> {
    let automator = XiaohongshuAutomator::new(device_id.to_string());
    
    let options = Some(XiaohongshuFollowOptions {
        max_pages: Some(max_pages),
        follow_interval: Some(interval),
        skip_existing: Some(skip_existing),
        take_screenshots: Some(false),
        return_to_home: Some(return_home),
    });
    
    info!("⚙️ 关注参数:");
    info!("  - 最大页数: {}", max_pages);
    info!("  - 关注间隔: {}ms", interval);
    info!("  - 跳过已关注: {}", skip_existing);
    info!("  - 完成后返回主页: {}", return_home);
    info!("");
    
    let result = automator.auto_follow(options).await?;
    
    info!("❤️ 自动关注结果:");
    info!("  - 执行成功: {}", if result.success { "✅" } else { "❌" });
    info!("  - 关注用户数: {}", result.total_followed);
    info!("  - 处理页数: {}", result.pages_processed);
    info!("  - 耗时: {}秒", result.duration);
    info!("  - 消息: {}", result.message);
    
    if !result.details.is_empty() {
        info!("");
        info!("📋 详细结果:");
        for (i, detail) in result.details.iter().enumerate() {
            let status = if detail.follow_success { "✅" } else { "❌" };
            let position = format!("({}, {})", detail.user_position.0, detail.user_position.1);
            let default_text = "未知".to_string();
            let before = detail.button_text_before.as_ref().unwrap_or(&default_text);
            let after = detail.button_text_after.as_ref().unwrap_or(&default_text);
            
            info!("  {}: {} 位置:{} {}→{}", i + 1, status, position, before, after);
            
            if let Some(error) = &detail.error {
                info!("     错误: {}", error);
            }
        }
    }
    
    Ok(())
}

/// 完整工作流程
async fn complete_workflow(
    device_id: &str,
    contacts_file: &str,
    max_pages: usize,
    interval: u64,
) -> Result<()> {
    info!("🚀 开始完整工作流程");
    info!("  - 设备: {}", device_id);
    info!("  - 联系人文件: {}", contacts_file);
    info!("  - 最大页数: {}", max_pages);
    info!("  - 关注间隔: {}ms", interval);
    info!("");
    
    // 步骤1: 检查应用状态
    info!("📋 步骤1: 检查应用状态");
    check_app_status(device_id).await?;
    info!("");
    
    // 步骤2: 导入通讯录（这里只是模拟，实际需要实现VCF导入）
    info!("📋 步骤2: 导入通讯录");
    info!("⚠️ 注意：此版本暂未实现通讯录导入功能");
    info!("💡 请先手动导入联系人到小红书，或使用主应用的通讯录导入功能");
    info!("📁 联系人文件路径: {}", contacts_file);
    info!("");
    
    // 步骤3: 等待同步
    info!("📋 步骤3: 等待联系人同步");
    info!("⏳ 等待5秒以确保联系人同步到小红书...");
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    info!("");
    
    // 步骤4: 导航到通讯录
    info!("📋 步骤4: 导航到通讯录页面");
    navigate_to_contacts(device_id).await?;
    info!("");
    
    // 步骤5: 执行自动关注
    info!("📋 步骤5: 执行自动关注");
    auto_follow(device_id, max_pages, interval, true, true).await?;
    
    info!("🎉 完整工作流程执行完成！");
    
    Ok(())
}

/// 调试UI状态
async fn debug_ui_state(device_id: &str) -> Result<()> {
    let debug_helper = DebugHelper::new(device_id.to_string());
    debug_helper.print_ui_dump().await?;
    
    // 也让自动化器尝试识别页面
    info!("");
    info!("🔍 使用自动化器识别页面状态:");
    let automator = XiaohongshuAutomator::new(device_id.to_string());
    match automator.recognize_current_page().await {
        Ok(result) => {
            info!("📋 页面状态: {:?}", result.current_state);
            info!("📊 信心度: {:.2}", result.confidence);
            info!("🔑 关键元素: {:?}", result.key_elements);
            info!("📱 UI元素数量: {}", result.ui_elements.len());
        }
        Err(e) => {
            info!("❌ 页面识别失败: {}", e);
        }
    }
    
    Ok(())
}

/// 自动关注通讯录好友
async fn auto_follow_contacts(device_id: &str, max_follows: Option<usize>) -> Result<()> {
    let automator = XiaohongshuAutomator::new(device_id.to_string());
    
    let result = automator.auto_follow_contacts(max_follows).await?;
    
    info!("🧭 关注结果:");
    info!("  - 关注成功: {}", if result.success { "✅" } else { "❌" });
    info!("  - 关注数量: {}", result.followed_count);
    info!("  - 消息: {}", result.message);
    
    if result.success {
        info!("✅ 已成功关注 {} 个好友", result.followed_count);
    } else {
        info!("❌ 关注失败: {}", result.message);
    }
    
    Ok(())
}