use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;
use tracing::{error, info};

use crate::services::adb_session_manager::get_device_session;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SmartActionType {
    Tap,
    Input,
    Wait,
    SmartTap,
    SmartFindElement,
    RecognizePage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartScriptStep {
    pub id: String,
    pub step_type: SmartActionType,
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
    pub enabled: bool,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SingleStepTestResult {
    pub success: bool,
    pub step_id: String,
    pub step_name: String,
    pub message: String,
    pub duration_ms: u64,
    pub timestamp: i64,
    pub page_state: Option<String>,
    pub ui_elements: Vec<serde_json::Value>,
    pub logs: Vec<String>,
    pub error_details: Option<String>,
    pub extracted_data: std::collections::HashMap<String, serde_json::Value>,
}

pub struct SmartScriptExecutor {
    pub device_id: String,
    pub adb_path: String,
}

impl SmartScriptExecutor {
    pub fn new(device_id: String) -> Self {
        let adb_path = crate::utils::adb_utils::get_adb_path();
        Self { device_id, adb_path }
    }

    pub async fn execute_single_step(&self, step: SmartScriptStep) -> Result<SingleStepTestResult> {
        let start_time = std::time::Instant::now();
        let timestamp = chrono::Utc::now().timestamp_millis();
        let mut logs = Vec::new();

        info!("开始单步测试: {}", step.name);
        logs.push(format!("开始执行步骤: {}", step.name));

        let result = match step.step_type {
            SmartActionType::Tap => self.test_tap(&step, &mut logs).await,
            SmartActionType::Wait => self.test_wait(&step, &mut logs).await,
            SmartActionType::Input => self.test_input(&step, &mut logs).await,
            SmartActionType::SmartTap => self.test_smart_tap(&step, &mut logs).await,
            SmartActionType::SmartFindElement => self.test_find_element(&step, &mut logs).await,
            SmartActionType::RecognizePage => self.test_recognize_page(&step, &mut logs).await,
            _ => {
                logs.push("模拟测试执行".to_string());
                Ok("测试完成".to_string())
            }
        };

        let duration = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(message) => {
                logs.push(format!("执行成功: {}", message));
                Ok(SingleStepTestResult {
                    success: true,
                    step_id: step.id,
                    step_name: step.name,
                    message,
                    duration_ms: duration,
                    timestamp,
                    page_state: None,
                    ui_elements: Vec::new(),
                    logs,
                    error_details: None,
                    extracted_data: HashMap::new(),
                })
            }
            Err(e) => {
                let error_msg = e.to_string();
                logs.push(format!("执行失败: {}", error_msg));
                Ok(SingleStepTestResult {
                    success: false,
                    step_id: step.id,
                    step_name: step.name,
                    message: "执行失败".to_string(),
                    duration_ms: duration,
                    timestamp,
                    page_state: None,
                    ui_elements: Vec::new(),
                    logs,
                    error_details: Some(error_msg),
                    extracted_data: HashMap::new(),
                })
            }
        }
    }

    async fn test_tap(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("通过ADB Shell会话执行点击测试".to_string());
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        let x = params["x"].as_i64().unwrap_or(0) as i32;
        let y = params["y"].as_i64().unwrap_or(0) as i32;
        
        logs.push(format!("点击坐标: ({}, {})", x, y));
        
        // 使用ADB Shell长连接会话执行命令
        let session = get_device_session(&self.device_id).await?;
        let command = format!("input tap {} {}", x, y);
        let output = session.execute_command(&command).await?;
        
        logs.push(format!("命令输出: {}", output));
        Ok("点击成功".to_string())
    }

    async fn test_wait(&self, _step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("执行等待测试".to_string());
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        Ok("等待完成".to_string())
    }

    async fn test_input(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("通过ADB Shell会话执行输入测试".to_string());
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        let text = params["text"].as_str().unwrap_or("");
        logs.push(format!("输入文本: {}", text));
        
        // 使用ADB Shell长连接会话执行命令
        let session = get_device_session(&self.device_id).await?;
        let command = format!("input text '{}'", text);
        let output = session.execute_command(&command).await?;
        
        logs.push(format!("命令输出: {}", output));
        Ok("输入成功".to_string())
    }

    async fn test_smart_tap(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("执行智能点击测试".to_string());
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        // 获取应用包名（如果是启动小红书）
        if let Some(package_name) = params.get("package_name").and_then(|v| v.as_str()) {
            logs.push(format!("启动应用: {}", package_name));
            
            let session = get_device_session(&self.device_id).await?;
            let command = format!("am start -n {}/com.xingin.xhs.activity.SplashActivity", package_name);
            let output = session.execute_command(&command).await?;
            
            logs.push(format!("启动命令输出: {}", output));
            
            // 等待应用启动
            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
            
            Ok("应用启动成功".to_string())
        } else {
            // 普通智能点击
            let x = params["x"].as_i64().unwrap_or(0) as i32;
            let y = params["y"].as_i64().unwrap_or(0) as i32;
            
            logs.push(format!("智能点击坐标: ({}, {})", x, y));
            
            let session = get_device_session(&self.device_id).await?;
            let command = format!("input tap {} {}", x, y);
            let output = session.execute_command(&command).await?;
            
            logs.push(format!("命令输出: {}", output));
            Ok("智能点击成功".to_string())
        }
    }

    async fn test_find_element(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("执行智能元素查找测试".to_string());
        
        let session = get_device_session(&self.device_id).await?;
        
        // 获取当前UI结构
        let ui_dump = session.execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml").await?;
        
        logs.push(format!("UI结构长度: {} 字符", ui_dump.len()));
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        if let Some(element_text) = params.get("element_text").and_then(|v| v.as_str()) {
            if ui_dump.contains(element_text) {
                logs.push(format!("找到目标元素: {}", element_text));
                Ok("元素查找成功".to_string())
            } else {
                logs.push(format!("未找到目标元素: {}", element_text));
                Err(anyhow::anyhow!("元素未找到"))
            }
        } else {
            Ok("元素查找测试完成".to_string())
        }
    }

    async fn test_recognize_page(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("执行页面识别测试".to_string());
        
        let session = get_device_session(&self.device_id).await?;
        
        // 获取当前Activity
        let current_activity = session.execute_command("dumpsys activity activities | grep mCurrentFocus").await?;
        logs.push(format!("当前Activity: {}", current_activity.trim()));
        
        // 获取UI结构进行页面识别
        let ui_dump = session.execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml").await?;
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        if let Some(expected_page) = params.get("expected_page").and_then(|v| v.as_str()) {
            if ui_dump.contains(expected_page) || current_activity.contains(expected_page) {
                logs.push(format!("成功识别页面: {}", expected_page));
                Ok("页面识别成功".to_string())
            } else {
                logs.push(format!("页面识别失败，期望: {}", expected_page));
                Ok("页面识别完成，但未匹配预期".to_string())
            }
        } else {
            Ok("页面识别测试完成".to_string())
        }
    }

    async fn execute_adb_command(&self, args: &[&str]) -> Result<std::process::Output> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        
        Ok(cmd.output()?)
    }
}

#[command]
pub async fn execute_single_step_test(
    device_id: String,
    step: SmartScriptStep,
) -> Result<SingleStepTestResult, String> {
    info!("收到单步测试请求: {}", step.name);
    
    let executor = SmartScriptExecutor::new(device_id);
    
    match executor.execute_single_step(step).await {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("单步测试失败: {}", e)),
    }
}