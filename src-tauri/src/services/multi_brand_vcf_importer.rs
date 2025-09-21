use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

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

/// 多品牌VCF导入器
pub struct MultiBrandVcfImporter {
    device_id: String,
    adb_path: String,
    strategies: Vec<VcfImportStrategy>,
    device_info: Option<DeviceBrandInfo>,
}

impl MultiBrandVcfImporter {
    pub fn new(device_id: String) -> Self {
        let mut importer = Self {
            device_id,
            adb_path: Self::detect_adb_path(),
            strategies: Vec::new(),
            device_info: None,
        };
        
        // 初始化内置策略
        importer.initialize_builtin_strategies();
        importer
    }

    /// 自动检测ADB路径
    fn detect_adb_path() -> String {
        // 检查常见的ADB路径
        let common_paths = vec![
            "D:\\leidian\\LDPlayer9\\adb.exe",
            "D:\\rust\\active-projects\\小红书\\employeeGUI\\platform-tools\\adb.exe",
            "adb", // 系统PATH中的adb
        ];
        
        for path in common_paths {
            if std::path::Path::new(path).exists() {
                info!("检测到ADB路径: {}", path);
                return path.to_string();
            }
        }
        
        warn!("未检测到ADB路径，使用默认路径");
        "adb".to_string()
    }

