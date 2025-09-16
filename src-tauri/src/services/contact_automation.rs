use crate::services::ldplayer_vcf_opener::{LDPlayerVcfOpener, VcfOpenResult};
use crate::services::vcf_importer::VcfImportResult as OriginalVcfImportResult;
use crate::services::vcf_importer::VcfImporter;
use crate::services::vcf_importer::{Contact, VcfVerifyResult};
use crate::services::vcf_importer_async::{VcfImportResult, VcfImporterAsync};
use crate::services::vcf_importer_optimized::VcfImporterOptimized;
use crate::services::xiaohongshu_automator::{
    XiaohongshuAutomator, AppStatusResult, NavigationResult, 
    XiaohongshuFollowOptions, XiaohongshuFollowResult
};
use serde::{Deserialize, Serialize};

// 定义本地的ImportAndFollowResult结构，使用正确的类型
#[derive(Debug, Serialize, Deserialize)]
pub struct ImportAndFollowResult {
    pub import_result: OriginalVcfImportResult,
    pub follow_result: XiaohongshuFollowResult,
    pub total_duration: u64,
    pub success: bool,
}

// 增强版的ImportAndFollowResult，包含详细的步骤信息
#[derive(Debug, Serialize, Deserialize)]
pub struct EnhancedImportAndFollowResult {
    pub import_result: OriginalVcfImportResult,
    pub app_status: Option<AppStatusResult>,
    pub navigation_result: Option<NavigationResult>,
    pub follow_result: XiaohongshuFollowResult,
    pub total_duration: u64,
    pub success: bool,
    pub step_details: Vec<String>, // 步骤详情记录
}
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

// 定义前端兼容的结果类型
#[derive(Debug, Serialize, Deserialize)]
pub struct LegacyVcfImportResult {
    pub success: bool,
    pub totalContacts: usize,
    pub importedContacts: usize,
    pub failedContacts: usize,
    pub message: String,
    pub details: Option<String>,
}

impl From<VcfImportResult> for LegacyVcfImportResult {
    fn from(result: VcfImportResult) -> Self {
        LegacyVcfImportResult {
            success: result.success,
            totalContacts: result.total_contacts,
            importedContacts: result.imported_contacts,
            failedContacts: result.failed_contacts,
            message: result.message,
            details: result.details,
        }
    }
}

/// VCF通讯录导入到Android设备 (异步安全版本 - 修复闪退问题)
#[command]
#[allow(non_snake_case)]
pub async fn import_vcf_contacts_async_safe(
    deviceId: String,
    vcfFilePath: String,
) -> Result<LegacyVcfImportResult, String> {
    // 在命令开始就添加 panic hook
    std::panic::set_hook(Box::new(|panic_info| {
        error!(
            "🔥 PANIC in import_vcf_contacts_async_safe: {:?}",
            panic_info
        );
        if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            error!("🔥 PANIC message: {}", s);
        }
        if let Some(location) = panic_info.location() {
            error!("🔥 PANIC location: {}:{}", location.file(), location.line());
        }
    }));

    info!(
        "🚀 开始VCF导入（异步安全版）: 设备 {} 文件 {}",
        deviceId, vcfFilePath
    );

    // 参数验证
    if deviceId.is_empty() {
        error!("❌ 设备ID不能为空");
        return Err("设备ID不能为空".to_string());
    }

    if vcfFilePath.is_empty() {
        error!("❌ VCF文件路径不能为空");
        return Err("VCF文件路径不能为空".to_string());
    }

    // 检查文件是否存在
    if !std::path::Path::new(&vcfFilePath).exists() {
        error!("❌ VCF文件不存在: {}", vcfFilePath);
        return Err(format!("VCF文件不存在: {}", vcfFilePath));
    }

    info!("✅ 参数验证通过，开始执行导入...");

    // 使用VcfImporter直接导入VCF文件
    info!("📋 创建VcfImporter实例...");
    let importer = VcfImporter::new(deviceId.clone());

    let result = tokio::task::spawn_blocking(move || {
        tokio::runtime::Handle::current().block_on(async move {
            info!("📋 创建VcfImporterAsync实例...");
            let importer = VcfImporterAsync::new(deviceId.clone());

            info!("⚡ 调用异步导入方法...");
            match importer.import_vcf_contacts_simple(&vcfFilePath).await {
                Ok(result) => {
                    info!(
                        "🎉 VCF导入完成（异步安全版）: 成功={} 总数={} 导入={}",
                        result.success, result.total_contacts, result.imported_contacts
                    );
                    Ok(result)
                }
                Err(e) => {
                    error!("💥 VCF导入失败（异步安全版）: {}", e);
                    error!("🔍 错误详情: {:?}", e);
                    Err(format!("导入失败: {}", e))
                }
            }
        })
    })
    .await;

    match result {
        Ok(import_result) => {
            info!("🎊 整个导入流程成功完成");
            match import_result {
                Ok(vcf_result) => {
                    // 转换为LegacyVcfImportResult格式
                    let legacy_result = LegacyVcfImportResult::from(vcf_result);
                    Ok(legacy_result)
                }
                Err(e) => {
                    error!("❌ 导入过程中发生错误: {}", e);
                    Err(e)
                }
            }
        }
        Err(e) => {
            error!("❌ 任务执行失败: {}", e);
            Err(format!("任务执行失败: {}", e))
        }
    }
}

