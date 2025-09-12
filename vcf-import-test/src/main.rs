mod vcf_importer;

use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{info, Level};
use tracing_subscriber;
use vcf_importer::VcfImporter;

#[derive(Parser)]
#[command(name = "vcf-import-test")]
#[command(about = "VCF通讯录导入测试工具")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 导入联系人到指定设备
    Import {
        /// 设备ID (例如: emulator-5554)
        #[arg(short, long)]
        device: String,
        /// 联系人文件路径
        #[arg(short, long)]
        file: String,
    },
    /// 测试解析联系人文件
    Parse {
        /// 联系人文件路径
        #[arg(short, long)]
        file: String,
    },
    /// 生成示例联系人文件
    Sample {
        /// 输出文件路径
        #[arg(short, long, default_value = "test-data/sample_contacts.txt")]
        output: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Import { device, file } => {
            info!("开始导入测试 - 设备: {}, 文件: {}", device, file);
            
            let importer = VcfImporter::new(device.clone());
            
            match importer.import_vcf_contacts(&file).await {
                Ok(result) => {
                    println!("=== 导入结果 ===");
                    println!("设备: {}", device);
                    println!("成功: {}", result.success);
                    println!("总联系人数: {}", result.total_contacts);
                    println!("导入成功: {}", result.imported_contacts);
                    println!("导入失败: {}", result.failed_contacts);
                    println!("消息: {}", result.message);
                    if let Some(duration) = result.duration {
                        println!("耗时: {}秒", duration);
                    }
                    if let Some(details) = &result.details {
                        println!("详细信息: {}", details);
                    }
                    
                    if result.success {
                        println!("\n✅ 导入测试成功！");
                    } else {
                        println!("\n❌ 导入测试失败！");
                    }
                }
                Err(e) => {
                    eprintln!("❌ 导入过程出错: {}", e);
                    std::process::exit(1);
                }
            }
        }
        
        Commands::Parse { file } => {
            info!("测试解析联系人文件: {}", file);
            
            let importer = VcfImporter::new("test".to_string());
            
            match importer.parse_contacts_from_file(&file) {
                Ok(contacts) => {
                    println!("=== 解析结果 ===");
                    println!("文件: {}", file);
                    println!("联系人数量: {}", contacts.len());
                    println!("\n=== 联系人列表 ===");
                    
                    for (i, contact) in contacts.iter().enumerate() {
                        println!("{}. {} - {} - {} - {} - {}", 
                            i + 1, 
                            contact.name, 
                            contact.phone, 
                            contact.address, 
                            contact.occupation, 
                            contact.email
                        );
                    }
                    
                    println!("\n✅ 解析测试成功！");
                }
                Err(e) => {
                    eprintln!("❌ 解析失败: {}", e);
                    std::process::exit(1);
                }
            }
        }
        
        Commands::Sample { output } => {
            info!("生成示例联系人文件: {}", output);
            
            let sample_data = r#"# VCF导入测试示例数据
# 格式: 姓名,电话,地址,职业,邮箱
张三,13800138001,北京市朝阳区,软件工程师,zhangsan@example.com
李四,13800138002,上海市浦东新区,产品经理,lisi@example.com
王五,13800138003,广州市天河区,UI设计师,wangwu@example.com
赵六,13800138004,深圳市南山区,测试工程师,zhaoliu@example.com
钱七,13800138005,杭州市西湖区,运营专员,qianqi@example.com"#;

            // 确保目录存在
            if let Some(parent) = std::path::Path::new(&output).parent() {
                std::fs::create_dir_all(parent)?;
            }
            
            std::fs::write(&output, sample_data)?;
            println!("✅ 示例文件已生成: {}", output);
            println!("您可以使用以下命令测试:");
            println!("  cargo run -- parse -f {}", output);
            println!("  cargo run -- import -d emulator-5554 -f {}", output);
        }
    }

    Ok(())
}