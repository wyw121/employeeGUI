/// 重试管理器 - 提供智能重试机制
use crate::services::error_handling::ErrorHandlingConfig;
use anyhow::Result;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{info, warn};

/// 重试统计信息
#[derive(Debug, Default)]
pub struct RetryStatistics {
    pub total_operations: usize,
    pub successful_operations: usize,
    pub failed_operations: usize,
    pub total_retry_attempts: usize,
}

impl RetryStatistics {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_success(&mut self, attempts: usize) {
        self.total_operations += 1;
        self.successful_operations += 1;
        self.total_retry_attempts += attempts.saturating_sub(1);
    }

    pub fn record_failure(&mut self, attempts: usize) {
        self.total_operations += 1;
        self.failed_operations += 1;
        self.total_retry_attempts += attempts;
    }

    pub fn success_rate(&self) -> f64 {
        if self.total_operations == 0 {
            0.0
        } else {
            self.successful_operations as f64 / self.total_operations as f64
        }
    }

    pub fn reset(&mut self) {
        *self = Self::default();
    }

    pub fn generate_report(&self) -> String {
        format!(
            "Retry Statistics: Total: {}, Success: {}, Failed: {}, Success Rate: {:.2}%",
            self.total_operations,
            self.successful_operations,
            self.failed_operations,
            self.success_rate() * 100.0
        )
    }
}

/// 重试管理器
pub struct RetryManager {
    config: ErrorHandlingConfig,
    stats: RetryStatistics,
}

impl RetryManager {
    pub fn new(config: ErrorHandlingConfig) -> Self {
        Self {
            config,
            stats: RetryStatistics::new(),
        }
    }

    /// 执行带重试的操作
    pub async fn execute_with_retry<F, T, E>(
        &mut self,
        operation_name: &str,
        mut operation: F,
    ) -> Result<T>
    where
        F: FnMut() -> Result<T, E>,
        E: std::fmt::Display + std::fmt::Debug,
    {
        let start_time = Instant::now();
        let max_retries = self.config.max_retries;
        
        for attempt in 1..=max_retries {
            match operation() {
                Ok(result) => {
                    if attempt > 1 {
                        info!(
                            operation = operation_name,
                            attempt = attempt,
                            duration = ?start_time.elapsed(),
                            "Operation succeeded after {} attempts",
                            attempt
                        );
                    }
                    
                    self.stats.record_success(attempt);
                    return Ok(result);
                }
                Err(error) => {
                    if attempt < max_retries {
                        let delay = self.calculate_delay(attempt);
                        warn!(
                            operation = operation_name,
                            attempt = attempt,
                            error = %error,
                            delay_ms = delay.as_millis(),
                            "Operation failed, retrying in {}ms",
                            delay.as_millis()
                        );
                        
                        sleep(delay).await;
                    } else {
                        warn!(
                            operation = operation_name,
                            attempts = attempt,
                            duration = ?start_time.elapsed(),
                            error = %error,
                            "Operation failed after {} attempts",
                            attempt
                        );
                        
                        self.stats.record_failure(attempt);
                        return Err(anyhow::anyhow!(
                            "Operation failed after {} attempts: {}",
                            attempt,
                            error
                        ));
                    }
                }
            }
        }

        unreachable!()
    }

    /// 计算重试延迟
    fn calculate_delay(&self, attempt: usize) -> Duration {
        let base_delay = self.config.base_delay;
        let exponential_delay = base_delay.as_millis() * (2_u128.pow((attempt - 1) as u32));
        Duration::from_millis(exponential_delay.min(5000) as u64) // 最大5秒
    }

    /// 获取统计信息
    pub fn get_statistics(&self) -> &RetryStatistics {
        &self.stats
    }

    /// 重置统计信息
    pub fn reset_statistics(&mut self) {
        self.stats.reset();
    }
}
