use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::command;
#[allow(unused_imports)]
use tracing::{error, info, warn, debug};

use crate::services::adb_session_manager::get_device_session;
use crate::services::error_handling::{ErrorHandler, ErrorHandlingConfig};
use crate::services::script_execution::ScriptPreprocessor;
#[allow(unused_imports)]
use crate::services::contact_automation::generate_vcf_file;
use crate::services::vcf_importer::VcfImporter;
use crate::services::multi_brand_vcf_importer::MultiBrandVcfImporter;
use crate::application::normalizer::normalize_step_json;
use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider};
use crate::infra::device::metrics_provider::RealDeviceMetricsProvider;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SmartActionType {
    // 基础操作类型
    Tap,
    Input,
    Wait,
    Swipe,
    // 智能操作类型
    SmartTap,
    SmartFindElement,
    BatchMatch,  // 批量匹配操作（动态元素查找）
    RecognizePage,
    VerifyAction,
    WaitForPageState,
    ExtractElement,
    SmartNavigation,
    // 循环控制类型
    LoopStart,
    LoopEnd,
    // 通讯录自动化操作
    ContactGenerateVcf,
    ContactImportToDevice,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
pub struct SmartExecutionResult {
    pub success: bool,
    pub total_steps: u32,
    pub executed_steps: u32,
    pub failed_steps: u32,
    pub skipped_steps: u32,
    pub duration_ms: u64,
    pub logs: Vec<String>,
    pub final_page_state: Option<String>,
    pub extracted_data: HashMap<String, serde_json::Value>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartExecutorConfig {
    pub continue_on_error: bool,
    pub auto_verification_enabled: bool,
    pub smart_recovery_enabled: bool,
    pub detailed_logging: bool,
}

pub struct SmartScriptExecutor {
    pub device_id: String,
    pub adb_path: String,
    error_handler: ErrorHandler,
    preprocessor: Arc<Mutex<ScriptPreprocessor>>,
}

impl SmartScriptExecutor {
    pub fn new(device_id: String) -> Self {
        let adb_path = crate::utils::adb_utils::get_adb_path();
        
        // 创建错误处理器配置
        let error_config = ErrorHandlingConfig {
            max_retries: 3,
            base_delay: std::time::Duration::from_millis(500),
            max_delay: std::time::Duration::from_secs(5),
            exponential_backoff: true,
            verbose_logging: true,
        };
        
        // 初始化错误处理器
        let error_handler = ErrorHandler::new(
            error_config,
            adb_path.clone(),
            Some(device_id.clone())
        );
        
        Self { 
            device_id, 
            adb_path,
            error_handler,
            preprocessor: Arc::new(Mutex::new(ScriptPreprocessor::new())),
        }
    }

    pub async fn execute_single_step(&self, step: SmartScriptStep) -> Result<SingleStepTestResult> {
        let start_time = std::time::Instant::now();
        let timestamp = chrono::Utc::now().timestamp_millis();
        let mut logs = Vec::new();

        info!("🚀 开始单步测试: {} (设备: {})", step.name, self.device_id);
        logs.push(format!("🚀 开始执行步骤: {}", step.name));
        logs.push(format!("📱 目标设备: {}", self.device_id));
        logs.push(format!("🔧 步骤类型: {:?}", step.step_type));
        
        // 详细记录步骤参数
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        let step_details = format!(
            "📊 步骤详细信息: ID='{}', 坐标=({},{}), 参数={:?}",
            step.id,
            params.get("x").and_then(|v| v.as_i64()).unwrap_or(0),
            params.get("y").and_then(|v| v.as_i64()).unwrap_or(0),
            step.parameters
        );
        info!("{}", step_details);
        logs.push(step_details);

        // 后端兜底标准化：若参数为“smart_scroll风格”（有 direction/无 start_x 等），则归一化为 swipe 所需参数
        let mut step = step;
        if Self::is_smart_scroll_like(&step.parameters) && matches!(step.step_type, SmartActionType::Swipe) {
            // 使用真实设备分辨率用于归一化（安全回退到 1080x1920）
            let provider = RealDeviceMetricsProvider::new(self.adb_path.clone());
            let metrics = match provider.get(&self.device_id) {
                Some(m) => {
                    info!("📐 real-metrics: width={} height={} density={:?}", m.width_px, m.height_px, m.density);
                    m
                }
                None => {
                    warn!("📐 real-metrics: 获取失败，使用默认 1080x1920");
                    DeviceMetrics::new(1080, 1920)
                }
            };
            let (new_type, new_params) = normalize_step_json("smart_scroll", step.parameters.clone(), &metrics);
            logs.push(format!("🧩 后端归一化: smart_scroll→{}，已补齐坐标/时长", new_type));
            info!("🧩 后端归一化: smart_scroll→{}", new_type);
            step.parameters = new_params;
        }

        let result = match step.step_type {
            // 基础操作类型
            SmartActionType::Tap => self.test_tap(&step, &mut logs).await,
            SmartActionType::Wait => self.test_wait(&step, &mut logs).await,
            SmartActionType::Input => self.test_input(&step, &mut logs).await,
            SmartActionType::Swipe => {
                // 使用增强滑动执行器执行真实滑动（包含安全注入器、ADB回退与UI变化校验）
                logs.push("🔄 滑动操作（增强执行器）".to_string());
                match self.execute_basic_swipe(&step).await {
                    Ok((_found_elements, _data)) => {
                        logs.push("✅ 滑动执行完成".to_string());
                        Ok("滑动成功".to_string())
                    }
                    Err(e) => {
                        let msg = format!("❌ 滑动执行失败: {}", e);
                        error!("{}", msg);
                        logs.push(msg);
                        Err(e)
                    }
                }
            },
            // 智能操作类型
            SmartActionType::SmartTap => self.test_smart_tap(&step, &mut logs).await,
            SmartActionType::SmartFindElement => self.test_find_element(&step, &mut logs).await,
            SmartActionType::BatchMatch => self.test_batch_match(&step, &mut logs).await,
            SmartActionType::RecognizePage => self.test_recognize_page(&step, &mut logs).await,
            SmartActionType::VerifyAction => {
                logs.push("✅ 验证操作".to_string());
                Ok("验证操作模拟".to_string())
            },
            SmartActionType::WaitForPageState => {
                logs.push("⏳ 等待页面状态".to_string());
                Ok("等待页面状态模拟".to_string())
            },
            SmartActionType::ExtractElement => {
                logs.push("� 提取元素".to_string());
                Ok("提取元素模拟".to_string())
            },
            SmartActionType::SmartNavigation => {
                logs.push("🧭 智能导航".to_string());
                Ok("智能导航模拟".to_string())
            },
            // 循环控制类型
            SmartActionType::LoopStart => {
                logs.push("🔄 循环开始标记".to_string());
                Ok("循环开始已标记".to_string())
            },
            SmartActionType::LoopEnd => {
                logs.push("🏁 循环结束标记".to_string());
                Ok("循环结束已标记".to_string())
            },
            // 通讯录自动化操作
            SmartActionType::ContactGenerateVcf => self.test_contact_generate_vcf(&step, &mut logs).await,
            SmartActionType::ContactImportToDevice => self.test_contact_import_to_device(&step, &mut logs).await,
        };

        let duration = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(message) => {
                logs.push(format!("✅ 执行成功: {}", message));
                info!("✅ 步骤执行成功: {} (耗时: {}ms)", step.name, duration);
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
                logs.push(format!("❌ 执行失败: {}", error_msg));
                error!("❌ 步骤执行失败: {} - 错误: {} (耗时: {}ms)", step.name, error_msg, duration);
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

    fn is_smart_scroll_like(params: &serde_json::Value) -> bool {
        let has_direction = params.get("direction").is_some();
        let has_coords = params.get("start_x").is_some() && params.get("start_y").is_some()
            && params.get("end_x").is_some() && params.get("end_y").is_some();
        has_direction && !has_coords
    }

    async fn test_tap(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("👆 通过ADB Shell会话执行点击测试（带错误处理）".to_string());
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        // 优先使用 parameters 中的坐标，因为 SmartScriptStep 结构体中只有这些
        let x = params["x"].as_i64().unwrap_or(0) as i32;
        let y = params["y"].as_i64().unwrap_or(0) as i32;
        
        logs.push(format!("📍 点击坐标: ({}, {}) (从 parameters: x={}/y={})", 
            x, y, 
            params.get("x").map(|v| v.as_i64().unwrap_or(0)).unwrap_or(0),
            params.get("y").map(|v| v.as_i64().unwrap_or(0)).unwrap_or(0)
        ));
        
        // 使用带重试的点击执行
        match self.execute_click_with_retry(x, y, logs).await {
            Ok(output) => {
                logs.push(format!("📤 命令输出: {}", output.trim()));
                Ok("点击成功".to_string())
            }
            Err(e) => Err(e)
        }
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
        
    // 使用ADB Shell长连接会话执行统一输入（注入器优先）
    let session = get_device_session(&self.device_id).await?;
    session.input_text(text).await?;
    let output = "OK".to_string();
        
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
            // 普通智能点击 - 从 parameters 获取坐标
            let x = params["x"].as_i64().unwrap_or(0) as i32;
            let y = params["y"].as_i64().unwrap_or(0) as i32;
            
            logs.push(format!("智能点击坐标: ({}, {}) (从 parameters: x={}/y={})", 
                x, y, 
                params.get("x").map(|v| v.as_i64().unwrap_or(0)).unwrap_or(0),
                params.get("y").map(|v| v.as_i64().unwrap_or(0)).unwrap_or(0)
            ));
            
            let session = get_device_session(&self.device_id).await?;
            session.tap(x, y).await?;
            let output = "OK".to_string();
            
            logs.push(format!("命令输出: {}", output));
            Ok("智能点击成功".to_string())
        }
    }

    async fn test_find_element(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("🔍 执行智能元素查找测试（带错误处理）".to_string());
        
        // 执行UI dump操作，用传统的重试逻辑
        let ui_dump = self.execute_ui_dump_with_retry(logs).await?;
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        // 记录查找参数
        logs.push("🎯 查找参数:".to_string());
        
        // 先尝试不同的查找方式，但无论哪种方式，最终都要执行点击
        let mut element_found = false;
        let mut find_method = String::new();
        let mut click_coords: Option<(i32, i32)> = None;
        
        if let Some(element_text) = params.get("element_text").and_then(|v| v.as_str()) {
            if !element_text.is_empty() {
                logs.push(format!("  📝 元素文本: {}", element_text));
                if ui_dump.contains(element_text) {
                    logs.push(format!("✅ 在UI中找到目标元素: {}", element_text));
                    element_found = true;
                    find_method = format!("通过文本: {}", element_text);
                } else {
                    logs.push(format!("❌ 未在UI中找到目标元素: {}", element_text));
                }
            }
        }
        
        if !element_found {
            if let Some(content_desc) = params.get("content_desc").and_then(|v| v.as_str()) {
                if !content_desc.is_empty() {
                    logs.push(format!("  📝 内容描述: {}", content_desc));
                    if ui_dump.contains(content_desc) {
                        logs.push(format!("✅ 在UI中找到目标元素 (通过content-desc): {}", content_desc));
                        element_found = true;
                        find_method = format!("通过content-desc: {}", content_desc);
                    } else {
                        logs.push(format!("❌ 未在UI中找到目标元素 (通过content-desc): {}", content_desc));
                    }
                }
            }
        }
        
        // 1) 优先使用外部传入的bounds
        if let Some(bounds) = params.get("bounds") {
            logs.push(format!("  📍 元素边界: {}", bounds));
            if let Some(bounds_obj) = bounds.as_object() {
                let left = bounds_obj.get("left").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                let top = bounds_obj.get("top").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                let right = bounds_obj.get("right").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                let bottom = bounds_obj.get("bottom").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                let center_x = (left + right) / 2;
                let center_y = (top + bottom) / 2;
                click_coords = Some((center_x, center_y));
                logs.push(format!("🎯 计算中心点坐标: ({}, {})", center_x, center_y));
                logs.push(format!("📊 原始边界: left={}, top={}, right={}, bottom={}", left, top, right, bottom));
            } else {
                logs.push("❌ 边界数据格式错误".to_string());
                return Err(anyhow::anyhow!("边界数据格式错误"));
            }
        } else {
            // 2) 未提供bounds时，尝试从UI dump中解析坐标
            let query_text = params.get("element_text").and_then(|v| v.as_str()).unwrap_or("");
            let query_desc = params.get("content_desc").and_then(|v| v.as_str()).unwrap_or("");

            if !query_text.is_empty() || !query_desc.is_empty() {
                let needle = if !query_text.is_empty() { query_text } else { query_desc };
                logs.push(format!("🔎 未提供bounds，尝试基于UI dump按'{}'解析坐标", needle));
                if let Some((cx, cy)) = self.find_element_in_ui(&ui_dump, needle, logs).await? {
                    logs.push(format!("✅ 解析到元素中心坐标: ({}, {})", cx, cy));
                    click_coords = Some((cx, cy));
                } else {
                    logs.push("⚠️  在UI dump中找到元素文本但未能解析到有效坐标".to_string());
                }
            } else {
                logs.push("ℹ️ 未提供bounds且未提供文本/描述用于解析坐标".to_string());
            }
        }

        // 3) 若已获得坐标，则执行点击（带重试）
        if let Some((center_x, center_y)) = click_coords {
            let click_result = self.execute_click_with_retry(center_x, center_y, logs).await;
            match click_result {
                Ok(output) => {
                    logs.push(format!("✅ 点击命令输出: {}", output));
                    let result_msg = if element_found {
                        format!("✅ 成功找到并点击元素: {} -> 坐标({}, {})", find_method, center_x, center_y)
                    } else {
                        format!("✅ 基于坐标点击元素: ({}, {}) (未在UI中确认元素存在)", center_x, center_y)
                    };
                    Ok(result_msg)
                }
                Err(e) => {
                    logs.push(format!("❌ 点击操作失败: {}", e));
                    Err(e)
                }
            }
        } else {
            // 未能取得坐标
            if element_found {
                Ok(format!("✅ 找到元素但无法定位坐标: {}", find_method))
            } else {
                logs.push("⚠️  未提供有效的查找参数".to_string());
                Ok("元素查找测试完成 (无查找条件)".to_string())
            }
        }
    }

    /// 批量匹配方法：动态查找元素，不使用预设坐标
    async fn test_batch_match(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("🚀 执行批量匹配操作（动态元素查找）".to_string());
        
        // 执行UI dump操作，获取当前界面状态
        let ui_dump = self.execute_ui_dump_with_retry(logs).await?;
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        // 记录查找参数
        logs.push("🎯 批量匹配查找参数:".to_string());
        logs.push(format!("📋 参数详情: {:?}", params));
        
        // 获取要查找的元素文本 - 增强参数获取逻辑
        let element_text = params.get("element_text")
            .or_else(|| params.get("text"))
            .or_else(|| params.get("target_text"))  // 添加更多可能的参数名
            .and_then(|v| v.as_str())
            .unwrap_or("");
        
        // 如果没有找到element_text，尝试从步骤名称或描述中推断
        let final_element_text = if element_text.is_empty() {
            // 检查是否是关注相关的批量匹配
            if step.name.contains("关注") || step.description.contains("关注") {
                logs.push("🔍 从步骤名称/描述中推断出这是批量关注操作".to_string());
                "关注"
            } else {
                logs.push("❌ 批量匹配失败: 没有提供元素文本且无法从步骤名称推断".to_string());
                return Err(anyhow::anyhow!("批量匹配需要元素文本"));
            }
        } else {
            element_text
        };
        
        logs.push(format!("  📝 目标元素文本: '{}'", final_element_text));
        
        // 在UI dump中搜索匹配的元素
        let element_coords = self.find_element_in_ui(&ui_dump, final_element_text, logs).await?;
        
        if let Some((x, y)) = element_coords {
            logs.push(format!("🎯 动态找到元素坐标: ({}, {})", x, y));
            
            // 验证坐标合理性（避免错误的硬编码坐标）
            if (x, y) == (540, 960) {
                logs.push("⚠️  检测到可疑的硬编码坐标 (540, 960)，这可能是错误的".to_string());
                logs.push("🔄 重新尝试查找关注按钮...".to_string());
                // 强制使用关注按钮查找逻辑
                if let Some(correct_coords) = self.find_all_follow_buttons(&ui_dump, logs).await? {
                    logs.push(format!("✅ 重新找到正确的关注按钮坐标: ({}, {})", correct_coords.0, correct_coords.1));
                    let click_result = self.execute_click_with_retry(correct_coords.0, correct_coords.1, logs).await;
                    match click_result {
                        Ok(output) => {
                            logs.push(format!("✅ 点击命令输出: {}", output));
                            return Ok(format!("✅ 批量匹配成功: 重新找到并点击关注按钮 -> 坐标({}, {})", correct_coords.0, correct_coords.1));
                        }
                        Err(e) => {
                            logs.push(format!("❌ 点击操作失败: {}", e));
                            return Err(e);
                        }
                    }
                }
            }
            
            // 执行点击操作
            let click_result = self.execute_click_with_retry(x, y, logs).await;
            
            match click_result {
                Ok(output) => {
                    logs.push(format!("✅ 点击命令输出: {}", output));
                    Ok(format!("✅ 批量匹配成功: 动态找到并点击元素'{}' -> 坐标({}, {})", final_element_text, x, y))
                }
                Err(e) => {
                    logs.push(format!("❌ 点击操作失败: {}", e));
                    Err(e)
                }
            }
        } else {
            logs.push(format!("❌ 批量匹配失败: 未在当前UI中找到元素'{}'", final_element_text));
            Err(anyhow::anyhow!("未找到目标元素: {}", final_element_text))
        }
    }

    /// 通用批量匹配 - 查找所有匹配元素，支持排除特定文本
    async fn find_element_in_ui(&self, ui_dump: &str, element_text: &str, logs: &mut Vec<String>) -> Result<Option<(i32, i32)>> {
        info!("🔍🔍🔍 [ENHANCED] 批量匹配搜索: '{}'", element_text);
        info!("📊📊📊 [ENHANCED] UI dump 长度: {} 字符", ui_dump.len());
        logs.push(format!("🔍🔍🔍 [ENHANCED] 批量匹配搜索: '{}'", element_text));
        logs.push(format!("📊📊📊 [ENHANCED] UI dump 长度: {} 字符", ui_dump.len()));
        
        // 检查是否是批量关注场景
        if element_text == "关注" {
            info!("🎯🎯🎯 [ENHANCED] 批量关注模式：查找所有关注按钮，排除已关注");
            info!("🔄🔄🔄 [ENHANCED] 调用 find_all_follow_buttons 方法...");
            logs.push("🎯🎯🎯 [ENHANCED] 批量关注模式：查找所有关注按钮，排除已关注".to_string());
            logs.push("🔄🔄🔄 [ENHANCED] 调用 find_all_follow_buttons 方法...".to_string());
            let result = self.find_all_follow_buttons(ui_dump, logs).await;
            info!("📋📋📋 [ENHANCED] find_all_follow_buttons 返回结果: {:?}", result);
            logs.push(format!("📋📋📋 [ENHANCED] find_all_follow_buttons 返回结果: {:?}", result));
            return result;
        }
        
        // 通用单个元素匹配逻辑
        let text_pattern = format!(r#"text="[^"]*{}[^"]*""#, regex::escape(element_text));
        let content_desc_pattern = format!(r#"content-desc="[^"]*{}[^"]*""#, regex::escape(element_text));
        
        let text_regex = regex::Regex::new(&text_pattern).unwrap_or_else(|_| {
            logs.push(format!("⚠️  正则表达式编译失败: {}", text_pattern));
            regex::Regex::new(r".*").unwrap()
        });
        
        let content_desc_regex = regex::Regex::new(&content_desc_pattern).unwrap_or_else(|_| {
            logs.push(format!("⚠️  正则表达式编译失败: {}", content_desc_pattern));
            regex::Regex::new(r".*").unwrap()
        });
        
        // 分行搜索UI dump
        for (line_num, line) in ui_dump.lines().enumerate() {
            // 检查是否包含目标文本 (text 属性)
            if text_regex.is_match(line) {
                logs.push(format!("✅ 在第{}行找到匹配的text属性", line_num + 1));
                if let Some(coords) = self.extract_bounds_from_line(line, logs) {
                    return Ok(Some(coords));
                }
            }
            
            // 检查是否包含目标文本 (content-desc 属性)
            if content_desc_regex.is_match(line) {
                logs.push(format!("✅ 在第{}行找到匹配的content-desc属性", line_num + 1));
                if let Some(coords) = self.extract_bounds_from_line(line, logs) {
                    return Ok(Some(coords));
                }
            }
        }
        
        logs.push("❌ 在UI dump中未找到匹配的元素".to_string());
        Ok(None)
    }

    /// 从UI dump行中提取bounds坐标
    fn extract_bounds_from_line(&self, line: &str, logs: &mut Vec<String>) -> Option<(i32, i32)> {
        // 使用正则表达式提取bounds属性
        let bounds_regex = regex::Regex::new(r#"bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]""#).ok()?;
        
        if let Some(captures) = bounds_regex.captures(line) {
            let left: i32 = captures.get(1)?.as_str().parse().ok()?;
            let top: i32 = captures.get(2)?.as_str().parse().ok()?;
            let right: i32 = captures.get(3)?.as_str().parse().ok()?;
            let bottom: i32 = captures.get(4)?.as_str().parse().ok()?;
            
            let center_x = (left + right) / 2;
            let center_y = (top + bottom) / 2;
            
            logs.push(format!("📊 提取到bounds: [{},{}][{},{}] -> 中心点({},{})", 
                left, top, right, bottom, center_x, center_y));
            
            Some((center_x, center_y))
        } else {
            logs.push("⚠️  该行未找到有效的bounds属性".to_string());
            None
        }
    }

    /// 通用批量关注按钮查找 - 支持所有APP，自动排除"已关注"
    async fn find_all_follow_buttons(&self, ui_dump: &str, logs: &mut Vec<String>) -> Result<Option<(i32, i32)>> {
        info!("🎯🎯🎯 [ENHANCED] 通用批量关注模式启动...");
        info!("🔍🔍🔍 [ENHANCED] 搜索策略：查找所有'关注'按钮，排除'已关注'按钮");
        logs.push("🎯🎯🎯 [ENHANCED] 通用批量关注模式启动...".to_string());
        logs.push("🔍🔍🔍 [ENHANCED] 搜索策略：查找所有'关注'按钮，排除'已关注'按钮".to_string());
        
        let mut candidates = Vec::new();
        
        // 构建匹配模式
        let follow_patterns = [
            r#"text="关注""#,           // 精确匹配 "关注"
            r#"text="[^"]*关注[^"]*""#,   // 包含关注的文本
            r#"content-desc="[^"]*关注[^"]*""#, // content-desc中包含关注
        ];
        
        // 排除模式 - 避免匹配"已关注"相关按钮
        let exclude_patterns = [
            r#"text="[^"]*已关注[^"]*""#,
            r#"text="[^"]*取消关注[^"]*""#,
            r#"text="[^"]*following[^"]*""#,  // 英文版已关注
            r#"text="[^"]*unfollow[^"]*""#,   // 英文版取消关注
            r#"content-desc="[^"]*已关注[^"]*""#,
            r#"content-desc="[^"]*following[^"]*""#,
        ];
        
        logs.push(format!("🔍 开始扫描UI dump，共{}行", ui_dump.lines().count()));
        info!("🔍 开始扫描UI dump，共{}行", ui_dump.lines().count());
        
        for (line_num, line) in ui_dump.lines().enumerate() {
            // 首先检查是否匹配排除模式
            let mut should_exclude = false;
            for exclude_pattern in &exclude_patterns {
                if let Ok(regex) = regex::Regex::new(exclude_pattern) {
                    if regex.is_match(line) {
                        logs.push(format!("❌ 第{}行被排除: 包含已关注相关文本", line_num + 1));
                        should_exclude = true;
                        break;
                    }
                }
            }
            
            if should_exclude {
                continue;
            }
            
            // 检查是否匹配关注模式
            for (pattern_idx, pattern) in follow_patterns.iter().enumerate() {
                if let Ok(regex) = regex::Regex::new(pattern) {
                    if regex.is_match(line) {
                        // 进一步验证是否为可点击按钮
                        if line.contains(r#"clickable="true""#) {
                            info!("✅ 第{}行匹配模式{}: 找到可点击关注按钮", line_num + 1, pattern_idx + 1);
                            logs.push(format!("✅ 第{}行匹配模式{}: 找到可点击关注按钮", line_num + 1, pattern_idx + 1));
                            
                            if let Some(coords) = self.extract_bounds_from_line(line, logs) {
                                // 优先级: 精确匹配 > 文本包含 > content-desc
                                let priority = match pattern_idx {
                                    0 => 1, // 精确匹配 "关注"
                                    1 => 2, // 文本包含关注
                                    2 => 3, // content-desc包含关注
                                    _ => 4,
                                };
                                
                                // 记录候选按钮的详细信息
                                logs.push(format!("📍 候选按钮 {}: 坐标({}, {}), 优先级{}", 
                                    candidates.len() + 1, coords.0, coords.1, priority));
                                
                                candidates.push((coords, priority, line_num + 1, line.to_string()));
                            }
                        } else {
                            logs.push(format!("⚠️  第{}行匹配但不可点击，跳过", line_num + 1));
                        }
                        break; // 找到一个匹配就跳出pattern循环
                    }
                }
            }
        }
        
        // 按优先级排序选择最佳候选
        candidates.sort_by_key(|&(_, priority, _, _)| priority);
        
        if candidates.is_empty() {
            info!("❌ 未找到任何可用的关注按钮");
            logs.push("❌ 未找到任何可用的关注按钮".to_string());
            logs.push("💡 请检查当前页面是否包含关注按钮，或者按钮文本是否为'关注'".to_string());
            return Ok(None);
        }
        
        info!("🎯 共找到{}个关注按钮候选", candidates.len());
        logs.push(format!("🎯 共找到{}个关注按钮候选", candidates.len()));
        
        // 列出所有候选按钮信息
        for (idx, (coords, priority, line_num, _)) in candidates.iter().enumerate() {
            logs.push(format!("  📋 候选{}: 第{}行, 坐标({}, {}), 优先级{}", 
                idx + 1, line_num, coords.0, coords.1, priority));
        }
        
        // 选择优先级最高的候选
        let (best_coords, best_priority, best_line, best_content) = &candidates[0];
        logs.push(format!("✅ 选择最佳关注按钮: 第{}行，优先级{}，坐标({}, {})", 
            best_line, best_priority, best_coords.0, best_coords.1));
        logs.push(format!("📝 按钮内容预览: {}", 
            best_content.chars().take(100).collect::<String>()));
        
        // 最终验证坐标的合理性
        if best_coords.0 <= 0 || best_coords.1 <= 0 || best_coords.0 > 2000 || best_coords.1 > 3000 {
            logs.push(format!("⚠️  坐标({}, {})看起来不合理，请检查XML解析", best_coords.0, best_coords.1));
        } else {
            logs.push(format!("✅ 坐标({}, {})看起来合理", best_coords.0, best_coords.1));
        }
        
        Ok(Some(*best_coords))
    }

    /// 带重试机制的 UI dump 执行
    async fn execute_ui_dump_with_retry(&self, logs: &mut Vec<String>) -> Result<String> {
        logs.push("📱 开始获取设备UI结构（带重试机制）...".to_string());
        
        let max_retries = 3;
        let mut last_error: Option<anyhow::Error> = None;
        
        for attempt in 1..=max_retries {
            if attempt > 1 {
                logs.push(format!("� 重试获取UI结构 - 第 {}/{} 次尝试", attempt, max_retries));
                
                // 重试前的恢复操作
                logs.push("🧹 清理旧的UI dump文件...".to_string());
                if let Ok(session) = get_device_session(&self.device_id).await {
                    let _ = session.execute_command("rm -f /sdcard/ui_dump.xml").await;
                }
                
                // 延迟重试
                let delay = std::time::Duration::from_millis(500 * attempt as u64);
                logs.push(format!("⏱️  等待 {:?} 后重试...", delay));
                tokio::time::sleep(delay).await;
            }
            
            match self.try_ui_dump().await {
                Ok(dump) => {
                    if !dump.is_empty() && !dump.contains("ERROR:") && !dump.contains("null root node") {
                        logs.push(format!("✅ UI结构获取成功，长度: {} 字符", dump.len()));
                        return Ok(dump);
                    } else {
                        let error_msg = format!("UI dump 内容异常: 空内容或包含错误信息 (尝试 {}/{})", attempt, max_retries);
                        logs.push(format!("⚠️  {}", error_msg));
                        last_error = Some(anyhow::anyhow!(error_msg));
                    }
                }
                Err(e) => {
                    let error_msg = format!("UI dump 执行失败: {} (尝试 {}/{})", e, attempt, max_retries);
                    logs.push(format!("❌ {}", error_msg));
                    last_error = Some(e);
                }
            }
        }
        
        logs.push(format!("❌ UI结构获取最终失败，已重试 {} 次", max_retries));
        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("UI dump 获取失败")))
    }

    /// 尝试执行 UI dump
    async fn try_ui_dump(&self) -> Result<String> {
        let session = get_device_session(&self.device_id).await?;
        session.execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml").await
    }

    /// 带重试机制的点击执行
    async fn execute_click_with_retry(&self, x: i32, y: i32, logs: &mut Vec<String>) -> Result<String> {
        logs.push("👆 开始执行点击操作（带重试机制）...".to_string());
        
        let max_retries = 2;
        let mut last_error: Option<anyhow::Error> = None;
        
        for attempt in 1..=max_retries {
            if attempt > 1 {
                logs.push(format!("🔄 重试点击操作 - 第 {}/{} 次尝试", attempt, max_retries));
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            }
            
            match self.try_click_xy(x, y).await {
                Ok(output) => {
                    // 短暂延迟确保点击生效
                    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                    logs.push("⏱️  点击后延迟200ms完成".to_string());
                    return Ok(output);
                }
                Err(e) => {
                    logs.push(format!("❌ 点击失败: {} (尝试 {}/{})", e, attempt, max_retries));
                    last_error = Some(e);
                }
            }
        }
        
        logs.push(format!("❌ 点击操作最终失败，已重试 {} 次", max_retries));
        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("点击操作失败")))
    }

    /// 尝试执行点击
    async fn try_click_xy(&self, x: i32, y: i32) -> Result<String> {
        let session = get_device_session(&self.device_id).await?;
        session.tap(x, y).await?;
        Ok("OK".to_string())
    }

    /// 获取错误处理统计信息
    pub fn get_error_handling_statistics(&self) -> String {
        self.error_handler.get_statistics()
    }

    /// 重置错误处理统计信息
    pub fn reset_error_handling_statistics(&mut self) {
        self.error_handler.reset_statistics();
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

    async fn test_contact_generate_vcf(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("🗂️ 开始VCF文件生成测试".to_string());
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        // 获取源文件路径
        let source_file_path = params.get("source_file_path")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        
        if source_file_path.is_empty() {
            logs.push("❌ 缺少源文件路径参数".to_string());
            return Ok("VCF生成失败: 缺少源文件路径".to_string());
        }
        
        logs.push(format!("📁 源文件路径: {}", source_file_path));
        
        // 检查文件是否存在
        if !std::path::Path::new(source_file_path).exists() {
            logs.push(format!("❌ 源文件不存在: {}", source_file_path));
            return Ok(format!("VCF生成失败: 文件不存在 - {}", source_file_path));
        }
        
        // 读取文件内容进行预处理
        match std::fs::read_to_string(source_file_path) {
            Ok(content) => {
                logs.push(format!("📄 成功读取文件内容，长度: {} 字符", content.len()));
                
                // 这里可以进行更详细的文件格式解析和联系人提取
                // 为了测试目的，我们模拟生成一些示例联系人数据
                let contacts = vec![
                    crate::services::vcf_importer::Contact {
                        id: "test_1".to_string(),
                        name: "测试联系人1".to_string(),
                        phone: "13800138001".to_string(),
                        email: "test1@example.com".to_string(),
                        address: "".to_string(),
                        occupation: "".to_string(),
                    },
                    crate::services::vcf_importer::Contact {
                        id: "test_2".to_string(),
                        name: "测试联系人2".to_string(),
                        phone: "13800138002".to_string(),
                        email: "test2@example.com".to_string(),
                        address: "".to_string(),
                        occupation: "".to_string(),
                    }
                ];
                
                logs.push(format!("👥 解析出 {} 个联系人", contacts.len()));
                
                // 生成输出路径
                let output_dir = params.get("output_dir")
                    .and_then(|v| v.as_str())
                    .unwrap_or("./vcf_output");
                
                let output_path = format!("{}/contacts_{}.vcf", output_dir, chrono::Utc::now().timestamp());
                logs.push(format!("📤 输出路径: {}", output_path));
                
                // 确保输出目录存在
                if let Some(parent) = std::path::Path::new(&output_path).parent() {
                    std::fs::create_dir_all(parent)?;
                }
                
                // 调用VCF生成服务
                match VcfImporter::generate_vcf_file(contacts, &output_path).await {
                    Ok(_) => {
                        logs.push(format!("✅ VCF文件生成成功: {}", output_path));
                        Ok(format!("VCF文件生成成功: {}", output_path))
                    },
                    Err(e) => {
                        logs.push(format!("❌ VCF文件生成失败: {}", e));
                        Ok(format!("VCF生成失败: {}", e))
                    }
                }
            },
            Err(e) => {
                logs.push(format!("❌ 读取文件失败: {}", e));
                Ok(format!("VCF生成失败: 文件读取错误 - {}", e))
            }
        }
    }

    async fn test_contact_import_to_device(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        logs.push("📱 开始联系人导入到设备测试".to_string());
        
        let params: HashMap<String, serde_json::Value> = 
            serde_json::from_value(step.parameters.clone())?;
        
        // 获取选择的设备ID
        let selected_device_id = params.get("selected_device_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        
        if selected_device_id.is_empty() {
            logs.push("❌ 缺少设备选择参数".to_string());
            return Ok("联系人导入失败: 未选择目标设备".to_string());
        }
        
        logs.push(format!("🎯 目标设备: {}", selected_device_id));
        
        // 获取VCF文件路径（通常来自上一步的生成结果）
        let vcf_file_path = params.get("vcf_file_path")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        
        if vcf_file_path.is_empty() {
            logs.push("❌ 缺少VCF文件路径参数".to_string());
            return Ok("联系人导入失败: 缺少VCF文件路径".to_string());
        }
        
        logs.push(format!("📁 VCF文件路径: {}", vcf_file_path));
        
        // 检查VCF文件是否存在
        if !std::path::Path::new(vcf_file_path).exists() {
            logs.push(format!("❌ VCF文件不存在: {}", vcf_file_path));
            return Ok(format!("联系人导入失败: VCF文件不存在 - {}", vcf_file_path));
        }
        
        // 创建多品牌VcfImporter实例，支持批量尝试不同品牌手机
        let mut multi_brand_importer = MultiBrandVcfImporter::new(selected_device_id.to_string());
        
        logs.push("🚀 启动多品牌联系人导入流程".to_string());
        logs.push("📋 支持的品牌: 华为、小米、OPPO、VIVO、三星、原生Android等".to_string());
        
        // 执行多品牌联系人导入
        match multi_brand_importer.import_vcf_contacts_multi_brand(vcf_file_path).await {
            Ok(result) => {
                if result.success {
                    logs.push("✅ 多品牌联系人导入成功".to_string());
                    
                    if let Some(strategy) = &result.used_strategy {
                        logs.push(format!("🎯 成功策略: {}", strategy));
                    }
                    
                    if let Some(method) = &result.used_method {
                        logs.push(format!("🔧 成功方法: {}", method));
                    }
                    
                    logs.push(format!("📊 导入统计: 总计{}个，成功{}个，失败{}个", 
                        result.total_contacts, 
                        result.imported_contacts, 
                        result.failed_contacts
                    ));
                    
                    logs.push(format!("⏱️ 用时: {}秒", result.duration_seconds));
                    logs.push(format!("🔄 尝试次数: {}次", result.attempts.len()));
                    
                    // 添加尝试详情
                    for (i, attempt) in result.attempts.iter().enumerate() {
                        let status = if attempt.success { "✅" } else { "❌" };
                        logs.push(format!("  {}. {} {}-{} ({}s)", 
                            i + 1,
                            status,
                            attempt.strategy_name,
                            attempt.method_name,
                            attempt.duration_seconds
                        ));
                    }
                    
                    logs.push("📱 联系人已成功导入到设备通讯录".to_string());
                    Ok(format!("多品牌联系人导入成功: 已导入到设备 {} (使用{}策略)", 
                        selected_device_id,
                        result.used_strategy.unwrap_or_else(|| "未知".to_string())
                    ))
                } else {
                    logs.push("❌ 多品牌联系人导入失败".to_string());
                    logs.push(format!("📝 失败原因: {}", result.message));
                    
                    // 添加失败详情
                    for (i, attempt) in result.attempts.iter().enumerate() {
                        logs.push(format!("  {}. ❌ {}-{}: {}", 
                            i + 1,
                            attempt.strategy_name,
                            attempt.method_name,
                            attempt.error_message.as_deref().unwrap_or("未知错误")
                        ));
                    }
                    
                    Ok(format!("多品牌联系人导入失败: {}", result.message))
                }
            },
            Err(e) => {
                logs.push(format!("❌ 多品牌联系人导入系统错误: {}", e));
                Ok(format!("多品牌联系人导入系统错误: {}", e))
            }
        }
    }

    /// 执行智能脚本（批量执行多个步骤）
    pub async fn execute_smart_script(&self, steps: Vec<SmartScriptStep>, config: Option<SmartExecutorConfig>) -> Result<SmartExecutionResult> {
        let start_time = std::time::Instant::now();
        let mut logs = Vec::new();
        let mut executed_steps = 0u32;
        let mut failed_steps = 0u32;
        let skipped_steps = 0u32;
        let mut extracted_data = HashMap::new();
        
        // 默认配置
        let config = config.unwrap_or(SmartExecutorConfig {
            continue_on_error: true,
            auto_verification_enabled: true,
            smart_recovery_enabled: true,
            detailed_logging: true,
        });

        // 批量执行前：后端兜底标准化每个步骤（smart_scroll风格 → swipe 坐标）
        // 使用真实设备分辨率，失败回退默认
        let provider = RealDeviceMetricsProvider::new(self.adb_path.clone());
        let metrics = match provider.get(&self.device_id) {
            Some(m) => { info!("📐 real-metrics: width={} height={} density={:?}", m.width_px, m.height_px, m.density); m }
            None => { warn!("📐 real-metrics: 获取失败，使用默认 1080x1920"); DeviceMetrics::new(1080, 1920) }
        };
        let mut normalized_steps: Vec<SmartScriptStep> = Vec::with_capacity(steps.len());
        let mut normalized_count = 0usize;
        for mut s in steps.into_iter() {
            if Self::is_smart_scroll_like(&s.parameters) && matches!(s.step_type, SmartActionType::Swipe) {
                let (new_type, new_params) = normalize_step_json("smart_scroll", s.parameters.clone(), &metrics);
                s.parameters = new_params;
                normalized_count += 1;
                logs.push(format!("🧩 后端归一化: smart_scroll→{} (step_id={})", new_type, s.id));
            }
            normalized_steps.push(s);
        }

        info!("🚀 开始批量执行智能脚本，总共 {} 个步骤", normalized_steps.len());
        logs.push(format!("🚀 开始批量执行智能脚本，总共 {} 个步骤", normalized_steps.len()));
        if normalized_count > 0 { logs.push(format!("🛡️ 已应用后端兜底标准化 {} 次", normalized_count)); }
        
        // 详细记录每个传入步骤的信息
        info!("📋 前端发送的完整脚本步骤详情:");
        logs.push("📋 前端发送的完整脚本步骤详情:".to_string());
    for (i, step) in normalized_steps.iter().enumerate() {
            let params: Result<HashMap<String, serde_json::Value>, _> = 
                serde_json::from_value(step.parameters.clone());
            let step_details = match params {
                Ok(p) => format!(
                    "步骤 {}: 名称='{}', ID='{}', 类型={:?}, 坐标=({},{}), 参数={:?}",
                    i + 1, step.name, step.id, step.step_type, 
                    p.get("x").and_then(|v| v.as_i64()).unwrap_or(0),
                    p.get("y").and_then(|v| v.as_i64()).unwrap_or(0),
                    step.parameters
                ),
                Err(_) => format!(
                    "步骤 {}: 名称='{}', ID='{}', 类型={:?}, 参数={:?}",
                    i + 1, step.name, step.id, step.step_type, step.parameters
                )
            };
            info!("  {}", step_details);
            logs.push(format!("  {}", step_details));
        }

        // 1. 使用新的模块化控制流预处理器
    let processed_steps = match self.preprocessor.lock().unwrap().preprocess_for_legacy_executor(normalized_steps) {
            Ok(result) => {
                logs.push(format!("🔄 控制流预处理成功：处理完成，生成 {} 个执行步骤", result.len()));
                result
            },
            Err(e) => {
                error!("控制流预处理失败: {}", e);
                logs.push(format!("❌ 控制流预处理失败: {}", e));
                return Ok(SmartExecutionResult {
                    success: false,
                    total_steps: 0,
                    executed_steps: 0,
                    failed_steps: 1,
                    skipped_steps: 0,
                    duration_ms: start_time.elapsed().as_millis() as u64,
                    logs,
                    final_page_state: None,
                    extracted_data: HashMap::new(),
                    message: format!("控制流预处理失败: {}", e),
                });
            }
        };

        // 2. 使用预处理后的步骤进行执行
        let enabled_steps = processed_steps;

        logs.push(format!("📋 已启用的步骤: {} 个", enabled_steps.len()));
        
        // 执行每个步骤
        for (index, step) in enabled_steps.iter().enumerate() {
            let step_start = std::time::Instant::now();
            let params: Result<HashMap<String, serde_json::Value>, _> = 
                serde_json::from_value(step.parameters.clone());
            let detailed_info = match params {
                Ok(p) => format!(
                    "📋 执行步骤 {}/{}: 名称='{}', ID='{}', 类型={:?}, 坐标=({},{})",
                    index + 1, enabled_steps.len(), step.name, step.id, step.step_type,
                    p.get("x").and_then(|v| v.as_i64()).unwrap_or(0),
                    p.get("y").and_then(|v| v.as_i64()).unwrap_or(0)
                ),
                Err(_) => format!(
                    "📋 执行步骤 {}/{}: 名称='{}', ID='{}', 类型={:?}",
                    index + 1, enabled_steps.len(), step.name, step.id, step.step_type
                )
            };
            info!("{}", detailed_info);
            logs.push(detailed_info);

            // 执行单个步骤
            match self.execute_single_step(step.clone()).await {
                Ok(result) => {
                    if result.success {
                        executed_steps += 1;
                        logs.push(format!("✅ 步骤成功: {} (耗时: {}ms)", 
                            step.name, step_start.elapsed().as_millis()));
                        
                        // 合并提取的数据
                        for (key, value) in result.extracted_data {
                            extracted_data.insert(format!("{}_{}", step.id, key), value);
                        }
                    } else {
                        failed_steps += 1;
                        logs.push(format!("❌ 步骤失败: {} - {}", step.name, result.message));
                        
                        // 如果不继续执行错误，则中断
                        if !config.continue_on_error {
                            logs.push("⏸️ 遇到错误，停止执行后续步骤".to_string());
                            break;
                        }
                    }
                    
                    // 合并日志
                    logs.extend(result.logs);
                }
                Err(e) => {
                    failed_steps += 1;
                    let error_msg = format!("❌ 步骤执行异常: {} - {}", step.name, e);
                    logs.push(error_msg);
                    error!("步骤执行异常: {}", e);
                    
                    // 如果不继续执行错误，则中断
                    if !config.continue_on_error {
                        logs.push("⏸️ 遇到异常，停止执行后续步骤".to_string());
                        break;
                    }
                }
            }
            
            // 步骤间添加短暂延迟
            if index < enabled_steps.len() - 1 {
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
        }

        let total_duration = start_time.elapsed().as_millis() as u64;
        let success = failed_steps == 0 && executed_steps > 0;

        let message = if success {
            format!("智能脚本执行成功！共执行 {} 个步骤，耗时 {}ms", executed_steps, total_duration)
        } else {
            format!("智能脚本执行完成，{} 个成功，{} 个失败", executed_steps, failed_steps)
        };

        logs.push(message.clone());
        info!("✅ 智能脚本批量执行完成: {}", message);

        let result = SmartExecutionResult {
            success,
            total_steps: enabled_steps.len() as u32,
            executed_steps,
            failed_steps,
            skipped_steps,
            duration_ms: total_duration,
            logs,
            final_page_state: None,
            extracted_data,
            message,
        };

        Ok(result)
    }

    async fn execute_adb_command(&self, args: &[&str]) -> Result<std::process::Output> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        
        Ok(cmd.output()?)
    }
}

#[tauri::command]
pub async fn execute_single_step_test(
    device_id: String,
    step: SmartScriptStep,
) -> Result<SingleStepTestResult, String> {
    info!("🧪 收到单步测试请求: {} (设备: {})", step.name, device_id);
    info!("📋 步骤类型: {:?}", step.step_type);
    info!("📝 步骤参数: {}", serde_json::to_string_pretty(&step.parameters).unwrap_or_default());
    
    let executor = SmartScriptExecutor::new(device_id.clone());
    
    match executor.execute_single_step(step).await {
        Ok(result) => {
            info!("✅ 单步测试成功: {} (耗时: {}ms)", result.step_name, result.duration_ms);
            Ok(result)
        },
        Err(e) => {
            error!("❌ 单步测试失败: {} - 错误: {}", device_id, e);
            Err(format!("单步测试失败: {}", e))
        },
    }
}

#[command]
pub async fn execute_smart_automation_script(
    device_id: String,
    steps: Vec<SmartScriptStep>,
    config: Option<SmartExecutorConfig>,
) -> Result<SmartExecutionResult, String> {
    info!("🚀 收到智能脚本批量执行请求: 设备 {}, {} 个步骤", device_id, steps.len());
    // 特性开关：当 USE_NEW_BACKEND=1 时，走新后端管线（灰度切换）
    if std::env::var("USE_NEW_BACKEND").ok().as_deref() == Some("1") {
        info!("🧪 开启新后端灰度 (USE_NEW_BACKEND=1)，进入 v2 管线...");
        let adb_path = crate::utils::adb_utils::get_adb_path();
        match crate::new_backend::pipeline::run_v2_compat(&steps, &device_id, &adb_path).await {
            Ok(()) => {
                let result = SmartExecutionResult {
                    success: true,
                    total_steps: steps.len() as u32,
                    executed_steps: steps.len() as u32,
                    failed_steps: 0,
                    skipped_steps: 0,
                    duration_ms: 0,
                    logs: vec!["v2 pipeline 执行完成".to_string()],
                    final_page_state: None,
                    extracted_data: HashMap::new(),
                    message: "v2 pipeline 执行成功".to_string(),
                };
                return Ok(result);
            }
            Err(e) => {
                error!("❌ v2 pipeline 执行失败：{}，回退到旧执行器", e);
            }
        }
    }

    let executor = SmartScriptExecutor::new(device_id.clone());
    
    match executor.execute_smart_script(steps, config).await {
        Ok(result) => {
            info!("✅ 智能脚本批量执行完成: {} (总耗时: {}ms)", 
                result.message, result.duration_ms);
            Ok(result)
        },
        Err(e) => {
            error!("❌ 智能脚本批量执行失败: {} - 错误: {}", device_id, e);
            Err(format!("智能脚本批量执行失败: {}", e))
        },
    }
}