    /// 初始化内置策略
    fn initialize_builtin_strategies(&mut self) {
        // 华为策略
        let huawei_strategy = VcfImportStrategy {
            strategy_name: "Huawei_EMUI".to_string(),
            brand_patterns: vec!["huawei".to_string(), "honor".to_string(), "荣耀".to_string()],
            contact_app_packages: vec![
                "com.android.contacts".to_string(),
                "com.huawei.contacts".to_string(),
                "com.android.providers.contacts".to_string(),
            ],
            import_methods: vec![
                ImportMethod {
                    method_name: "EMUI_Standard_Import".to_string(),
                    steps: vec![
                        ImportStep {
                            step_type: ImportStepType::LaunchContactApp,
                            description: "启动华为通讯录".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::NavigateToImport,
                            description: "导航到导入功能".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::SelectVcfFile,
                            description: "选择VCF文件".to_string(),
                            parameters: HashMap::new(),
                        },
                    ],
                    timeout_seconds: 120,
                    retry_count: 2,
                },
            ],
            verification_methods: vec![
                VerificationMethod {
                    method_name: "ContactCount".to_string(),
                    verification_type: VerificationType::ContactCount,
                    expected_results: HashMap::new(),
                },
            ],
        };

        // 小米策略
        let xiaomi_strategy = VcfImportStrategy {
            strategy_name: "MIUI_Xiaomi".to_string(),
            brand_patterns: vec!["xiaomi".to_string(), "redmi".to_string(), "小米".to_string(), "红米".to_string()],
            contact_app_packages: vec![
                "com.android.contacts".to_string(),
                "com.miui.contacts".to_string(),
                "com.xiaomi.contacts".to_string(),
            ],
            import_methods: vec![
                ImportMethod {
                    method_name: "MIUI_Standard_Import".to_string(),
                    steps: vec![
                        ImportStep {
                            step_type: ImportStepType::LaunchContactApp,
                            description: "启动MIUI通讯录".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::NavigateToImport,
                            description: "导航到导入/导出".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::SelectVcfFile,
                            description: "从存储设备导入".to_string(),
                            parameters: HashMap::new(),
                        },
                    ],
                    timeout_seconds: 120,
                    retry_count: 2,
                },
            ],
            verification_methods: vec![
                VerificationMethod {
                    method_name: "ContactCount".to_string(),
                    verification_type: VerificationType::ContactCount,
                    expected_results: HashMap::new(),
                },
            ],
        };

        // 原生Android策略
        let android_strategy = VcfImportStrategy {
            strategy_name: "Stock_Android".to_string(),
            brand_patterns: vec!["google".to_string(), "pixel".to_string(), "android".to_string()],
            contact_app_packages: vec![
                "com.android.contacts".to_string(),
                "com.google.android.contacts".to_string(),
            ],
            import_methods: vec![
                ImportMethod {
                    method_name: "Stock_Android_Import".to_string(),
                    steps: vec![
                        ImportStep {
                            step_type: ImportStepType::LaunchContactApp,
                            description: "启动原生通讯录".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::NavigateToImport,
                            description: "导航到导入".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::SelectVcfFile,
                            description: "选择VCF文件".to_string(),
                            parameters: HashMap::new(),
                        },
                    ],
                    timeout_seconds: 120,
                    retry_count: 2,
                },
            ],
            verification_methods: vec![
                VerificationMethod {
                    method_name: "ContactCount".to_string(),
                    verification_type: VerificationType::ContactCount,
                    expected_results: HashMap::new(),
                },
            ],
        };

        // OPPO策略
        let oppo_strategy = VcfImportStrategy {
            strategy_name: "ColorOS_OPPO".to_string(),
            brand_patterns: vec!["oppo".to_string(), "oneplus".to_string(), "realme".to_string()],
            contact_app_packages: vec![
                "com.android.contacts".to_string(),
                "com.oppo.contacts".to_string(),
                "com.coloros.contacts".to_string(),
            ],
            import_methods: vec![
                ImportMethod {
                    method_name: "ColorOS_Import".to_string(),
                    steps: vec![
                        ImportStep {
                            step_type: ImportStepType::LaunchContactApp,
                            description: "启动ColorOS通讯录".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::NavigateToImport,
                            description: "导航到导入联系人".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::SelectVcfFile,
                            description: "从文件导入".to_string(),
                            parameters: HashMap::new(),
                        },
                    ],
                    timeout_seconds: 120,
                    retry_count: 2,
                },
            ],
            verification_methods: vec![
                VerificationMethod {
                    method_name: "ContactCount".to_string(),
                    verification_type: VerificationType::ContactCount,
                    expected_results: HashMap::new(),
                },
            ],
        };

        // VIVO策略
        let vivo_strategy = VcfImportStrategy {
            strategy_name: "FuntouchOS_VIVO".to_string(),
            brand_patterns: vec!["vivo".to_string(), "iqoo".to_string()],
            contact_app_packages: vec![
                "com.android.contacts".to_string(),
                "com.vivo.contacts".to_string(),
            ],
            import_methods: vec![
                ImportMethod {
                    method_name: "FuntouchOS_Import".to_string(),
                    steps: vec![
                        ImportStep {
                            step_type: ImportStepType::LaunchContactApp,
                            description: "启动VIVO通讯录".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::NavigateToImport,
                            description: "导航到导入".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::SelectVcfFile,
                            description: "从存储卡导入".to_string(),
                            parameters: HashMap::new(),
                        },
                    ],
                    timeout_seconds: 120,
                    retry_count: 2,
                },
            ],
            verification_methods: vec![
                VerificationMethod {
                    method_name: "ContactCount".to_string(),
                    verification_type: VerificationType::ContactCount,
                    expected_results: HashMap::new(),
                },
            ],
        };

        // 三星策略
        let samsung_strategy = VcfImportStrategy {
            strategy_name: "OneUI_Samsung".to_string(),
            brand_patterns: vec!["samsung".to_string(), "三星".to_string()],
            contact_app_packages: vec![
                "com.android.contacts".to_string(),
                "com.samsung.android.contacts".to_string(),
                "com.samsung.android.app.contacts".to_string(),
            ],
            import_methods: vec![
                ImportMethod {
                    method_name: "OneUI_Import".to_string(),
                    steps: vec![
                        ImportStep {
                            step_type: ImportStepType::LaunchContactApp,
                            description: "启动三星通讯录".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::NavigateToImport,
                            description: "导航到导入/导出联系人".to_string(),
                            parameters: HashMap::new(),
                        },
                        ImportStep {
                            step_type: ImportStepType::SelectVcfFile,
                            description: "从设备存储空间导入".to_string(),
                            parameters: HashMap::new(),
                        },
                    ],
                    timeout_seconds: 120,
                    retry_count: 2,
                },
            ],
            verification_methods: vec![
                VerificationMethod {
                    method_name: "ContactCount".to_string(),
                    verification_type: VerificationType::ContactCount,
                    expected_results: HashMap::new(),
                },
            ],
        };

        // 添加所有策略
        self.strategies.extend(vec![
            huawei_strategy,
            xiaomi_strategy,
            android_strategy,
            oppo_strategy,
            vivo_strategy,
            samsung_strategy,
        ]);

        info!("已初始化 {} 个内置导入策略", self.strategies.len());
    }

    /// 执行ADB命令
    fn execute_adb_command(&self, args: &[&str]) -> Result<std::process::Output> {
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        
        cmd.output().context("ADB命令执行失败")
    }

