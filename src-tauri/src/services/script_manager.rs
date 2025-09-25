use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use tauri::command;
use tracing::{info, warn};
use chrono::{DateTime, Utc};

use crate::services::execution::model::{SmartScriptStep, SmartExecutionResult, SmartExecutorConfig};

/// 智能脚本完整定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartScript {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author: String,
    pub category: String,
    pub tags: Vec<String>,
    pub steps: Vec<SmartScriptStep>,
    pub config: SmartExecutorConfig,
    pub metadata: HashMap<String, serde_json::Value>,
}

impl Default for SmartScript {
    fn default() -> Self {
        let now = Utc::now();
        let id = format!("script_{}", now.timestamp_millis());
        Self {
            id,
            name: "新建脚本".to_string(),
            description: "".to_string(),
            version: "1.0.0".to_string(),
            created_at: now,
            updated_at: now,
            author: "用户".to_string(),
            category: "通用".to_string(),
            tags: vec![],
            steps: vec![],
            config: SmartExecutorConfig {
                continue_on_error: true,
                auto_verification_enabled: true,
                smart_recovery_enabled: true,
                detailed_logging: true,
            },
            metadata: HashMap::new(),
        }
    }
}

/// 脚本执行记录
#[derive(Debug, Serialize, Deserialize)]
pub struct ScriptExecutionRecord {
    pub id: String,
    pub script_id: String,
    pub device_id: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub result: Option<SmartExecutionResult>,
    pub status: ExecutionStatus,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// 脚本管理服务
pub struct ScriptManagerService {
    scripts_dir: String,
    templates_dir: String,
    execution_history: Vec<ScriptExecutionRecord>,
}

impl ScriptManagerService {
    pub fn new() -> Self {
        let scripts_dir = "data/scripts".to_string();
        let templates_dir = "data/templates".to_string();
        
        // 确保目录存在
        if let Err(e) = fs::create_dir_all(&scripts_dir) {
            warn!("创建脚本目录失败: {}", e);
        }
        if let Err(e) = fs::create_dir_all(&templates_dir) {
            warn!("创建模板目录失败: {}", e);
        }
        
        Self {
            scripts_dir,
            templates_dir,
            execution_history: Vec::new(),
        }
    }

    /// 保存脚本到文件
    pub fn save_script(&self, script: &SmartScript) -> Result<()> {
        let file_path = format!("{}/{}.json", self.scripts_dir, script.id);
        let content = serde_json::to_string_pretty(script)?;
        fs::write(&file_path, content)?;
        
        info!("脚本保存成功: {} -> {}", script.name, file_path);
        Ok(())
    }

    /// 从文件加载脚本
    pub fn load_script(&self, script_id: &str) -> Result<SmartScript> {
        let file_path = format!("{}/{}.json", self.scripts_dir, script_id);
        let content = fs::read_to_string(&file_path)?;
        let script: SmartScript = serde_json::from_str(&content)?;
        
        info!("脚本加载成功: {} <- {}", script.name, file_path);
        Ok(script)
    }

    /// 删除脚本
    pub fn delete_script(&self, script_id: &str) -> Result<()> {
        let file_path = format!("{}/{}.json", self.scripts_dir, script_id);
        fs::remove_file(&file_path)?;
        
        info!("脚本删除成功: {}", script_id);
        Ok(())
    }

    /// 列出所有脚本
    pub fn list_scripts(&self) -> Result<Vec<SmartScript>> {
        let mut scripts = Vec::new();
        
        if let Ok(entries) = fs::read_dir(&self.scripts_dir) {
            for entry in entries.flatten() {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.ends_with(".json") {
                        let script_id = file_name.trim_end_matches(".json");
                        if let Ok(script) = self.load_script(script_id) {
                            scripts.push(script);
                        }
                    }
                }
            }
        }

        // 按更新时间排序
        scripts.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        
        info!("列出脚本成功，共 {} 个", scripts.len());
        Ok(scripts)
    }

    /// 导入脚本
    pub fn import_script(&self, file_path: &str) -> Result<SmartScript> {
        let content = fs::read_to_string(file_path)?;
        let mut script: SmartScript = serde_json::from_str(&content)?;
        
        // 生成新ID，更新时间戳
        let now = Utc::now();
        script.id = format!("script_{}", now.timestamp_millis());
        script.updated_at = now;
        
        // 保存导入的脚本
        self.save_script(&script)?;
        
        info!("脚本导入成功: {} <- {}", script.name, file_path);
        Ok(script)
    }

    /// 导出脚本
    pub fn export_script(&self, script_id: &str, output_path: &str) -> Result<()> {
        let script = self.load_script(script_id)?;
        let content = serde_json::to_string_pretty(&script)?;
        fs::write(output_path, content)?;
        
        info!("脚本导出成功: {} -> {}", script.name, output_path);
        Ok(())
    }

    /// 创建脚本模板
    pub fn create_template(&self, name: &str, category: &str, steps: Vec<SmartScriptStep>) -> Result<SmartScript> {
        let mut template = SmartScript::default();
        template.name = name.to_string();
        template.category = category.to_string();
        template.steps = steps;
        template.tags.push("模板".to_string());
        
        // 保存为模板
        let template_path = format!("{}/{}.json", self.templates_dir, template.id);
        let content = serde_json::to_string_pretty(&template)?;
        fs::write(&template_path, content)?;
        
        info!("模板创建成功: {}", name);
        Ok(template)
    }

