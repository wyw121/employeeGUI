use crate::services::vcf_importer::{
    AppStatusResult, NavigationResult, XiaohongshuFollowOptions, XiaohongshuFollowResult,
};
use crate::services::vcf_importer::{
    Contact, ImportAndFollowResult, VcfImportResult, VcfImporter, VcfVerifyResult,
};
use crate::services::vcf_importer_optimized::VcfImporterOptimized;
use crate::services::xiaohongshu_automator::XiaohongshuAutomator;
use tauri::command;
use tracing::{error, info, warn};

/// 生成VCF文件从联系人列表
#[command]
pub async fn generate_vcf_file(
    contacts: Vec<Contact>,
    output_path: String,
) -> Result<String, String> {
    info!(
        "生成VCF文件: {} 个联系人 -> {}",
        contacts.len(),
        output_path
    );

    match VcfImporter::generate_vcf_file(contacts, &output_path).await {
        Ok(path) => {
            info!("VCF文件生成成功: {}", path);
            Ok(path)
        }
        Err(e) => {
            error!("生成VCF文件失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// VCF通讯录导入到Android设备 (Python移植版本 - 完全重新实现)
#[command]
#[allow(non_snake_case)]
pub async fn import_vcf_contacts_python_version(
    deviceId: String,
    contactsFilePath: String,
) -> Result<VcfImportResult, String> {
    info!(
        "开始VCF导入（Python移植版）: 设备 {} 文件 {}",
        deviceId, contactsFilePath
    );

    let importer = VcfImporterOptimized::new(deviceId);

    match importer.run_complete_vcf_import(&contactsFilePath).await {
        Ok(result) => {
            info!(
                "VCF导入完成（Python移植版）: 成功={} 总数={} 导入={}",
                result.success, result.total_contacts, result.imported_contacts
            );
            Ok(result)
        }
        Err(e) => {
            error!("VCF导入失败（Python移植版）: {}", e);
            Err(e.to_string())
        }
    }
}

/// VCF通讯录导入到Android设备 (优化版本 - 从Python脚本移植)
#[command]
#[allow(non_snake_case)]
pub async fn import_vcf_contacts_optimized(
    deviceId: String,
    contactsFilePath: String,
) -> Result<VcfImportResult, String> {
    info!(
        "开始VCF导入（优化版本）: 设备 {} 文件 {}",
        deviceId, contactsFilePath
    );

    let importer = VcfImporter::new(deviceId);

    // 使用优化的导入流程
    match importer.import_vcf_contacts(&contactsFilePath).await {
        Ok(mut result) => {
            // 使用Python移植的验证方法
            match importer.verify_import_success_optimized().await {
                Ok(success) => {
                    result.success = success;
                    info!(
                        "VCF导入完成（优化验证）: 成功={} 总数={} 导入={}",
                        result.success, result.total_contacts, result.imported_contacts
                    );
                    Ok(result)
                }
                Err(e) => {
                    warn!("验证过程出错，但导入可能成功: {}", e);
                    Ok(result) // 返回原始结果
                }
            }
        }
        Err(e) => {
            error!("VCF导入失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// VCF通讯录导入到Android设备
#[command]
#[allow(non_snake_case)]
pub async fn import_vcf_contacts(
    deviceId: String,
    contactsFilePath: String,
) -> Result<VcfImportResult, String> {
    info!("开始VCF导入: 设备 {} 文件 {}", deviceId, contactsFilePath);

    // 添加详细的参数日志
    info!(
        "接收到的参数 - deviceId: '{}', contactsFilePath: '{}'",
        deviceId, contactsFilePath
    );

    let importer = VcfImporter::new(deviceId);

    match importer.import_vcf_contacts(&contactsFilePath).await {
        Ok(result) => {
            info!(
                "VCF导入完成: 成功={} 总数={} 导入={}",
                result.success, result.total_contacts, result.imported_contacts
            );
            Ok(result)
        }
        Err(e) => {
            error!("VCF导入失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 验证VCF导入结果
#[command]
pub async fn verify_vcf_import(
    device_id: String,
    expected_contacts: Vec<Contact>,
) -> Result<VcfVerifyResult, String> {
    info!(
        "验证VCF导入: 设备 {} 期望联系人 {}",
        device_id,
        expected_contacts.len()
    );

    let importer = VcfImporter::new(device_id);

    match importer.verify_vcf_import(expected_contacts).await {
        Ok(result) => {
            info!(
                "VCF导入验证完成: 验证率 {:.1}% ({}/{})",
                result.verification_rate * 100.0,
                result.verified_contacts,
                result.total_expected
            );
            Ok(result)
        }
        Err(e) => {
            error!("VCF导入验证失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 检查小红书应用状态
#[command]
pub async fn check_xiaohongshu_app_status(device_id: String) -> Result<AppStatusResult, String> {
    info!("检查小红书应用状态: 设备 {}", device_id);

    let automator = XiaohongshuAutomator::new(device_id);

    match automator.check_app_status().await {
        Ok(status) => {
            info!(
                "小红书应用状态: 安装={} 运行={}",
                status.app_installed, status.app_running
            );
            Ok(status)
        }
        Err(e) => {
            error!("检查小红书应用状态失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 导航到小红书通讯录页面
#[command]
pub async fn navigate_to_xiaohongshu_contacts(
    device_id: String,
) -> Result<NavigationResult, String> {
    info!("导航到小红书通讯录: 设备 {}", device_id);

    let automator = XiaohongshuAutomator::new(device_id);

    match automator.navigate_to_contacts().await {
        Ok(result) => {
            info!(
                "导航结果: 成功={} 页面={} 尝试次数={}",
                result.success, result.current_page, result.attempts
            );
            Ok(result)
        }
        Err(e) => {
            error!("导航到小红书通讯录失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 小红书自动关注通讯录好友
#[command]
pub async fn xiaohongshu_auto_follow(
    device_id: String,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<XiaohongshuFollowResult, String> {
    info!("小红书自动关注: 设备 {}", device_id);

    let automator = XiaohongshuAutomator::new(device_id);

    match automator.auto_follow(options).await {
        Ok(result) => {
            info!(
                "自动关注完成: 成功={} 关注数={} 页数={} 耗时={}秒",
                result.success, result.total_followed, result.pages_processed, result.duration
            );
            Ok(result)
        }
        Err(e) => {
            error!("小红书自动关注失败: {}", e);
            Err(e.to_string())
        }
    }
}

/// 完整的VCF导入+小红书自动关注流程
#[command]
pub async fn import_and_follow_xiaohongshu(
    device_id: String,
    contacts_file_path: String,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<ImportAndFollowResult, String> {
    let start_time = std::time::Instant::now();
    info!(
        "开始完整的导入+关注流程: 设备 {} 文件 {}",
        device_id, contacts_file_path
    );

    // 1. VCF导入
    let import_result = {
        let importer = VcfImporter::new(device_id.clone());
        match importer.import_vcf_contacts(&contacts_file_path).await {
            Ok(result) => result,
            Err(e) => {
                error!("VCF导入失败: {}", e);
                return Err(format!("VCF导入失败: {}", e));
            }
        }
    };

    // 等待联系人同步
    info!("等待联系人同步到小红书...");
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    // 2. 小红书自动关注
    let follow_result = {
        let automator = XiaohongshuAutomator::new(device_id);
        match automator.auto_follow(options).await {
            Ok(result) => result,
            Err(e) => {
                error!("小红书自动关注失败: {}", e);
                // 即使关注失败，也返回结果，只是标记失败
                XiaohongshuFollowResult {
                    success: false,
                    total_followed: 0,
                    pages_processed: 0,
                    duration: 0,
                    details: vec![],
                    message: format!("自动关注失败: {}", e),
                }
            }
        }
    };

    let total_duration = start_time.elapsed().as_secs();
    let success = import_result.success && follow_result.success;

    let result = ImportAndFollowResult {
        import_result,
        follow_result,
        total_duration,
        success,
    };

    info!(
        "完整流程完成: 总成功={} 总耗时={}秒",
        success, total_duration
    );
    Ok(result)
}