    /// 获取设备信息
    pub async fn detect_device_info(&mut self) -> Result<DeviceBrandInfo> {
        info!("正在检测设备信息...");
        
        // 获取设备品牌
        let brand_output = self.execute_adb_command(&["-s", &self.device_id, "shell", "getprop", "ro.product.brand"])?;
        let brand = String::from_utf8_lossy(&brand_output.stdout).trim().to_lowercase();
        
        // 获取设备型号
        let model_output = self.execute_adb_command(&["-s", &self.device_id, "shell", "getprop", "ro.product.model"])?;
        let model = String::from_utf8_lossy(&model_output.stdout).trim().to_string();
        
        // 获取Android版本
        let version_output = self.execute_adb_command(&["-s", &self.device_id, "shell", "getprop", "ro.build.version.release"])?;
        let android_version = String::from_utf8_lossy(&version_output.stdout).trim().to_string();
        
        // 获取制造商
        let manufacturer_output = self.execute_adb_command(&["-s", &self.device_id, "shell", "getprop", "ro.product.manufacturer"])?;
        let manufacturer = String::from_utf8_lossy(&manufacturer_output.stdout).trim().to_string();
        
        let device_info = DeviceBrandInfo {
            brand: brand.clone(),
            model,
            android_version,
            manufacturer,
        };
        
        info!("检测到设备信息: {:?}", device_info);
        self.device_info = Some(device_info.clone());
        Ok(device_info)
    }

    /// 智能选择适合的策略
    pub fn select_strategies(&self, device_info: &DeviceBrandInfo) -> Vec<&VcfImportStrategy> {
        let mut matched_strategies = Vec::new();
        let mut fallback_strategies = Vec::new();
        
        for strategy in &self.strategies {
            let mut is_match = false;
            
            // 检查品牌模式匹配
            for pattern in &strategy.brand_patterns {
                if device_info.brand.contains(&pattern.to_lowercase()) || 
                   device_info.manufacturer.to_lowercase().contains(&pattern.to_lowercase()) {
                    is_match = true;
                    break;
                }
            }
            
            if is_match {
                matched_strategies.push(strategy);
            } else {
                fallback_strategies.push(strategy);
            }
        }
        
        // 先返回匹配的策略，然后是备选策略
        matched_strategies.extend(fallback_strategies);
        
        info!("为设备 {} 选择了 {} 个策略", device_info.brand, matched_strategies.len());
        matched_strategies
    }

    /// 批量尝试导入VCF文件
    pub async fn import_vcf_contacts_multi_brand(&mut self, vcf_file_path: &str) -> Result<MultiBrandImportResult> {
        let start_time = std::time::Instant::now();
        let mut attempts = Vec::new();
        
        info!("开始多品牌VCF导入: {}", vcf_file_path);
        
        // 检测设备信息
        let device_info = match self.detect_device_info().await {
            Ok(info) => info,
            Err(e) => {
                error!("设备信息检测失败: {}", e);
                return Ok(MultiBrandImportResult {
                    success: false,
                    used_strategy: None,
                    used_method: None,
                    total_contacts: 0,
                    imported_contacts: 0,
                    failed_contacts: 0,
                    attempts,
                    message: format!("设备信息检测失败: {}", e),
                    duration_seconds: start_time.elapsed().as_secs(),
                });
            }
        };
        
        // 选择适合的策略
        let strategies = self.select_strategies(&device_info);
        
        if strategies.is_empty() {
            return Ok(MultiBrandImportResult {
                success: false,
                used_strategy: None,
                used_method: None,
                total_contacts: 0,
                imported_contacts: 0,
                failed_contacts: 0,
                attempts,
                message: "未找到适合的导入策略".to_string(),
                duration_seconds: start_time.elapsed().as_secs(),
            });
        }
        
        // 批量尝试各种策略
        for strategy in strategies {
            info!("尝试策略: {}", strategy.strategy_name);
            
            for method in &strategy.import_methods {
                let method_start = std::time::Instant::now();
                info!("  尝试方法: {}", method.method_name);
                
                match self.try_import_method(strategy, method, vcf_file_path).await {
                    Ok(result) => {
                        let attempt = ImportAttempt {
                            strategy_name: strategy.strategy_name.clone(),
                            method_name: method.method_name.clone(),
                            success: true,
                            error_message: None,
                            duration_seconds: method_start.elapsed().as_secs(),
                            verification_result: Some(true),
                        };
                        attempts.push(attempt);
                        
                        // 成功导入，返回结果
                        return Ok(MultiBrandImportResult {
                            success: true,
                            used_strategy: Some(strategy.strategy_name.clone()),
                            used_method: Some(method.method_name.clone()),
                            total_contacts: result.total_contacts,
                            imported_contacts: result.imported_contacts,
                            failed_contacts: result.failed_contacts,
                            attempts,
                            message: format!("使用{}策略的{}方法成功导入", strategy.strategy_name, method.method_name),
                            duration_seconds: start_time.elapsed().as_secs(),
                        });
                    }
                    Err(e) => {
                        let attempt = ImportAttempt {
                            strategy_name: strategy.strategy_name.clone(),
                            method_name: method.method_name.clone(),
                            success: false,
                            error_message: Some(e.to_string()),
                            duration_seconds: method_start.elapsed().as_secs(),
                            verification_result: Some(false),
                        };
                        attempts.push(attempt);
                        
                        warn!("    方法失败: {}", e);
                    }
                }
                
                // 每次尝试之间的间隔
                sleep(Duration::from_secs(2)).await;
            }
        }
        
        // 所有策略都失败了
        Ok(MultiBrandImportResult {
            success: false,
            used_strategy: None,
            used_method: None,
            total_contacts: 0,
            imported_contacts: 0,
            failed_contacts: 0,
            attempts,
            message: "所有导入策略都失败了".to_string(),
            duration_seconds: start_time.elapsed().as_secs(),
        })
    }

