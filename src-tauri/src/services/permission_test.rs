use crate::services::vcf_importer::VcfImporter;
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
