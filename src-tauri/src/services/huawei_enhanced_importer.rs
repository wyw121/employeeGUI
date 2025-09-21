/*!
 * Enhanced Multi-Brand VCF Importer
 * 基于成功Python项目经验的华为设备VCF导入模块
 * 
 * 主要改进：
 * 1. 集成Python项目成功的导入方法
 * 2. 增强华为设备特殊处理
 * 3. 添加Intent导入支持
 * 4. 优化ADB命令执行
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::time::{Duration, Instant};
use tracing::{debug, error, info, warn};
use std::path::Path;

/// 增强版导入方法
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedImportMethod {
    pub name: String,
    pub method_type: ImportMethodType,
    pub adb_commands: Vec<String>,
    pub description: String,
    pub success_indicators: Vec<String>,
    pub failure_indicators: Vec<String>,
    pub timeout_seconds: u64,
    pub requires_file_push: bool,
    pub device_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImportMethodType {
    IntentView,          // 使用Intent VIEW启动VCF导入（推荐）
    ContentProvider,     // 直接通过Content Provider导入
    AppDirect,          // 直接启动应用
    SystemImport,       // 系统级导入
}

/// 华为EMUI增强策略
pub struct HuaweiEmuiEnhancedStrategy {
    pub device_id: String,
    pub adb_path: String,
    pub temp_file_path: String,
}

impl HuaweiEmuiEnhancedStrategy {
    pub fn new(device_id: String, adb_path: String) -> Self {
        Self {
            device_id,
            adb_path,
            temp_file_path: "/sdcard/contacts_import/import_contacts.vcf".to_string(),
        }
    }

    pub fn get_enhanced_import_methods(&self) -> Vec<EnhancedImportMethod> {
        vec![
            // 方法1: Python项目成功的Intent导入（最推荐）
            EnhancedImportMethod {
                name: "华为Intent VCF导入".to_string(),
                method_type: ImportMethodType::IntentView,
                adb_commands: vec![
                    "shell mkdir -p /sdcard/contacts_import".to_string(),
                    format!("shell am start -a android.intent.action.VIEW -d file://{} -t text/vcard", self.temp_file_path),
                ],
                description: "基于Python成功经验的Intent VCF导入方法，华为设备首选".to_string(),
                success_indicators: vec![
                    "Activity started".to_string(),
                    "Starting: Intent".to_string(),
                    "file transferred".to_string(),
                ],
                failure_indicators: vec![
                    "Error".to_string(),
                    "Permission denied".to_string(),
                    "Activity not found".to_string(),
                ],
                timeout_seconds: 30,
                requires_file_push: true,
                device_path: Some(self.temp_file_path.clone()),
            },

            // 方法2: 华为专用通讯录应用
            EnhancedImportMethod {
                name: "华为通讯录应用".to_string(),
                method_type: ImportMethodType::AppDirect,
                adb_commands: vec![
                    format!("shell am start -a android.intent.action.VIEW -t text/vcard -n com.huawei.contacts/.activities.PeopleActivity -d file://{}", self.temp_file_path),
                ],
                description: "直接启动华为联系人应用进行VCF导入".to_string(),
                success_indicators: vec![
                    "Activity started".to_string(),
                ],
                failure_indicators: vec![
                    "Activity not found".to_string(),
                ],
                timeout_seconds: 20,
                requires_file_push: true,
                device_path: Some(self.temp_file_path.clone()),
            },

            // 方法3: EMUI系统通讯录
            EnhancedImportMethod {
                name: "EMUI系统通讯录".to_string(),
                method_type: ImportMethodType::AppDirect,
                adb_commands: vec![
                    format!("shell am start -a android.intent.action.VIEW -t text/vcard -n com.android.contacts/.activities.PeopleActivity -d file://{}", self.temp_file_path),
                ],
                description: "使用EMUI系统默认通讯录应用".to_string(),
                success_indicators: vec![
                    "Activity started".to_string(),
                ],
                failure_indicators: vec![
                    "Activity not found".to_string(),
                ],
                timeout_seconds: 20,
                requires_file_push: true,
                device_path: Some(self.temp_file_path.clone()),
            },

            // 方法4: 华为HiSuite通讯录组件
            EnhancedImportMethod {
                name: "HiSuite联系人".to_string(),
                method_type: ImportMethodType::AppDirect,
                adb_commands: vec![
                    format!("shell am start -a android.intent.action.VIEW -t text/vcard -n com.huawei.phoneservice/.contact.ContactsActivity -d file://{}", self.temp_file_path),
                ],
                description: "使用华为HiSuite联系人组件导入".to_string(),
                success_indicators: vec![
                    "Activity started".to_string(),
                ],
                failure_indicators: vec![
                    "Activity not found".to_string(),
                ],
                timeout_seconds: 20,
                requires_file_push: true,
                device_path: Some(self.temp_file_path.clone()),
            },

            // 方法5: Content Provider直接导入（需要Root权限）
            EnhancedImportMethod {
                name: "Content Provider导入".to_string(),
                method_type: ImportMethodType::ContentProvider,
                adb_commands: vec![
                    "shell content insert --uri content://com.android.contacts/raw_contacts --bind account_name:s:Phone --bind account_type:s:null".to_string(),
                ],
                description: "直接通过Content Provider导入（需要特殊权限）".to_string(),
                success_indicators: vec![
                    "Inserted".to_string(),
                    "Content provider".to_string(),
                ],
                failure_indicators: vec![
                    "Permission denied".to_string(),
                    "SecurityException".to_string(),
                ],
                timeout_seconds: 15,
                requires_file_push: false,
                device_path: None,
            },

            // 方法6: 通用VCard导入（备用）
            EnhancedImportMethod {
                name: "通用VCard导入".to_string(),
                method_type: ImportMethodType::SystemImport,
                adb_commands: vec![
                    "shell am start -a android.intent.action.INSERT -t vnd.android.cursor.item/contact".to_string(),
                ],
                description: "通用Android联系人导入Intent（备用方案）".to_string(),
                success_indicators: vec![
                    "Activity started".to_string(),
                ],
                failure_indicators: vec![
                    "Activity not found".to_string(),
                ],
                timeout_seconds: 15,
                requires_file_push: false,
                device_path: None,
            },
        ]
    }

    /// 执行VCF文件推送（基于Python成功经验）
    pub fn push_vcf_file(&self, local_vcf_path: &str) -> Result<(), String> {
        info!("开始推送VCF文件到华为设备: {} -> {}", local_vcf_path, self.temp_file_path);

        // 检查本地文件是否存在
        if !Path::new(local_vcf_path).exists() {
            return Err(format!("VCF文件不存在: {}", local_vcf_path));
        }

        // 1. 创建设备目录
        let mkdir_cmd = format!("{} -s {} shell mkdir -p /sdcard/contacts_import", 
                                self.adb_path, self.device_id);
        
        match Command::new("cmd")
            .args(&["/C", &mkdir_cmd])
            .output() {
                Ok(_) => debug!("设备目录创建完成"),
                Err(e) => warn!("目录创建可能失败（可能已存在）: {}", e),
            }

        // 2. 推送VCF文件
        let push_cmd = format!("{} -s {} push \"{}\" \"{}\"", 
                              self.adb_path, self.device_id, 
                              local_vcf_path, self.temp_file_path);
        
        debug!("执行推送命令: {}", push_cmd);
        
        match Command::new("cmd")
            .args(&["/C", &push_cmd])
            .output() {
                Ok(output) => {
                    if output.status.success() {
                        info!("VCF文件推送成功");
                        Ok(())
                    } else {
                        let error_msg = String::from_utf8_lossy(&output.stderr);
                        Err(format!("VCF推送失败: {}", error_msg))
                    }
                }
                Err(e) => Err(format!("推送命令执行失败: {}", e)),
            }
    }

    /// 清理设备临时文件
    pub fn cleanup_temp_files(&self) {
        let cleanup_cmd = format!("{} -s {} shell rm -f {}", 
                                 self.adb_path, self.device_id, self.temp_file_path);
        
        match Command::new("cmd")
            .args(&["/C", &cleanup_cmd])
            .output() {
                Ok(_) => debug!("临时文件清理完成"),
                Err(e) => debug!("临时文件清理失败（非关键错误）: {}", e),
            }
    }

    /// 执行增强版导入方法
    pub fn execute_import_method(&self, method: &EnhancedImportMethod, vcf_file_path: Option<&str>) -> Result<ImportExecutionResult, String> {
        let start_time = Instant::now();
        info!("开始执行华为导入方法: {}", method.name);

        // 如果需要推送文件，先执行推送
        if method.requires_file_push {
            if let Some(local_path) = vcf_file_path {
                if let Err(e) = self.push_vcf_file(local_path) {
                    return Err(format!("文件推送失败: {}", e));
                }
                // 等待文件稳定
                std::thread::sleep(Duration::from_millis(1000));
            } else {
                return Err("该方法需要VCF文件路径".to_string());
            }
        }

        // 执行ADB命令
        let mut execution_results = Vec::new();
        let mut overall_success = true;

        for (index, cmd) in method.adb_commands.iter().enumerate() {
            debug!("执行ADB命令 {}/{}: {}", index + 1, method.adb_commands.len(), cmd);
            
            let full_cmd = format!("{} -s {} {}", self.adb_path, self.device_id, cmd);
            
            match Command::new("cmd")
                .args(&["/C", &full_cmd])
                .output() {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        
                        let cmd_success = output.status.success() && 
                            method.success_indicators.iter().any(|indicator| {
                                stdout.contains(indicator) || stderr.contains(indicator)
                            });
                        
                        execution_results.push(CommandResult {
                            command: cmd.clone(),
                            success: cmd_success,
                            stdout: stdout.to_string(),
                            stderr: stderr.to_string(),
                            duration: start_time.elapsed().as_secs(),
                        });

                        if !cmd_success {
                            overall_success = false;
                            // 检查是否有明确的失败指标
                            let has_failure_indicator = method.failure_indicators.iter().any(|indicator| {
                                stdout.contains(indicator) || stderr.contains(indicator)
                            });
                            
                            if has_failure_indicator {
                                break; // 明确失败，不继续执行
                            }
                        }
                    }
                    Err(e) => {
                        execution_results.push(CommandResult {
                            command: cmd.clone(),
                            success: false,
                            stdout: String::new(),
                            stderr: format!("命令执行错误: {}", e),
                            duration: start_time.elapsed().as_secs(),
                        });
                        overall_success = false;
                        break;
                    }
                }
        }

        // 如果推送了文件且导入完成，清理临时文件
        if method.requires_file_push && overall_success {
            self.cleanup_temp_files();
        }

        let duration = start_time.elapsed().as_secs();
        
        if overall_success {
            info!("华为导入方法 '{}' 执行成功，耗时: {}秒", method.name, duration);
        } else {
            warn!("华为导入方法 '{}' 执行失败，耗时: {}秒", method.name, duration);
        }

        Ok(ImportExecutionResult {
            method_name: method.name.clone(),
            success: overall_success,
            duration_seconds: duration,
            command_results: execution_results,
            error_message: if overall_success { None } else { Some("导入方法执行失败".to_string()) },
        })
    }
}

/// 命令执行结果
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub command: String,
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub duration: u64,
}

/// 导入执行结果
#[derive(Debug, Serialize, Deserialize)]
pub struct ImportExecutionResult {
    pub method_name: String,
    pub success: bool,
    pub duration_seconds: u64,
    pub command_results: Vec<CommandResult>,
    pub error_message: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_huawei_strategy_creation() {
        let strategy = HuaweiEmuiEnhancedStrategy::new(
            "emulator-5554".to_string(),
            "adb".to_string()
        );
        
        let methods = strategy.get_enhanced_import_methods();
        assert!(methods.len() >= 6);
        assert!(methods.iter().any(|m| m.name.contains("华为Intent VCF导入")));
    }

    #[test]
    fn test_import_method_structure() {
        let strategy = HuaweiEmuiEnhancedStrategy::new(
            "test".to_string(),
            "adb".to_string()
        );
        
        let methods = strategy.get_enhanced_import_methods();
        let intent_method = methods.iter().find(|m| m.name.contains("Intent")).unwrap();
        
        assert!(intent_method.requires_file_push);
        assert!(intent_method.device_path.is_some());
        assert!(!intent_method.success_indicators.is_empty());
    }
}