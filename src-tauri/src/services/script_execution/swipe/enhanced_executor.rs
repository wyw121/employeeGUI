use anyhow::Result;
use std::time::{Duration, Instant};
use tracing::{info, warn, error};

use crate::infra::adb::safe_input_injector::SafeInputInjector;
use crate::infra::adb::input_injector::{AdbShellInputInjector, InputInjector};
use super::validator::{SwipeValidator, ValidatedSwipeParams, SwipeDirection};
use super::diagnostics::{SwipeDiagnostics, SwipeExpectedChange, SwipeValidationResult};

/// 增强的滑动执行器
/// 
/// 提供完整的滑动操作增强功能：
/// - 参数验证和优化
/// - 执行前后诊断
/// - 多重执行策略
/// - 结果验证
pub struct EnhancedSwipeExecutor {
    pub device_id: String,
    pub adb_path: String,
    pub validator: SwipeValidator,
    pub diagnostics: SwipeDiagnostics,
}

impl EnhancedSwipeExecutor {
    pub fn new(device_id: String, adb_path: String, screen_width: u32, screen_height: u32) -> Self {
        let validator = SwipeValidator::new(device_id.clone(), screen_width, screen_height);
        let diagnostics = SwipeDiagnostics::new(device_id.clone(), adb_path.clone());
        
        Self {
            device_id,
            adb_path,
            validator,
            diagnostics,
        }
    }

    /// 增强的滑动执行
    pub async fn execute_enhanced_swipe(&self, params: &serde_json::Value) -> Result<SwipeExecutionResult> {
        let execution_start = Instant::now();
        
        info!("🚀 开始增强滑动执行: 设备={}", self.device_id);
        
        // 1. 参数验证
        let validated_params = self.validator.validate_swipe_params(params)?;
        info!("📋 滑动参数: {} 距离={}px", validated_params.direction, validated_params.distance);
        
        // 2. 执行前诊断
        let pre_state = self.diagnostics.pre_swipe_diagnostics().await?;
        if !pre_state.device_connected {
            return Err(anyhow::anyhow!("设备未连接"));
        }
        if !pre_state.screen_interactive {
            warn!("⚠️ 屏幕可能未激活，滑动效果可能受影响");
        }
        
        // 3. 执行滑动操作
        let swipe_result = self.execute_swipe_with_fallback(&validated_params).await?;
        
        // 4. 执行后验证
        let expected_change = self.infer_expected_change(&validated_params);
        let validation_result = self.diagnostics
            .post_swipe_validation(&pre_state, expected_change).await?;
        
        let total_duration = execution_start.elapsed();
        
        let result = SwipeExecutionResult {
            success: swipe_result.success,
            validated_params: validated_params.clone(),
            execution_method: swipe_result.method,
            validation: validation_result,
            total_duration,
            detailed_log: swipe_result.log,
        };
        
        if result.success && result.validation.ui_changed {
            info!("✅ 滑动执行成功并验证有效 (总耗时: {}ms)", total_duration.as_millis());
        } else if result.success && !result.validation.ui_changed {
            warn!("⚠️ 滑动命令成功但UI无变化 (总耗时: {}ms) - 可能滑动无效", total_duration.as_millis());
        } else {
            error!("❌ 滑动执行失败 (总耗时: {}ms)", total_duration.as_millis());
        }
        
        Ok(result)
    }

    /// 带回退的滑动执行
    async fn execute_swipe_with_fallback(&self, params: &ValidatedSwipeParams) -> Result<SwipeInternalResult> {
        let swipe_start = Instant::now();
        
        // 策略1: 使用安全注入器
        info!("🪄 尝试策略1: 安全注入器");
        let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(self.adb_path.clone()));
        
