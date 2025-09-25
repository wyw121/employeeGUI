use anyhow::Result;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::command;
#[allow(unused_imports)]
use tracing::{error, info, warn, debug};

// ExecutionEnvironment 相关导入（重试 + 快照 + 注册表 + 匹配桥接）
use crate::services::execution::{
    ExecutionEnvironment,
    ExponentialBackoffPolicy,
    RetryConfig,
    RealSnapshotProvider,
    register_execution_environment,
    run_unified_match,
    LegacyUiActions,
};
use crate::services::execution::matching::{find_all_follow_buttons, find_element_in_ui};
use crate::services::execution::model::{
    SmartActionType,
    SmartExecutorConfig,
    SmartExecutionResult,
    SmartScriptStep,
    SingleStepTestResult,
};
use crate::services::contact::{run_generate_vcf_step, run_import_contacts_step};

use crate::services::adb_session_manager::get_device_session;
use crate::services::error_handling::{ErrorHandler, ErrorHandlingConfig};
use crate::services::script_execution::ScriptPreprocessor;
use crate::application::normalizer::normalize_step_json;
use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider};
use crate::infra::device::metrics_provider::RealDeviceMetricsProvider;
// (已在顶部统一导入)  // 新执行环境聚合 + 重试策略 + 快照提供器 + 注册表

#[cfg(windows)]
use std::os::windows::process::CommandExt;

pub struct SmartScriptExecutor {
    pub device_id: String,
    pub adb_path: String,
    error_handler: ErrorHandler,
    preprocessor: Arc<Mutex<ScriptPreprocessor>>,
    /// 新的执行环境（重试/快照/上下文）。迁移期可选，后续完全替换内部散落逻辑。
    exec_env: Arc<ExecutionEnvironment>,
}

impl SmartScriptExecutor {
    /// 统一获取 UI 快照（XML + 可选截图）。
    /// 当前实现：委托给 ExecutionEnvironment.snapshot_provider。
    /// TODO: 后续在这里加入缓存 / 失败重试 / 指标记录 等扩展。
    async fn capture_ui_snapshot(&self) -> anyhow::Result<Option<String>> {
        let snapshot = self.exec_env.capture_snapshot().await?;
        Ok(snapshot.raw_xml)
    }
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
        
        // 构建可配置重试策略（支持环境变量）
        let retry_cfg = RetryConfig::from_env();
        let retry_policy = ExponentialBackoffPolicy::new(retry_cfg.clone());

        // 注入真实快照提供器（后续可扩展截图等）
        let snapshot_provider = RealSnapshotProvider::default();

        let exec_env = Arc::new(
            ExecutionEnvironment::new(device_id.clone())
                .with_retry_policy(retry_policy)
                .with_snapshot_provider(snapshot_provider)
        );

        // 注册到全局执行环境注册表（弱引用存储）
        register_execution_environment(&device_id, &exec_env);

        Self {
            device_id: device_id.clone(),
            adb_path,
            error_handler,
            preprocessor: Arc::new(Mutex::new(ScriptPreprocessor::new())),
            exec_env,
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
            SmartActionType::SmartFindElement => self.test_find_element_unified(&step, &mut logs).await,
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
            SmartActionType::ContactGenerateVcf => run_generate_vcf_step(&step, &mut logs).await,
            SmartActionType::ContactImportToDevice => run_import_contacts_step(&step, &mut logs).await,
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

    /// 🆕 统一元素查找方法：委托给新的匹配模块。
    async fn test_find_element_unified(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        run_unified_match(self, &self.device_id, step, logs).await
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
    let element_coords = find_element_in_ui(&ui_dump, final_element_text, logs).await?;
        
        if let Some((x, y)) = element_coords {
            logs.push(format!("🎯 动态找到元素坐标: ({}, {})", x, y));
            
            // 验证坐标合理性（避免错误的硬编码坐标）
            if (x, y) == (540, 960) {
                logs.push("⚠️  检测到可疑的硬编码坐标 (540, 960)，这可能是错误的".to_string());
                logs.push("🔄 重新尝试查找关注按钮...".to_string());
                // 强制使用关注按钮查找逻辑
                if let Some(correct_coords) = find_all_follow_buttons(&ui_dump, logs).await? {
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

    /// 带重试机制的 UI dump 执行
    async fn execute_ui_dump_with_retry(&self, logs: &mut Vec<String>) -> Result<String> {
        logs.push("📱 开始获取设备UI结构（优先使用快照提供器）...".to_string());
        // 首先尝试快照渠道（单次，不自带复杂重试；失败再回退旧逻辑）
        match self.capture_ui_snapshot().await {
            Ok(Some(xml)) if !xml.is_empty() => {
                logs.push(format!("✅ 快照获取成功（snapshot_provider），长度: {} 字符", xml.len()));
                return Ok(xml);
            }
            Ok(Some(_)) | Ok(None) => {
                logs.push("⚠️ 快照结果为空或无XML，回退旧 UI dump 逻辑".to_string());
            }
            Err(e) => {
                logs.push(format!("⚠️ 快照捕获失败: {}，回退旧 UI dump 逻辑", e));
            }
        }

        // 回退：沿用原来的重试包装
        let device_id_cloned = self.device_id.clone();
        let result = self.exec_env.run_with_retry(move |attempt| {
            let device_id = device_id_cloned.clone();
            async move {
                if attempt > 0 {
                    if let Ok(session) = get_device_session(&device_id).await { let _ = session.execute_command("rm -f /sdcard/ui_dump.xml").await; }
                }
                let dump = get_device_session(&device_id).await?.execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml").await?;
                if dump.is_empty() || dump.contains("ERROR:") || dump.contains("null root node") { Err(anyhow::anyhow!("UI dump 内容异常")) } else { Ok(dump) }
            }
        }).await;
        match result { Ok(d) => { logs.push(format!("✅ UI结构获取成功（回退路径），长度: {} 字符", d.len())); Ok(d) }, Err(e) => { logs.push(format!("❌ UI结构获取失败: {}", e)); Err(e) } }
    }

    /// 尝试执行 UI dump
    async fn try_ui_dump(&self) -> Result<String> {
        if let Ok(Some(xml)) = self.capture_ui_snapshot().await { if !xml.is_empty() { return Ok(xml); } }
        let session = get_device_session(&self.device_id).await?; // 回退
        session.execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml").await
    }

    /// LegacyUiActions trait 会通过 async_trait 生成 dyn Future，因此保持签名稳定。

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
        let ui_dump = match self.capture_ui_snapshot().await { Ok(Some(xml)) if !xml.is_empty() => xml, _ => {
            session.execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml").await?
        } };
        
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

// LegacyUiActions trait implementation for backward compatibility
#[async_trait]
impl LegacyUiActions for SmartScriptExecutor {
    async fn execute_click_with_retry(
        &self,
        x: i32,
        y: i32,
        logs: &mut Vec<String>,
    ) -> Result<String> {
        SmartScriptExecutor::execute_click_with_retry(self, x, y, logs).await
    }

    async fn execute_ui_dump_with_retry(&self, logs: &mut Vec<String>) -> Result<String> {
        SmartScriptExecutor::execute_ui_dump_with_retry(self, logs).await
    }
}