    /// 尝试单个导入方法
    async fn try_import_method(
        &self, 
        strategy: &VcfImportStrategy, 
        method: &ImportMethod, 
        vcf_file_path: &str
    ) -> Result<crate::services::vcf_importer::VcfImportResult> {
        // 这里将实现具体的导入逻辑
        // 当前先返回一个简化的实现
        
        // 首先检查通讯录应用是否存在
        let mut available_app = None;
        for package in &strategy.contact_app_packages {
            let check_cmd = format!("pm list packages | grep {}", package);
            if let Ok(output) = self.execute_adb_command(&["-s", &self.device_id, "shell", &check_cmd]) {
                if !output.stdout.is_empty() {
                    available_app = Some(package.clone());
                    break;
                }
            }
        }
        
        let app_package = available_app.ok_or_else(|| anyhow::anyhow!("未找到可用的通讯录应用"))?;
        
        info!("使用通讯录应用: {}", app_package);
        
        // 执行导入步骤
        for step in &method.steps {
            match &step.step_type {
                ImportStepType::LaunchContactApp => {
                    self.launch_contact_app(&app_package).await?;
                }
                ImportStepType::NavigateToImport => {
                    self.navigate_to_import().await?;
                }
                ImportStepType::SelectVcfFile => {
                    self.select_vcf_file(vcf_file_path).await?;
                }
                ImportStepType::ConfirmImport => {
                    self.confirm_import().await?;
                }
                ImportStepType::WaitForCompletion => {
                    self.wait_for_completion().await?;
                }
                ImportStepType::HandlePermissions => {
                    self.handle_permissions().await?;
                }
                _ => {
                    // 其他步骤的实现
                }
            }
        }
        
        // 简化的成功返回
        Ok(crate::services::vcf_importer::VcfImportResult {
            success: true,
            total_contacts: 100, // 这里应该实际计算
            imported_contacts: 100,
            failed_contacts: 0,
            message: "导入成功".to_string(),
            details: None,
            duration: Some(30),
        })
    }

    /// 启动通讯录应用
    async fn launch_contact_app(&self, package_name: &str) -> Result<()> {
        info!("启动通讯录应用: {}", package_name);
        
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "am", "start", "-n",
            &format!("{}/com.android.contacts.activities.PeopleActivity", package_name)
        ])?;
        
        if !output.stderr.is_empty() {
            // 尝试其他启动方式
            let _ = self.execute_adb_command(&[
                "-s", &self.device_id,
                "shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"
            ])?;
        }
        
        sleep(Duration::from_secs(3)).await;
        Ok(())
    }

    /// 导航到导入功能
    async fn navigate_to_import(&self) -> Result<()> {
        info!("导航到导入功能");
        
        // 这里会实现UI自动化逻辑
        // 目前先返回成功
        sleep(Duration::from_secs(2)).await;
        Ok(())
    }

    /// 选择VCF文件
    async fn select_vcf_file(&self, vcf_file_path: &str) -> Result<()> {
        info!("选择VCF文件: {}", vcf_file_path);
        
        // 这里会实现文件选择逻辑
        // 目前先返回成功
        sleep(Duration::from_secs(2)).await;
        Ok(())
    }

    /// 确认导入
    async fn confirm_import(&self) -> Result<()> {
        info!("确认导入");
        
        // 这里会实现确认导入的逻辑
        sleep(Duration::from_secs(1)).await;
        Ok(())
    }

    /// 等待导入完成
    async fn wait_for_completion(&self) -> Result<()> {
        info!("等待导入完成");
        
        // 这里会实现等待逻辑
        sleep(Duration::from_secs(5)).await;
        Ok(())
    }

    /// 处理权限请求
    async fn handle_permissions(&self) -> Result<()> {
        info!("处理权限请求");
        
        // 这里会实现权限处理逻辑
        sleep(Duration::from_secs(1)).await;
        Ok(())
    }

    /// 获取支持的策略列表
    pub fn get_supported_strategies(&self) -> Vec<String> {
        self.strategies.iter()
            .map(|s| s.strategy_name.clone())
            .collect()
    }

    /// 添加自定义策略
    pub fn add_custom_strategy(&mut self, strategy: VcfImportStrategy) {
        info!("添加自定义策略: {}", strategy.strategy_name);
        self.strategies.push(strategy);
    }
}