/// 雷电模拟器VCF文件打开和导入（专用优化版本）
#[command]
#[allow(non_snake_case)]
pub async fn open_vcf_file_ldplayer(
    deviceId: String,
    vcfFilePath: String,
) -> Result<VcfOpenResult, String> {
    info!(
        "🎯 开始雷电模拟器VCF文件打开: 设备 {} 文件 {}",
        deviceId, vcfFilePath
    );

    let opener = LDPlayerVcfOpener::new(deviceId.clone());

    match opener.open_vcf_file_complete(&vcfFilePath).await {
        Ok(result) => {
            info!(
                "🎉 VCF文件打开完成: 成功={} 步骤={}",
                result.success,
                result.steps_completed.len()
            );
            Ok(result)
        }
        Err(e) => {
            error!("💥 VCF文件打开失败: {}", e);
            Err(format!("打开失败: {}", e))
        }
    }
}

/// VCF文件传输和自动打开的完整流程（雷电模拟器专用）
#[command]
#[allow(non_snake_case)]
pub async fn import_and_open_vcf_ldplayer(
    deviceId: String,
    contactsFilePath: String,
) -> Result<VcfOpenResult, String> {
    info!(
        "🚀 开始完整VCF导入和打开流程: 设备 {} 文件 {}",
        deviceId, contactsFilePath
    );

    // 步骤1: 使用异步安全版本传输VCF文件
    info!("📤 步骤1: 传输VCF文件到设备...");
    let importer = VcfImporterAsync::new(deviceId.clone());

    let import_result = match importer.import_vcf_contacts_simple(&contactsFilePath).await {
        Ok(result) => {
            if result.success {
                info!("✅ VCF文件传输成功");
                result
            } else {
                error!("❌ VCF文件传输失败: {}", result.message);
                return Err(format!("传输失败: {}", result.message));
            }
        }
        Err(e) => {
            error!("💥 VCF文件传输失败: {}", e);
            return Err(format!("传输失败: {}", e));
        }
    };

    // 步骤2: 自动打开VCF文件并完成导入
    info!("📱 步骤2: 自动打开VCF文件...");
    let device_vcf_path = "/sdcard/Download/contacts_import.vcf";
    let opener = LDPlayerVcfOpener::new(deviceId);

    match opener.open_vcf_file_complete(device_vcf_path).await {
        Ok(mut result) => {
            // 合并传输和打开的结果信息
            result.details = Some(format!(
                "传输: {} 个联系人已传输到设备。打开: {}",
                import_result.total_contacts,
                result.details.unwrap_or_default()
            ));

            info!("🎉 完整流程完成: 传输+打开成功");
            Ok(result)
        }
        Err(e) => {
            error!("💥 VCF文件打开失败: {}", e);
            // 即使打开失败，文件也已经传输成功
            Ok(VcfOpenResult {
                success: false,
                message: format!("文件已传输但自动打开失败: {}", e),
                details: Some(format!(
                    "文件位置: {}。请手动打开该文件完成导入。",
                    device_vcf_path
                )),
                steps_completed: vec!["文件传输".to_string()],
            })
        }
    }
}

