use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tracing::{error, info, warn};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// 多设备兼容的VCF导入策略
#[derive(Debug, Serialize, Deserialize)]
pub struct MultiDeviceImportStrategy {
    pub strategies: Vec<ImportStrategy>,
    pub total_attempts: usize,
    pub successful_strategy: Option<String>,
    pub results: Vec<ImportAttemptResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportStrategy {
    pub name: String,
    pub description: String,
    pub device_types: Vec<String>, // 适用的设备类型
    pub priority: u8, // 优先级 (1-10, 10最高)
    pub method: ImportMethod,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ImportMethod {
    /// 华为/荣耀 ImportVCardActivity
    HuaweiActivity {
        package: String,
        activity: String,
    },
    /// 小米 MIUI
    XiaomiActivity {
        package: String,
        activity: String,
    },
    /// OPPO ColorOS
    OppoActivity {
        package: String,
        activity: String,
    },
    /// vivo FuntouchOS
    VivoActivity {
        package: String,
        activity: String,
    },
    /// 三星 One UI
    SamsungActivity {
        package: String,
        activity: String,
    },
    /// 原生Android/Google Contacts
    GoogleActivity {
        package: String,
        activity: String,
    },
    /// 通用Intent方式
    GenericIntent {
        action: String,
        data_type: String,
    },
    /// 通用文件系统方式
    FileSystemIntent {
        action: String,
        data_type: String,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportAttemptResult {
    pub strategy_name: String,
    pub success: bool,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
    pub device_response: Option<String>,
}

pub struct MultiDeviceVcfImporter {
    device_id: String,
    strategies: Vec<ImportStrategy>,
}

impl MultiDeviceVcfImporter {
    pub fn new(device_id: String) -> Self {
        let strategies = Self::create_default_strategies();
        
        Self {
            device_id,
            strategies,
        }
    }

    /// 创建默认的导入策略列表
    fn create_default_strategies() -> Vec<ImportStrategy> {
        vec![
            // 华为/荣耀设备 - 已验证成功
            ImportStrategy {
                name: "华为荣耀ImportVCardActivity".to_string(),
                description: "使用华为/荣耀系统专用的ImportVCardActivity导入".to_string(),
                device_types: vec!["huawei".to_string(), "honor".to_string()],
                priority: 10,
                method: ImportMethod::HuaweiActivity {
                    package: "com.hihonor.contacts".to_string(),
                    activity: "com.android.contacts.vcard.ImportVCardActivity".to_string(),
                },
            },
            
            // 华为老版本
            ImportStrategy {
                name: "华为老版本ImportVCardActivity".to_string(),
                description: "华为老版本联系人导入".to_string(),
                device_types: vec!["huawei".to_string()],
                priority: 9,
                method: ImportMethod::HuaweiActivity {
                    package: "com.huawei.contacts".to_string(),
                    activity: "com.android.contacts.vcard.ImportVCardActivity".to_string(),
                },
            },

            // 小米 MIUI
            ImportStrategy {
                name: "小米MIUI联系人导入".to_string(),
                description: "小米MIUI系统联系人导入".to_string(),
                device_types: vec!["xiaomi".to_string(), "redmi".to_string(), "poco".to_string()],
                priority: 9,
                method: ImportMethod::XiaomiActivity {
                    package: "com.miui.contacts".to_string(),
                    activity: "com.android.contacts.activities.ImportVCardActivity".to_string(),
                },
            },

            // OPPO ColorOS
            ImportStrategy {
                name: "OPPO联系人导入".to_string(),
                description: "OPPO ColorOS系统联系人导入".to_string(),
                device_types: vec!["oppo".to_string(), "oneplus".to_string()],
                priority: 8,
                method: ImportMethod::OppoActivity {
                    package: "com.coloros.contacts".to_string(),
                    activity: "com.android.contacts.vcard.ImportVCardActivity".to_string(),
                },
            },

            // vivo FuntouchOS
            ImportStrategy {
                name: "vivo联系人导入".to_string(),
                description: "vivo FuntouchOS系统联系人导入".to_string(),
                device_types: vec!["vivo".to_string(), "iqoo".to_string()],
                priority: 8,
                method: ImportMethod::VivoActivity {
                    package: "com.vivo.contacts".to_string(),
                    activity: "com.android.contacts.vcard.ImportVCardActivity".to_string(),
                },
            },

            // 三星 One UI
            ImportStrategy {
                name: "三星联系人导入".to_string(),
                description: "三星One UI系统联系人导入".to_string(),
                device_types: vec!["samsung".to_string()],
                priority: 8,
                method: ImportMethod::SamsungActivity {
                    package: "com.samsung.android.contacts".to_string(),
                    activity: "com.android.contacts.vcard.ImportVCardActivity".to_string(),
                },
            },

            // Google 原生联系人
            ImportStrategy {
                name: "Google原生联系人导入".to_string(),
                description: "Google原生Android联系人导入".to_string(),
                device_types: vec!["google".to_string(), "pixel".to_string()],
                priority: 9,
                method: ImportMethod::GoogleActivity {
                    package: "com.google.android.contacts".to_string(),
                    activity: "com.android.contacts.vcard.ImportVCardActivity".to_string(),
                },
            },

            // 标准Android联系人
            ImportStrategy {
                name: "标准Android联系人导入".to_string(),
                description: "标准Android系统联系人导入".to_string(),
                device_types: vec!["android".to_string()],
                priority: 7,
                method: ImportMethod::GoogleActivity {
                    package: "com.android.contacts".to_string(),
                    activity: "com.android.contacts.vcard.ImportVCardActivity".to_string(),
                },
            },

            // 通用Intent方式
            ImportStrategy {
                name: "通用Intent导入".to_string(),
                description: "使用通用Intent让系统选择应用导入".to_string(),
                device_types: vec!["*".to_string()],
                priority: 5,
                method: ImportMethod::GenericIntent {
                    action: "android.intent.action.VIEW".to_string(),
                    data_type: "text/x-vcard".to_string(),
                },
            },

            // 文件系统Intent方式
            ImportStrategy {
                name: "文件系统Intent导入".to_string(),
                description: "使用文件系统Intent导入VCF文件".to_string(),
                device_types: vec!["*".to_string()],
                priority: 4,
                method: ImportMethod::FileSystemIntent {
                    action: "android.intent.action.VIEW".to_string(),
                    data_type: "text/vcard".to_string(),
                },
            },
        ]
    }

    /// 执行多策略导入
    pub async fn import_with_all_strategies(&self, vcf_file_path: &str) -> Result<MultiDeviceImportStrategy> {
        info!("🚀 开始多设备兼容VCF导入: 设备={}, 文件={}", self.device_id, vcf_file_path);
        
        let mut results = Vec::new();
        let mut total_attempts = 0;
        let mut successful_strategy = None;
        
        // 按优先级排序策略
        let mut sorted_strategies = self.strategies.clone();
        sorted_strategies.sort_by(|a, b| b.priority.cmp(&a.priority));
        
        // 检测设备品牌（可选，用于优化策略选择）
        let device_brand = self.detect_device_brand().await.unwrap_or_else(|_| "unknown".to_string());
        info!("🔍 检测到设备品牌: {}", device_brand);
        
        // 逐个尝试策略
        for strategy in &sorted_strategies {
            total_attempts += 1;
            let start_time = std::time::Instant::now();
            
            info!("🎯 尝试策略 {}: {}", total_attempts, strategy.name);
            
            match self.execute_import_strategy(strategy, vcf_file_path).await {
                Ok(response) => {
                    let execution_time = start_time.elapsed().as_millis() as u64;
                    info!("✅ 策略 '{}' 执行成功，耗时: {}ms", strategy.name, execution_time);
                    
                    results.push(ImportAttemptResult {
                        strategy_name: strategy.name.clone(),
                        success: true,
                        error_message: None,
                        execution_time_ms: execution_time,
                        device_response: Some(response),
                    });
                    
                    successful_strategy = Some(strategy.name.clone());
                    break; // 成功后停止尝试其他策略
                }
                Err(e) => {
                    let execution_time = start_time.elapsed().as_millis() as u64;
                    warn!("❌ 策略 '{}' 执行失败: {}, 耗时: {}ms", strategy.name, e, execution_time);
                    
                    results.push(ImportAttemptResult {
                        strategy_name: strategy.name.clone(),
                        success: false,
                        error_message: Some(e.to_string()),
                        execution_time_ms: execution_time,
                        device_response: None,
                    });
                    
                    // 继续尝试下一个策略
                }
            }
        }
        
        let final_result = MultiDeviceImportStrategy {
            strategies: sorted_strategies,
            total_attempts,
            successful_strategy: successful_strategy.clone(),
            results,
        };
        
        if successful_strategy.is_some() {
            info!("🎉 多设备导入成功! 使用策略: {}", successful_strategy.unwrap());
        } else {
            warn!("😞 所有导入策略都失败了，共尝试了 {} 种方法", total_attempts);
        }
        
        Ok(final_result)
    }

    /// 执行单个导入策略
    async fn execute_import_strategy(&self, strategy: &ImportStrategy, vcf_file_path: &str) -> Result<String> {
        // 首先确保VCF文件在设备上
        let device_vcf_path = self.ensure_vcf_on_device(vcf_file_path).await?;
        
        match &strategy.method {
            ImportMethod::HuaweiActivity { package, activity } |
            ImportMethod::XiaomiActivity { package, activity } |
            ImportMethod::OppoActivity { package, activity } |
            ImportMethod::VivoActivity { package, activity } |
            ImportMethod::SamsungActivity { package, activity } |
            ImportMethod::GoogleActivity { package, activity } => {
                self.execute_activity_import(package, activity, &device_vcf_path).await
            }
            ImportMethod::GenericIntent { action, data_type } => {
                self.execute_generic_intent(action, data_type, &device_vcf_path).await
            }
            ImportMethod::FileSystemIntent { action, data_type } => {
                self.execute_file_system_intent(action, data_type, &device_vcf_path).await
            }
        }
    }

    /// 执行Activity方式导入
    async fn execute_activity_import(&self, package: &str, activity: &str, vcf_path: &str) -> Result<String> {
        let package_activity = format!("{}/{}", package, activity);
        let file_uri = format!("file://{}", vcf_path);
        
        let args = vec![
            "-s",
            &self.device_id,
            "shell",
            "am",
            "start",
            "-n",
            &package_activity,
            "-d",
            &file_uri,
        ];
        
        self.execute_adb_command(&args).await
    }

    /// 执行通用Intent导入
    async fn execute_generic_intent(&self, action: &str, data_type: &str, vcf_path: &str) -> Result<String> {
        let file_uri = format!("file://{}", vcf_path);
        
        let args = vec![
            "-s",
            &self.device_id,
            "shell",
            "am",
            "start",
            "-a",
            action,
            "-t",
            data_type,
            "-d",
            &file_uri,
        ];
        
        self.execute_adb_command(&args).await
    }

    /// 执行文件系统Intent导入
    async fn execute_file_system_intent(&self, action: &str, data_type: &str, vcf_path: &str) -> Result<String> {
        let filename = std::path::Path::new(vcf_path)
            .file_name()
            .unwrap()
            .to_string_lossy();
        let content_uri = format!(
            "content://com.android.externalstorage.documents/document/primary%3ADownload%2F{}", 
            filename
        );
        
        let args = vec![
            "-s",
            &self.device_id,
            "shell",
            "am",
            "start",
            "-a",
            action,
            "-t",
            data_type,
            "-d",
            &content_uri,
        ];
        
        self.execute_adb_command(&args).await
    }

    /// 确保VCF文件在设备上
    async fn ensure_vcf_on_device(&self, local_vcf_path: &str) -> Result<String> {
        let device_path = "/sdcard/Download/contacts_import.vcf";
        
        // 推送文件到设备
        let push_args = vec![
            "-s",
            &self.device_id,
            "push",
            local_vcf_path,
            device_path,
        ];
        
        self.execute_adb_command(&push_args).await?;
        
        // 验证文件存在
        let verify_args = vec![
            "-s",
            &self.device_id,
            "shell",
            "ls",
            "-la",
            device_path,
        ];
        
        match self.execute_adb_command(&verify_args).await {
            Ok(_) => {
                info!("✅ VCF文件成功推送到设备: {}", device_path);
                Ok(device_path.to_string())
            }
            Err(e) => {
                error!("❌ VCF文件推送验证失败: {}", e);
                Err(e)
            }
        }
    }

    /// 检测设备品牌
    async fn detect_device_brand(&self) -> Result<String> {
        let args = vec![
            "-s",
            &self.device_id,
            "shell",
            "getprop",
            "ro.product.brand",
        ];
        
        let output = self.execute_adb_command(&args).await?;
        Ok(output.trim().to_lowercase())
    }

    /// 执行ADB命令
    async fn execute_adb_command(&self, args: &[&str]) -> Result<String> {
        info!("🔧 执行ADB命令: adb {}", args.join(" "));
        
        let mut cmd = Command::new("adb");
        cmd.args(args);
        
        #[cfg(windows)]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        
        let output = cmd.output().context("执行ADB命令失败")?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("ADB命令执行失败: {}", stderr));
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.to_string())
    }
}