        match injector.swipe(
            &self.device_id,
            params.start_x,
            params.start_y,
            params.end_x,
            params.end_y,
            params.duration
        ).await {
            Ok(()) => {
                let duration = swipe_start.elapsed();
                info!("✅ 安全注入器执行成功 (耗时: {}ms)", duration.as_millis());
                return Ok(SwipeInternalResult {
                    success: true,
                    method: SwipeExecutionMethod::SafeInjector,
                    duration,
                    log: vec![format!("安全注入器执行成功 ({}ms)", duration.as_millis())],
                });
            }
            Err(e) => {
                warn!("⚠️ 安全注入器失败: {}", e);
            }
        }

        // 策略2: 直接ADB命令
        info!("🔧 尝试策略2: 直接ADB命令");
        match self.execute_direct_adb_swipe(params).await {
            Ok(duration) => {
                info!("✅ 直接ADB命令执行成功 (耗时: {}ms)", duration.as_millis());
                return Ok(SwipeInternalResult {
                    success: true,
                    method: SwipeExecutionMethod::DirectAdb,
                    duration,
                    log: vec![
                        "安全注入器失败".to_string(),
                        format!("直接ADB命令执行成功 ({}ms)", duration.as_millis())
                    ],
                });
            }
            Err(e) => {
                error!("❌ 直接ADB命令也失败: {}", e);
            }
        }

        // 策略3: 重试机制
        info!("🔄 尝试策略3: 重试执行");
        for attempt in 1..=3 {
            info!("🔄 重试第{}次", attempt);
            tokio::time::sleep(Duration::from_millis(200)).await;
            
            if let Ok(duration) = self.execute_direct_adb_swipe(params).await {
                info!("✅ 重试第{}次成功 (耗时: {}ms)", attempt, duration.as_millis());
                return Ok(SwipeInternalResult {
                    success: true,
                    method: SwipeExecutionMethod::Retry(attempt),
                    duration,
                    log: vec![
                        "安全注入器失败".to_string(),
                        "直接ADB命令失败".to_string(),
                        format!("重试第{}次成功 ({}ms)", attempt, duration.as_millis()),
                    ],
                });
            }
        }

        Err(anyhow::anyhow!("所有滑动策略都失败"))
    }

    /// 执行直接ADB滑动命令
    async fn execute_direct_adb_swipe(&self, params: &ValidatedSwipeParams) -> Result<Duration> {
        let start = Instant::now();
        
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.args(&[
            "-s", &self.device_id,
            "shell", "input", "swipe",
            &params.start_x.to_string(),
            &params.start_y.to_string(),
            &params.end_x.to_string(),
            &params.end_y.to_string(),
            &params.duration.to_string()
        ]);

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }

        let output = tokio::task::spawn_blocking(move || cmd.output()).await??;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("ADB滑动命令失败: {}", error_msg));
        }

        Ok(start.elapsed())
    }

    /// 推断预期变化
    fn infer_expected_change(&self, params: &ValidatedSwipeParams) -> SwipeExpectedChange {
        match params.direction {
            SwipeDirection::Up | SwipeDirection::Down => SwipeExpectedChange::ScrollDown,
            SwipeDirection::Left | SwipeDirection::Right => SwipeExpectedChange::PageTransition,
        }
    }
}

/// 滑动执行结果
#[derive(Debug)]
pub struct SwipeExecutionResult {
    pub success: bool,
    pub validated_params: ValidatedSwipeParams,
    pub execution_method: SwipeExecutionMethod,
    pub validation: SwipeValidationResult,
    pub total_duration: Duration,
    pub detailed_log: Vec<String>,
}

/// 内部滑动结果
#[derive(Debug)]
struct SwipeInternalResult {
    pub success: bool,
    pub method: SwipeExecutionMethod,
    pub duration: Duration,
    pub log: Vec<String>,
}

/// 滑动执行方法
#[derive(Debug)]
pub enum SwipeExecutionMethod {
    SafeInjector,
    DirectAdb,
    Retry(u32),
}

impl std::fmt::Display for SwipeExecutionMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SwipeExecutionMethod::SafeInjector => write!(f, "安全注入器"),
            SwipeExecutionMethod::DirectAdb => write!(f, "直接ADB命令"),
            SwipeExecutionMethod::Retry(n) => write!(f, "重试第{}次", n),
        }
    }
}