/// VCF通讯录导入到Android设备 (Python移植版本 - 完全重新实现)
#[command]
#[allow(non_snake_case)]
pub async fn import_vcf_contacts_python_version(
    deviceId: String,
    contactsFilePath: String,
) -> Result<OriginalVcfImportResult, String> {
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
) -> Result<OriginalVcfImportResult, String> {
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
) -> Result<OriginalVcfImportResult, String> {
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

/// VCF导入（Intent方法 + 传统方法回退）
#[command]
pub async fn import_vcf_contacts_with_intent_fallback(
    device_id: String,
    contacts_file_path: String,
) -> Result<OriginalVcfImportResult, String> {
    info!(
        "🚀 开始Intent + 回退方法VCF导入: 设备 {} 文件 {}",
        device_id, contacts_file_path
    );

    let importer = VcfImporter::new(device_id);

    match importer
        .import_vcf_contacts_with_intent_fallback(&contacts_file_path)
        .await
    {
        Ok(result) => {
            info!("✅ Intent + 回退方法VCF导入完成: {}", result.message);
            Ok(result)
        }
        Err(e) => {
            error!("❌ Intent + 回退方法VCF导入失败: {}", e);
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
                "导航结果: 成功={} 消息={}",
                result.success, result.message
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

/// 完整的VCF导入+小红书自动关注流程（增强版 - 包含状态检查和导航）
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

    // 2. 创建自动化器并进行状态检查
    let automator = XiaohongshuAutomator::new(device_id.clone());
    
    // 2.1 检查小红书应用状态
    info!("检查小红书应用状态...");
    let app_status = match automator.check_app_status().await {
        Ok(status) => {
            if !status.app_installed {
                let error_msg = "小红书应用未安装，无法执行自动关注";
                error!("{}", error_msg);
                let follow_result = XiaohongshuFollowResult {
                    success: false,
                    total_followed: 0,
                    pages_processed: 0,
                    duration: 0,
                    details: vec![],
                    message: error_msg.to_string(),
                };
                let total_duration = start_time.elapsed().as_secs();
                return Ok(ImportAndFollowResult {
                    import_result,
                    follow_result,
                    total_duration,
                    success: false,
                });
            }
            if !status.app_running {
                warn!("小红书应用未运行，尝试启动应用...");
            }
            status
        }
        Err(e) => {
            error!("检查小红书应用状态失败: {}", e);
            let follow_result = XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: format!("应用状态检查失败: {}", e),
            };
            let total_duration = start_time.elapsed().as_secs();
            return Ok(ImportAndFollowResult {
                import_result,
                follow_result,
                total_duration,
                success: false,
            });
        }
    };

    // 2.2 导航到小红书通讯录页面
    info!("导航到小红书通讯录页面...");
    let navigation_result = match automator.navigate_to_contacts().await {
        Ok(nav_result) => {
            if !nav_result.success {
                warn!("导航到通讯录页面失败: {}", nav_result.message);
                let follow_result = XiaohongshuFollowResult {
                    success: false,
                    total_followed: 0,
                    pages_processed: 0,
                    duration: 0,
                    details: vec![],
                    message: format!("导航失败: {}", nav_result.message),
                };
                let total_duration = start_time.elapsed().as_secs();
                return Ok(ImportAndFollowResult {
                    import_result,
                    follow_result,
                    total_duration,
                    success: false,
                });
            }
            nav_result
        }
        Err(e) => {
            error!("导航到通讯录页面异常: {}", e);
            let follow_result = XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: format!("导航异常: {}", e),
            };
            let total_duration = start_time.elapsed().as_secs();
            return Ok(ImportAndFollowResult {
                import_result,
                follow_result,
                total_duration,
                success: false,
            });
        }
    };

    // 3. 执行小红书自动关注
    info!("开始执行小红书自动关注...");
    let follow_result = match automator.auto_follow(options).await {
        Ok(result) => {
            info!(
                "自动关注完成: 成功={} 关注数={} 页数={} 耗时={}秒",
                result.success, result.total_followed, result.pages_processed, result.duration
            );
            result
        }
        Err(e) => {
            error!("小红书自动关注失败: {}", e);
            XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: format!("自动关注失败: {}", e),
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
        "完整流程完成: VCF导入={} 应用状态={} 导航={} 自动关注={} 总成功={} 总耗时={}秒",
        result.import_result.success,
        app_status.app_installed && app_status.app_running,
        navigation_result.success,
        result.follow_result.success,
        success,
        total_duration
    );
    Ok(result)
}

/// 完整的VCF导入+小红书自动关注流程（增强版 - 包含详细步骤信息）
#[command]
pub async fn import_and_follow_xiaohongshu_enhanced(
    device_id: String,
    contacts_file_path: String,
    options: Option<XiaohongshuFollowOptions>,
) -> Result<EnhancedImportAndFollowResult, String> {
    let start_time = std::time::Instant::now();
    let mut step_details = Vec::new();
    
    info!(
        "开始增强版导入+关注流程: 设备 {} 文件 {}",
        device_id, contacts_file_path
    );
    step_details.push("开始完整的VCF导入+自动关注流程".to_string());

    // 1. VCF导入
    step_details.push("步骤1: 开始VCF联系人导入".to_string());
    let import_result = {
        let importer = VcfImporter::new(device_id.clone());
        match importer.import_vcf_contacts(&contacts_file_path).await {
            Ok(result) => {
                step_details.push(format!(
                    "VCF导入完成: 成功={} 导入联系人数={}",
                    result.success, result.imported_contacts
                ));
                result
            }
            Err(e) => {
                error!("VCF导入失败: {}", e);
                step_details.push(format!("VCF导入失败: {}", e));
                return Err(format!("VCF导入失败: {}", e));
            }
        }
    };

    // 等待联系人同步
    step_details.push("步骤2: 等待联系人同步到小红书(5秒)".to_string());
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    // 2. 创建自动化器并进行状态检查
    let automator = XiaohongshuAutomator::new(device_id.clone());
    
    // 2.1 检查小红书应用状态
    step_details.push("步骤3: 检查小红书应用状态".to_string());
    let app_status = match automator.check_app_status().await {
        Ok(status) => {
            step_details.push(format!(
                "应用状态检查完成: 已安装={} 运行中={}",
                status.app_installed, status.app_running
            ));
            
            if !status.app_installed {
                let error_msg = "小红书应用未安装，无法执行自动关注";
                error!("{}", error_msg);
                step_details.push(error_msg.to_string());
                
                let follow_result = XiaohongshuFollowResult {
                    success: false,
                    total_followed: 0,
                    pages_processed: 0,
                    duration: 0,
                    details: vec![],
                    message: error_msg.to_string(),
                };
                let total_duration = start_time.elapsed().as_secs();
                
                return Ok(EnhancedImportAndFollowResult {
                    import_result,
                    app_status: Some(status),
                    navigation_result: None,
                    follow_result,
                    total_duration,
                    success: false,
                    step_details,
                });
            }
            
            if !status.app_running {
                step_details.push("小红书应用未运行，尝试启动应用".to_string());
            }
            status
        }
        Err(e) => {
            error!("检查小红书应用状态失败: {}", e);
            step_details.push(format!("应用状态检查失败: {}", e));
            
            let follow_result = XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: format!("应用状态检查失败: {}", e),
            };
            let total_duration = start_time.elapsed().as_secs();
            
            return Ok(EnhancedImportAndFollowResult {
                import_result,
                app_status: None,
                navigation_result: None,
                follow_result,
                total_duration,
                success: false,
                step_details,
            });
        }
    };

    // 2.2 导航到小红书通讯录页面
    step_details.push("步骤4: 导航到小红书通讯录页面".to_string());
    let navigation_result = match automator.navigate_to_contacts().await {
        Ok(nav_result) => {
            step_details.push(format!(
                "导航完成: 成功={} 消息={}",
                nav_result.success, nav_result.message
            ));
            
            if !nav_result.success {
                warn!("导航到通讯录页面失败: {}", nav_result.message);
                
                let follow_result = XiaohongshuFollowResult {
                    success: false,
                    total_followed: 0,
                    pages_processed: 0,
                    duration: 0,
                    details: vec![],
                    message: format!("导航失败: {}", nav_result.message),
                };
                let total_duration = start_time.elapsed().as_secs();
                
                return Ok(EnhancedImportAndFollowResult {
                    import_result,
                    app_status: Some(app_status),
                    navigation_result: Some(nav_result),
                    follow_result,
                    total_duration,
                    success: false,
                    step_details,
                });
            }
            nav_result
        }
        Err(e) => {
            error!("导航到通讯录页面异常: {}", e);
            step_details.push(format!("导航异常: {}", e));
            
            let follow_result = XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: format!("导航异常: {}", e),
            };
            let total_duration = start_time.elapsed().as_secs();
            
            return Ok(EnhancedImportAndFollowResult {
                import_result,
                app_status: Some(app_status),
                navigation_result: None,
                follow_result,
                total_duration,
                success: false,
                step_details,
            });
        }
    };

    // 3. 执行小红书自动关注
    step_details.push("步骤5: 开始执行小红书自动关注".to_string());
    let follow_result = match automator.auto_follow(options).await {
        Ok(result) => {
            step_details.push(format!(
                "自动关注完成: 成功={} 关注数={} 页数={} 耗时={}秒",
                result.success, result.total_followed, result.pages_processed, result.duration
            ));
            info!(
                "自动关注完成: 成功={} 关注数={} 页数={} 耗时={}秒",
                result.success, result.total_followed, result.pages_processed, result.duration
            );
            result
        }
        Err(e) => {
            error!("小红书自动关注失败: {}", e);
            step_details.push(format!("自动关注失败: {}", e));
            
            XiaohongshuFollowResult {
                success: false,
                total_followed: 0,
                pages_processed: 0,
                duration: 0,
                details: vec![],
                message: format!("自动关注失败: {}", e),
            }
        }
    };

    let total_duration = start_time.elapsed().as_secs();
    let success = import_result.success && follow_result.success;

    step_details.push(format!(
        "流程完成: 总成功={} 总耗时={}秒",
        success, total_duration
    ));

    let result = EnhancedImportAndFollowResult {
        import_result,
        app_status: Some(app_status),
        navigation_result: Some(navigation_result),
        follow_result,
        total_duration,
        success,
        step_details,
    };

    info!(
        "增强版流程完成: VCF导入={} 应用状态={} 导航={} 自动关注={} 总成功={} 总耗时={}秒",
        result.import_result.success,
        result.app_status.as_ref().map(|s| s.app_installed && s.app_running).unwrap_or(false),
        result.navigation_result.as_ref().map(|n| n.success).unwrap_or(false),
        result.follow_result.success,
        success,
        total_duration
    );
    Ok(result)
}

