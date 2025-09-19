/// ADB和UI自动化错误处理模块
/// 提供综合的错误分类、重试策略和恢复机制

pub mod error_classifier;
pub mod retry_manager;  
pub mod recovery_strategies;

pub use error_classifier::*;
pub use retry_manager::*;
pub use recovery_strategies::*;

use anyhow::Result;
use std::time::Duration;
use tracing::{warn, info, error, debug};

/// 错误处理配置
#[derive(Debug, Clone)]
pub struct ErrorHandlingConfig {
    /// 最大重试次数
    pub max_retries: usize,
    /// 基础重试延迟
    pub base_delay: Duration,
    /// 最大延迟时间
    pub max_delay: Duration,
    /// 是否启用指数退避
    pub exponential_backoff: bool,
    /// 是否启用详细日志
    pub verbose_logging: bool,
}

impl Default for ErrorHandlingConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            base_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(5),
            exponential_backoff: true,
            verbose_logging: true,
        }
    }
}

/// 错误处理管理器 - 统一的错误处理入口点
pub struct ErrorHandler {
    config: ErrorHandlingConfig,
    classifier: ErrorClassifier,
    retry_manager: RetryManager,
    recovery: RecoveryStrategies,
}

impl ErrorHandler {
    pub fn new(config: ErrorHandlingConfig, adb_path: String, device_id: Option<String>) -> Self {
        Self {
            classifier: ErrorClassifier::new(),
            retry_manager: RetryManager::new(config.clone()),
            recovery: RecoveryStrategies::new(adb_path, device_id),
            config,
        }
    }

    /// 处理错误的主入口方法
    pub async fn handle_error<F, T, E>(
        &mut self,
        operation_name: &str,
        error: &E,
        mut retry_fn: F,
    ) -> Result<T>
    where
        F: FnMut() -> Result<T, E> + Send,
        E: std::fmt::Display + std::fmt::Debug + Send + 'static,
        T: Send + 'static,
    {
        let error_message = error.to_string();
        
        // 1. 分类错误
        let error_type = self.classifier.classify_error(&error_message);
        
        if self.config.verbose_logging {
            warn!("🚨 检测到错误: {} - 类型: {:?}", operation_name, error_type);
        }

        // 2. 检查是否应该重试
        if !self.should_retry(&error_type) {
            error!("❌ 错误不可重试: {} - {}", operation_name, error);
            return Err(anyhow::anyhow!("不可重试的错误: {}", error));
        }

        // 3. 先尝试恢复策略
        if self.config.verbose_logging {
            info!("🔧 尝试恢复策略...");
        }
        
        match self.recovery.execute_recovery(&error_type, &error_message).await {
            Ok(RecoveryResult::Success(msg)) => {
                info!("✅ 恢复成功: {}", msg);
            }
            Ok(RecoveryResult::PartialRecovery(msg)) => {
                warn!("⚠️  部分恢复: {}", msg);
            }
            Ok(RecoveryResult::Failed(msg)) => {
                warn!("❌ 恢复失败: {}", msg);
            }
            Ok(RecoveryResult::NotApplicable) => {
                debug!("🚫 无可用恢复策略");
            }
            Err(e) => {
                warn!("💥 恢复过程出错: {}", e);
            }
        }

        // 4. 执行带重试的操作
        let result = self.retry_manager.execute_with_retry(
            operation_name,
            retry_fn,
        ).await;

        match &result {
            Ok(_) => {
                if self.config.verbose_logging {
                    info!("✅ 错误处理和重试成功: {}", operation_name);
                }
            }
            Err(e) => {
                error!("❌ 错误处理失败: {} - 最终错误: {}", operation_name, e);
            }
        }

        result
    }

    /// 判断错误是否应该重试
    fn should_retry(&self, error_type: &ErrorType) -> bool {
        match error_type {
            // 可重试的错误类型
            ErrorType::UiDumpFailed 
            | ErrorType::TemporaryConnectionLoss
            | ErrorType::DeviceBusy
            | ErrorType::ServiceTemporarilyUnavailable
            | ErrorType::AdbCommandFailed => true,
            
            // 不可重试的错误类型
            ErrorType::DeviceNotFound
            | ErrorType::PermissionDenied  
            | ErrorType::InvalidCommand
            | ErrorType::ElementNotFound => false,
            
            // 未知错误谨慎处理，允许少量重试
            ErrorType::Unknown => true,
        }
    }
}

/// 为常见的ADB操作提供便捷的错误处理方法
impl ErrorHandler {
    /// 处理UI dump操作的错误
    pub async fn handle_ui_dump_error<F>(&mut self, mut retry_fn: F) -> Result<String>
    where
        F: FnMut() -> Result<String, anyhow::Error> + Send,
    {
        self.handle_error("UI_DUMP", &anyhow::anyhow!("UI dump操作"), retry_fn).await
    }

    /// 处理ADB命令执行错误
    pub async fn handle_adb_command_error<F>(&mut self, command: &str, mut retry_fn: F) -> Result<String>
    where
        F: FnMut() -> Result<String, anyhow::Error> + Send,
    {
        let operation_name = format!("ADB_COMMAND: {}", command);
        self.handle_error(&operation_name, &anyhow::anyhow!("ADB命令执行"), retry_fn).await
    }

    /// 处理设备连接错误
    pub async fn handle_device_connection_error<F>(&mut self, device_id: &str, mut retry_fn: F) -> Result<()>
    where
        F: FnMut() -> Result<(), anyhow::Error> + Send,
    {
        let operation_name = format!("DEVICE_CONNECTION: {}", device_id);
        self.handle_error(&operation_name, &anyhow::anyhow!("设备连接"), retry_fn).await
    }

    /// 获取错误处理统计信息
    pub fn get_statistics(&self) -> String {
        let retry_stats = self.retry_manager.get_statistics();
        let classifier_stats = self.classifier.get_statistics();
        
        format!(
            "错误处理统计:\n{}\n\n错误分类统计:\n{}",
            retry_stats.generate_report(),
            classifier_stats.generate_report()
        )
    }

    /// 重置所有统计信息
    pub fn reset_statistics(&mut self) {
        self.retry_manager.reset_statistics();
        self.classifier.reset_statistics();
    }
}