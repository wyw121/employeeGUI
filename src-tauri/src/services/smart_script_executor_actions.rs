// smart_script_executor_actions.rs - 智能脚本执行器的具体操作实现（精简版：仅保留增强滑动路径）
use anyhow::Result;
use tracing::{error, info, warn};

use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider};
use crate::infra::adb::input_injector::{AdbShellInputInjector, InputInjector};
use crate::infra::adb::safe_input_injector::SafeInputInjector;
use crate::infra::device::metrics_provider::RealDeviceMetricsProvider;
use crate::services::script_execution::swipe::EnhancedSwipeExecutor;
use crate::services::execution::model::SmartScriptStep;
use crate::services::smart_script_executor::SmartScriptExecutor;

impl SmartScriptExecutor {
    /// 执行基础滑动（增强执行器）
    pub async fn execute_basic_swipe(
        &self,
        step: &SmartScriptStep,
    ) -> Result<(Vec<serde_json::Value>, Option<serde_json::Value>)> {
        info!("🚀 执行增强滑动: {}", step.name);
        
        // 获取设备屏幕尺寸（带缓存，失败回退 1080x1920）
        let metrics_provider = RealDeviceMetricsProvider::new(self.adb_path.clone());
        let metrics: DeviceMetrics = metrics_provider.get(&self.device_id).unwrap_or_else(|| {
            warn!("⚠️ 无法获取设备屏幕尺寸，使用默认值 1080x1920");
            DeviceMetrics::new(1080, 1920)
        });
        info!("📱 设备屏幕信息: {}x{} 密度={:?}", metrics.width_px, metrics.height_px, metrics.density);
        
        // 创建增强滑动执行器
        let enhanced_executor = EnhancedSwipeExecutor::new(
            self.device_id.clone(),
            self.adb_path.clone(),
            metrics.width_px,
            metrics.height_px,
        );
        
        // 执行增强滑动
        match enhanced_executor.execute_enhanced_swipe(&step.parameters).await {
            Ok(result) => {
                info!("✅ 增强滑动执行完成: 方法={} UI变化={} 总耗时={}ms", 
                      result.execution_method, 
                      result.validation.ui_changed,
                      result.total_duration.as_millis());
                      
                if !result.validation.ui_changed {
                    warn!("⚠️ 滑动操作可能未生效 - UI未发生变化");
                }
                
                // 将详细日志记录到控制台
                for log_entry in &result.detailed_log {
                    info!("📋 滑动日志: {}", log_entry);
                }
            }
            Err(e) => {
                error!("❌ 增强滑动执行失败: {}", e);
                // 回退到原始方法
                warn!("🔄 回退到原始滑动方法");
                return self.execute_legacy_swipe(step).await;
            }
        }
        Ok((vec![], None))
    }

    /// 原始滑动方法(作为回退)
    async fn execute_legacy_swipe(
        &self,
        step: &SmartScriptStep,
    ) -> Result<(Vec<serde_json::Value>, Option<serde_json::Value>)> {
        use anyhow::Context;
        let params = &step.parameters;
        let start_x = params["start_x"].as_i64().context("缺少start_x")? as i32;
        let start_y = params["start_y"].as_i64().context("缺少start_y")? as i32;
        let end_x = params["end_x"].as_i64().context("缺少end_x")? as i32;
        let end_y = params["end_y"].as_i64().context("缺少end_y")? as i32;
        let duration = params.get("duration").and_then(|v| v.as_u64()).unwrap_or(1000);

        info!(
            "👋 原始滑动回退: ({}, {}) -> ({}, {}), 时长: {}ms",
            start_x, start_y, end_x, end_y, duration
        );

        let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(self.adb_path.clone()));
        match injector
            .swipe(
                &self.device_id,
                start_x as u32,
                start_y as u32,
                end_x as u32,
                end_y as u32,
                duration as u32,
            )
            .await
        {
            Ok(()) => {
                info!("✅ 原始注入器执行成功");
            }
            Err(e) => {
                warn!("⚠️ 注入器失败，使用直接ADB命令: {}", e);
                self.adb_swipe(start_x, start_y, end_x, end_y, duration).await?;
            }
        }

        Ok((vec![], None))
    }

    /// ADB滑动（fallback 用）
    async fn adb_swipe(
        &self,
        start_x: i32,
        start_y: i32,
        end_x: i32,
        end_y: i32,
        duration: u64,
    ) -> Result<()> {
        use crate::utils::adb_utils::execute_adb_command as exec_adb;
        let output = exec_adb(&[
            "-s",
            &self.device_id,
            "shell",
            "input",
            "swipe",
            &start_x.to_string(),
            &start_y.to_string(),
            &end_x.to_string(),
            &end_y.to_string(),
            &duration.to_string(),
        ])?;
        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!(format!("滑动命令执行失败: {}", error_msg));
        }
        Ok(())
    }
}