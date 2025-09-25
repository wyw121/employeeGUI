//! 联系人导入相关 Tauri 命令（已剥离所有小红书自动关注逻辑）。
//! 仅保留：
//! 1. VCF 文件生成
//! 2. 多品牌导入入口
//! 3. 华为增强导入入口

use crate::services::multi_brand_vcf_importer::{MultiBrandVcfImporter, MultiBrandImportResult};
use crate::services::huawei_enhanced_importer::{HuaweiEmuiEnhancedStrategy, ImportExecutionResult};
use crate::services::vcf_importer::{Contact, VcfImporter, VcfImportResult, VcfVerifyResult};
use tauri::command;
use tracing::{error, info, warn};

/// 从联系人列表生成 VCF 文件
#[command]
pub async fn generate_vcf_file(contacts: Vec<Contact>, output_path: String) -> Result<String, String> {
    match VcfImporter::generate_vcf_file(contacts, &output_path).await {
        Ok(path) => Ok(path),
        Err(e) => {
            error!("生成VCF文件失败: {}", e);
            Err(e.to_string())
        }
    }
}

// 旧的小红书自动关注复合流程已完全移除。

/// 多品牌VCF导入（批量尝试不同品牌的导入方式）
#[command]
pub async fn import_vcf_contacts_multi_brand(
    device_id: String,
    contacts_file_path: String,
) -> Result<MultiBrandImportResult, String> {
    info!(
        "🚀 开始多品牌VCF导入: 设备 {} 文件 {}",
        device_id, contacts_file_path
    );

    let mut importer = MultiBrandVcfImporter::new(device_id);

    match importer.import_vcf_contacts_multi_brand(&contacts_file_path).await {
        Ok(result) => {
            info!(
                "✅ 多品牌VCF导入完成: 成功={} 总联系人={} 导入={} 失败={} 使用策略={:?} 使用方法={:?} 耗时={}秒",
                result.success,
                result.total_contacts,
                result.imported_contacts,
                result.failed_contacts,
                result.used_strategy,
                result.used_method,
                result.duration_seconds
            );
            
            // 记录详细的尝试信息
            for attempt in &result.attempts {
                info!("📋 尝试记录: 策略={} 方法={} 成功={} 耗时={}秒", 
                    attempt.strategy_name, 
                    attempt.method_name, 
                    attempt.success, 
                    attempt.duration_seconds
                );
                if let Some(error) = &attempt.error_message {
                    info!("   错误信息: {}", error);
                }
            }
            
            Ok(result)
        }
        Err(e) => {
            error!("❌ 多品牌VCF导入失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 华为设备增强VCF导入（基于Python成功经验）
#[command]
pub async fn import_vcf_contacts_huawei_enhanced(
    device_id: String,
    contacts_file_path: String,
) -> Result<ImportExecutionResult, String> {
    info!(
        "🚀 开始华为增强VCF导入: 设备 {} 文件 {}",
        device_id, contacts_file_path
    );

    // 检查文件是否存在
    if !std::path::Path::new(&contacts_file_path).exists() {
        return Err(format!("VCF文件不存在: {}", contacts_file_path));
    }

    // 检测ADB路径
    let adb_path = if std::path::Path::new("platform-tools/adb.exe").exists() {
        "platform-tools/adb.exe".to_string()
    } else {
        "adb".to_string()
    };

    let strategy = HuaweiEmuiEnhancedStrategy::new(device_id, adb_path);
    let methods = strategy.get_enhanced_import_methods();

    info!("📋 华为设备有 {} 种增强导入方法可尝试", methods.len());

    // 逐个尝试导入方法，优先使用推荐的Intent导入
    for (index, method) in methods.iter().enumerate() {
        info!("🔄 尝试华为导入方法 {}/{}: {}", index + 1, methods.len(), method.name);
        
        match strategy.execute_import_method(method, Some(&contacts_file_path)) {
            Ok(result) => {
                if result.success {
                    info!(
                        "✅ 华为增强导入成功: 方法={} 耗时={}秒",
                        result.method_name, result.duration_seconds
                    );
                    
                    // 记录命令执行详情
                    for cmd_result in &result.command_results {
                        info!("   命令: {} | 成功: {} | 耗时: {}秒", 
                            cmd_result.command, cmd_result.success, cmd_result.duration);
                        if !cmd_result.stdout.is_empty() {
                            info!("   输出: {}", cmd_result.stdout.trim());
                        }
                    }
                    
                    return Ok(result);
                } else {
                    warn!(
                        "⚠️ 华为导入方法失败: {} | 错误: {:?}",
                        method.name, result.error_message
                    );
                    
                    // 记录失败的命令详情
                    for cmd_result in &result.command_results {
                        if !cmd_result.success {
                            warn!("   失败命令: {} | 错误: {}", 
                                cmd_result.command, cmd_result.stderr.trim());
                        }
                    }
                }
            }
            Err(e) => {
                error!("❌ 华为导入方法执行异常: {} | 异常: {}", method.name, e);
                continue;
            }
        }
    }

    Err("所有华为增强导入方法都失败了".to_string())
}
