use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 设备品牌信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceBrandInfo {
    pub brand: String,
    pub model: String,
    pub android_version: String,
    pub manufacturer: String,
}

/// VCF导入策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VcfImportStrategy {
    pub strategy_name: String,
    pub brand_patterns: Vec<String>, // 支持的品牌名称模式
    pub contact_app_packages: Vec<String>, // 通讯录应用包名列表
    pub import_methods: Vec<ImportMethod>, // 导入方法列表
    pub verification_methods: Vec<VerificationMethod>, // 验证方法列表
}

/// 导入方法
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportMethod {
    pub method_name: String,
    pub steps: Vec<ImportStep>, // 导入步骤
    pub timeout_seconds: u64,
    pub retry_count: u32,
}

/// 导入步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportStep {
    pub step_type: ImportStepType,
    pub description: String,
    pub parameters: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImportStepType {
    LaunchContactApp,           // 启动通讯录应用
    NavigateToImport,          // 导航到导入功能
    SelectVcfFile,             // 选择VCF文件
    ConfirmImport,             // 确认导入
    WaitForCompletion,         // 等待导入完成
    HandlePermissions,         // 处理权限请求
    NavigateToFolder,          // 导航到文件夹
    CustomAdbCommand,          // 自定义ADB命令
}

/// 验证方法
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationMethod {
    pub method_name: String,
    pub verification_type: VerificationType,
    pub expected_results: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VerificationType {
    ContactCount,              // 联系人数量验证
    ContactSample,             // 联系人样本验证
    DatabaseQuery,             // 数据库查询验证
}

/// 导入结果
#[derive(Debug, Serialize, Deserialize)]
pub struct MultiBrandImportResult {
    pub success: bool,
    pub used_strategy: Option<String>,
    pub used_method: Option<String>,
    pub total_contacts: usize,
    pub imported_contacts: usize,
    pub failed_contacts: usize,
    pub attempts: Vec<ImportAttempt>,
    pub message: String,
    pub duration_seconds: u64,
}

/// 导入尝试记录
#[derive(Debug, Serialize, Deserialize)]
pub struct ImportAttempt {
    pub strategy_name: String,
    pub method_name: String,
    pub success: bool,
    pub error_message: Option<String>,
    pub duration_seconds: u64,
    pub verification_result: Option<bool>,
}
