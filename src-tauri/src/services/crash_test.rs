use anyhow::Result;
use tracing::{error, info};
use crate::services::vcf_importer_async::VcfImporterAsync;

/// 简化的崩溃测试命令
#[tauri::command]
#[allow(non_snake_case)]
pub async fn test_vcf_import_crash_fix(
    deviceId: String,
    contactsFilePath: String,
) -> Result<String, String> {
    info!("🧪 测试VCF导入崩溃修复: 设备 {} 文件 {}", deviceId, contactsFilePath);

    // 使用完全安全的方式执行
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        tokio::runtime::Handle::current().block_on(async {
            info!("📋 创建VcfImporterAsync实例...");
            let importer = VcfImporterAsync::new(deviceId.clone());
            
            info!("⚡ 调用异步导入方法...");
            match importer.import_vcf_contacts_simple(&contactsFilePath).await {
                Ok(result) => {
                    info!("🎉 测试成功完成: {}", result.message);
                    Ok(format!("测试成功: {}", result.message))
                }
                Err(e) => {
                    error!("💥 测试中遇到错误: {}", e);
                    Err(format!("测试错误: {}", e))
                }
            }
        })
    }));

    match result {
        Ok(inner_result) => inner_result,
        Err(panic) => {
            error!("🔥 测试中发生panic: {:?}", panic);
            Err("测试中发生panic，但已被捕获".to_string())
        }
    }
}