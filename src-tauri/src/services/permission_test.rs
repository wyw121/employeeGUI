use crate::services::vcf_importer::VcfImporter;
use serde::{Deserialize, Serialize};
use tauri::command;
use tracing::info;

/// 测试权限处理功能
#[command]
pub async fn test_permission_handling(device_id: String) -> Result<String, String> {
    info!("开始测试权限处理功能 - 设备: {}", device_id);

    let importer = VcfImporter::new(device_id);

    // 创建一个测试，检查权限对话框处理
    match importer.test_permission_dialog_detection().await {
        Ok(result) => {
            info!("权限对话框测试完成: {}", result);
            Ok(result)
        }
        Err(e) => {
            tracing::error!("权限对话框测试失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 测试完整的VCF导入流程（包含权限处理）
#[command]
pub async fn test_vcf_import_with_permission(
    device_id: String,
    contacts_file: String,
) -> Result<String, String> {
    info!(
        "测试完整VCF导入流程 - 设备: {} 文件: {}",
        device_id, contacts_file
    );

    let importer = VcfImporter::new(device_id);

    match importer.import_vcf_contacts(&contacts_file).await {
        Ok(result) => {
            let summary = format!(
                "导入结果: 成功={}, 总数={}, 导入={}, 失败={}, 消息='{}'",
                result.success,
                result.total_contacts,
                result.imported_contacts,
                result.failed_contacts,
                result.message
            );
            info!("{}", summary);
            Ok(summary)
        }
        Err(e) => {
            tracing::error!("VCF导入测试失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 详细的VCF导入结果，包含所有步骤的日志信息
#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedVcfImportResult {
    pub success: bool,
    pub total_contacts: usize,
    pub imported_contacts: usize,
    pub failed_contacts: usize,
    pub message: String,
    pub details: Option<String>,
    pub duration: Option<u64>,
    pub step_logs: Vec<ImportStepLog>,
}

/// 导入步骤日志
#[derive(Debug, Serialize, Deserialize)]
pub struct ImportStepLog {
    pub step: String,
    pub status: String, // "success", "warning", "error", "info"
    pub message: String,
    pub timestamp: String,
}

/// 测试完整VCF导入流程（带详细日志）
#[command]
pub async fn test_vcf_import_with_detailed_logs(
    device_id: String,
    contacts_file: String,
) -> Result<DetailedVcfImportResult, String> {
    info!(
        "测试完整VCF导入流程（带详细日志） - 设备: {} 文件: {}",
        device_id, contacts_file
    );

    let mut step_logs = Vec::new();
    let start_time = std::time::Instant::now();

    // 记录开始步骤
    step_logs.push(ImportStepLog {
        step: "开始导入".to_string(),
        status: "info".to_string(),
        message: format!("开始VCF导入流程 - 设备: {} 文件: {}", device_id, contacts_file),
        timestamp: chrono::Utc::now().format("%H:%M:%S%.3f").to_string(),
    });

    let importer = VcfImporter::new(device_id);

    match importer.import_vcf_contacts(&contacts_file).await {
        Ok(result) => {
            step_logs.push(ImportStepLog {
                step: "导入完成".to_string(),
                status: if result.success { "success".to_string() } else { "error".to_string() },
                message: format!(
                    "导入结果: 成功={}, 总数={}, 导入={}, 失败={}, 消息='{}'",
                    result.success,
                    result.total_contacts,
                    result.imported_contacts,
                    result.failed_contacts,
                    result.message
                ),
                timestamp: chrono::Utc::now().format("%H:%M:%S%.3f").to_string(),
            });

            Ok(DetailedVcfImportResult {
                success: result.success,
                total_contacts: result.total_contacts,
                imported_contacts: result.imported_contacts,
                failed_contacts: result.failed_contacts,
                message: result.message,
                details: result.details,
                duration: Some(start_time.elapsed().as_secs()),
                step_logs,
            })
        }
        Err(e) => {
            step_logs.push(ImportStepLog {
                step: "导入失败".to_string(),
                status: "error".to_string(),
                message: format!("VCF导入测试失败: {}", e),
                timestamp: chrono::Utc::now().format("%H:%M:%S%.3f").to_string(),
            });

            tracing::error!("VCF导入测试失败: {}", e);
            Err(e.to_string())
        }
    }
}