    /// 列出所有模板
    pub fn list_templates(&self) -> Result<Vec<SmartScript>> {
        let mut templates = Vec::new();
        
        if let Ok(entries) = fs::read_dir(&self.templates_dir) {
            for entry in entries.flatten() {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.ends_with(".json") {
                        let template_id = file_name.trim_end_matches(".json");
                        let file_path = format!("{}/{}.json", self.templates_dir, template_id);
                        if let Ok(content) = fs::read_to_string(&file_path) {
                            if let Ok(template) = serde_json::from_str::<SmartScript>(&content) {
                                templates.push(template);
                            }
                        }
                    }
                }
            }
        }

        templates.sort_by(|a, b| a.name.cmp(&b.name));
        
        info!("列出模板成功，共 {} 个", templates.len());
        Ok(templates)
    }

    /// 从模板创建脚本
    pub fn create_from_template(&self, template_id: &str, name: &str) -> Result<SmartScript> {
        let template_path = format!("{}/{}.json", self.templates_dir, template_id);
        let content = fs::read_to_string(&template_path)?;
        let mut script: SmartScript = serde_json::from_str(&content)?;
        
        // 生成新ID和更新信息
        let now = Utc::now();
        script.id = format!("script_{}", now.timestamp_millis());
        script.name = name.to_string();
        script.created_at = now;
        script.updated_at = now;
        script.tags = vec!["来自模板".to_string()];
        
        // 保存新脚本
        self.save_script(&script)?;
        
        info!("从模板创建脚本成功: {}", name);
        Ok(script)
    }

    /// 记录脚本执行
    pub fn record_execution(&mut self, script_id: String, device_id: String) -> String {
        let now = Utc::now();
        let record = ScriptExecutionRecord {
            id: format!("exec_{}", now.timestamp_millis()),
            script_id,
            device_id,
            started_at: now,
            completed_at: None,
            result: None,
            status: ExecutionStatus::Running,
        };
        
        let record_id = record.id.clone();
        self.execution_history.push(record);
        record_id
    }

    /// 更新执行结果
    pub fn update_execution_result(&mut self, record_id: &str, result: SmartExecutionResult) -> Result<()> {
        if let Some(record) = self.execution_history.iter_mut().find(|r| r.id == record_id) {
            record.completed_at = Some(Utc::now());
            record.result = Some(result);
            record.status = if record.result.as_ref().unwrap().success {
                ExecutionStatus::Completed
            } else {
                ExecutionStatus::Failed
            };
        }
        Ok(())
    }

    /// 获取执行历史
    pub fn get_execution_history(&self) -> Vec<&ScriptExecutionRecord> {
        let mut history: Vec<&ScriptExecutionRecord> = self.execution_history.iter().collect();
        history.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        history
    }
}

// ==================== Tauri 命令 ====================

#[command]
pub async fn save_smart_script(script: SmartScript) -> Result<SmartScript, String> {
    let service = ScriptManagerService::new();
    let mut updated_script = script;
    updated_script.updated_at = Utc::now();
    
    service.save_script(&updated_script)
        .map_err(|e| format!("保存脚本失败: {}", e))?;
    
    Ok(updated_script)
}

#[command]
pub async fn load_smart_script(script_id: String) -> Result<SmartScript, String> {
    let service = ScriptManagerService::new();
    service.load_script(&script_id)
        .map_err(|e| format!("加载脚本失败: {}", e))
}

#[command]
pub async fn delete_smart_script(script_id: String) -> Result<(), String> {
    let service = ScriptManagerService::new();
    service.delete_script(&script_id)
        .map_err(|e| format!("删除脚本失败: {}", e))
}

#[command]
pub async fn list_smart_scripts() -> Result<Vec<SmartScript>, String> {
    let service = ScriptManagerService::new();
    service.list_scripts()
        .map_err(|e| format!("列出脚本失败: {}", e))
}

#[command]
pub async fn import_smart_script(file_path: String) -> Result<SmartScript, String> {
    let service = ScriptManagerService::new();
    service.import_script(&file_path)
        .map_err(|e| format!("导入脚本失败: {}", e))
}

#[command]
pub async fn export_smart_script(script_id: String, output_path: String) -> Result<(), String> {
    let service = ScriptManagerService::new();
    service.export_script(&script_id, &output_path)
        .map_err(|e| format!("导出脚本失败: {}", e))
}

#[command]
pub async fn list_script_templates() -> Result<Vec<SmartScript>, String> {
    let service = ScriptManagerService::new();
    service.list_templates()
        .map_err(|e| format!("列出模板失败: {}", e))
}

#[command]
pub async fn create_script_from_template(template_id: String, name: String) -> Result<SmartScript, String> {
    let service = ScriptManagerService::new();
    service.create_from_template(&template_id, &name)
        .map_err(|e| format!("从模板创建脚本失败: {}", e))
}