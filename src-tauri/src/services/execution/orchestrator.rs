use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use anyhow::Result;
use tracing::{error, info, warn};

use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider};
use crate::application::normalizer::normalize_step_json;
use crate::infra::device::metrics_provider::RealDeviceMetricsProvider;
use crate::services::execution::model::{
    SmartActionType, SmartExecutionResult, SmartExecutorConfig, SmartScriptStep,
};
use crate::services::script_execution::ScriptPreprocessor;
use crate::services::smart_script_executor::SmartScriptExecutor;
use serde_json;

pub struct SmartScriptOrchestrator<'a> {
    executor: &'a SmartScriptExecutor,
    preprocessor: Arc<Mutex<ScriptPreprocessor>>,
}

impl<'a> SmartScriptOrchestrator<'a> {
    pub fn new(
        executor: &'a SmartScriptExecutor,
        preprocessor: Arc<Mutex<ScriptPreprocessor>>,
    ) -> Self {
        Self {
            executor,
            preprocessor,
        }
    }

    pub async fn execute(
        &self,
        steps: Vec<SmartScriptStep>,
        config: Option<SmartExecutorConfig>,
    ) -> Result<SmartExecutionResult> {
        let start_time = std::time::Instant::now();
        let mut logs = Vec::new();
        let mut executed_steps = 0u32;
        let mut failed_steps = 0u32;
        let skipped_steps = 0u32;
        let mut extracted_data = HashMap::new();

        let device_id = self.executor.device_id();
        let adb_path = self.executor.adb_path();

        let config = config.unwrap_or(SmartExecutorConfig {
            continue_on_error: true,
            auto_verification_enabled: true,
            smart_recovery_enabled: true,
            detailed_logging: true,
        });

        let provider = RealDeviceMetricsProvider::new(adb_path.to_string());
        let metrics = match provider.get(device_id) {
            Some(m) => {
                info!(
                    "📐 real-metrics: width={} height={} density={:?}",
                    m.width_px,
                    m.height_px,
                    m.density
                );
                m
            }
            None => {
                warn!("📐 real-metrics: 获取失败，使用默认 1080x1920");
                DeviceMetrics::new(1080, 1920)
            }
        };

        let mut normalized_steps: Vec<SmartScriptStep> = Vec::with_capacity(steps.len());
        let mut normalized_count = 0usize;
        for mut s in steps.into_iter() {
            if SmartScriptExecutor::is_smart_scroll_like(&s.parameters)
                && matches!(s.step_type, SmartActionType::Swipe)
            {
                let (new_type, new_params) =
                    normalize_step_json("smart_scroll", s.parameters.clone(), &metrics);
                s.parameters = new_params;
                normalized_count += 1;
                logs.push(format!("🧩 后端归一化: smart_scroll→{} (step_id={})", new_type, s.id));
            }
            normalized_steps.push(s);
        }

        info!("🚀 开始批量执行智能脚本，总共 {} 个步骤", normalized_steps.len());
        logs.push(format!(
            "🚀 开始批量执行智能脚本，总共 {} 个步骤",
            normalized_steps.len()
        ));
        if normalized_count > 0 {
            logs.push(format!("🛡️ 已应用后端兜底标准化 {} 次", normalized_count));
        }

        info!("📋 前端发送的完整脚本步骤详情:");
        logs.push("📋 前端发送的完整脚本步骤详情:".to_string());
        for (i, step) in normalized_steps.iter().enumerate() {
            let params = serde_json::from_value::<HashMap<String, serde_json::Value>>(step.parameters.clone());
            let detail = match params {
                Ok(p) => format!(
                    "步骤 {}: 名称='{}', ID='{}', 类型={:?}, 坐标=({},{}), 参数={:?}",
                    i + 1,
                    step.name,
                    step.id,
                    step.step_type,
                    p.get("x").and_then(|v| v.as_i64()).unwrap_or(0),
                    p.get("y").and_then(|v| v.as_i64()).unwrap_or(0),
                    step.parameters
                ),
                Err(_) => format!(
                    "步骤 {}: 名称='{}', ID='{}', 类型={:?}, 参数={:?}",
                    i + 1,
                    step.name,
                    step.id,
                    step.step_type,
                    step.parameters
                ),
            };
            info!("  {}", detail);
            logs.push(format!("  {}", detail));
        }

        let processed_steps = match self
            .preprocessor
            .lock()
            .expect("preprocessor poisoned")
            .preprocess_for_legacy_executor(normalized_steps)
        {
            Ok(result) => {
                logs.push(format!("🔄 控制流预处理成功：处理完成，生成 {} 个执行步骤", result.len()));
                result
            }
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

        logs.push(format!("📋 已启用的步骤: {} 个", processed_steps.len()));

        for (index, step) in processed_steps.iter().enumerate() {
            let step_start = std::time::Instant::now();
            let params = serde_json::from_value::<HashMap<String, serde_json::Value>>(step.parameters.clone());
            let detailed_info = match params {
                Ok(p) => format!(
                    "📋 执行步骤 {}/{}: 名称='{}', ID='{}', 类型={:?}, 坐标=({},{})",
                    index + 1,
                    processed_steps.len(),
                    step.name,
                    step.id,
                    step.step_type,
                    p.get("x").and_then(|v| v.as_i64()).unwrap_or(0),
                    p.get("y").and_then(|v| v.as_i64()).unwrap_or(0)
                ),
                Err(_) => format!(
                    "📋 执行步骤 {}/{}: 名称='{}', ID='{}', 类型={:?}",
                    index + 1,
                    processed_steps.len(),
                    step.name,
                    step.id,
                    step.step_type
                ),
            };
            info!("{}", detailed_info);
            logs.push(detailed_info);

            match self.executor.execute_single_step(step.clone()).await {
                Ok(result) => {
                    if result.success {
                        executed_steps += 1;
                        logs.push(format!(
                            "✅ 步骤成功: {} (耗时: {}ms)",
                            step.name,
                            step_start.elapsed().as_millis()
                        ));

                        for (key, value) in result.extracted_data {
                            extracted_data.insert(format!("{}_{}", step.id, key), value);
                        }
                    } else {
                        failed_steps += 1;
                        logs.push(format!(
                            "❌ 步骤失败: {} - {}",
                            step.name, result.message
                        ));

                        if !config.continue_on_error {
                            logs.push("⏸️ 遇到错误，停止执行后续步骤".to_string());
                            break;
                        }
                    }
                    logs.extend(result.logs);
                }
                Err(e) => {
                    failed_steps += 1;
                    let error_msg = format!("❌ 步骤执行异常: {} - {}", step.name, e);
                    logs.push(error_msg);
                    error!("步骤执行异常: {}", e);

                    if !config.continue_on_error {
                        logs.push("⏸️ 遇到异常，停止执行后续步骤".to_string());
                        break;
                    }
                }
            }

            if index < processed_steps.len() - 1 {
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
        }

        let total_duration = start_time.elapsed().as_millis() as u64;
        let success = failed_steps == 0 && executed_steps > 0;

        let message = if success {
            format!(
                "智能脚本执行成功！共执行 {} 个步骤，耗时 {}ms",
                executed_steps, total_duration
            )
        } else {
            format!(
                "智能脚本执行完成，{} 个成功，{} 个失败",
                executed_steps, failed_steps
            )
        };

        logs.push(message.clone());
        info!("✅ 智能脚本批量执行完成: {}", message);

        Ok(SmartExecutionResult {
            success,
            total_steps: processed_steps.len() as u32,
            executed_steps,
            failed_steps,
            skipped_steps,
            duration_ms: total_duration,
            logs,
            final_page_state: None,
            extracted_data,
            message,
        })
    }
}