/// 专门处理前端VCF内容导入的命令 (修复前后端接口不匹配问题)
#[command]
#[allow(non_snake_case)]
pub async fn import_vcf_to_device(
    deviceId: String,
    vcfContent: String,
    contactCount: u32,
) -> Result<String, String> {
    info!("🚀 开始VCF内容导入: 设备 {} 联系人数 {}", deviceId, contactCount);
    
    // 1. 创建临时文件
    let timestamp = chrono::Utc::now().timestamp();
    let temp_file = format!("contacts_import_{}.vcf", timestamp);
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(&temp_file);
    
    info!("📄 创建临时VCF文件: {:?}", temp_path);
    
    // 2. 写入VCF内容到临时文件
    match std::fs::write(&temp_path, &vcfContent) {
        Ok(_) => info!("✅ VCF内容写入成功: {} bytes", vcfContent.len()),
        Err(e) => {
            error!("❌ 创建临时文件失败: {}", e);
            return Err(format!("创建临时文件失败: {}", e));
        }
    }
    
    // 3. 调用现有的导入逻辑 (使用Intent回退方法，因为ADB测试证明Intent方式有效)
    let importer = VcfImporter::new(deviceId.clone());
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    info!("🔄 开始调用VCF导入服务...");
    let import_result = match importer.import_vcf_contacts_with_intent_fallback(&temp_path_str).await {
        Ok(result) => {
            info!("📊 导入结果: 成功={} 总数={} 导入数={}", 
                  result.success, result.total_contacts, result.imported_contacts);
            result
        }
        Err(e) => {
            error!("❌ VCF导入异常: {}", e);
            // 清理临时文件
            let _ = std::fs::remove_file(&temp_path);
            return Err(format!("VCF导入异常: {}", e));
        }
    };
    
    // 4. 清理临时文件
    match std::fs::remove_file(&temp_path) {
        Ok(_) => info!("🧹 临时文件清理成功"),
        Err(e) => warn!("⚠️ 临时文件清理失败: {}", e),
    }
    
    // 5. 返回结果
    if import_result.success {
        let success_msg = format!(
            "✅ 导入成功: {}/{} 个联系人已导入到设备 {}",
            import_result.imported_contacts,
            import_result.total_contacts,
            deviceId
        );
        info!("{}", success_msg);
        Ok(success_msg)
    } else {
        let error_msg = format!(
            "❌ 导入失败: {} (设备: {})",
            import_result.message,
            deviceId
        );
        error!("{}", error_msg);
        Err(error_msg)
    }
}
