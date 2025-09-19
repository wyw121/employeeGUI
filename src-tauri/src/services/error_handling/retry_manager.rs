/// 重试管理器 - 提供智能重试机制
use crate::services::error_handling::{ErrorHandlingConfig, ErrorType};
use anyhow::Result;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{info, warn, debug};

/// 重试状态
#[derive(Debug, Clone)]
pub struct RetryAttempt {
    pub attempt_number: usize,
    pub total_elapsed: Duration,
    pub last_delay: Duration,
    pub error_message: Option<String>,
}

/// 重试结果
#[derive(Debug)]
pub enum RetryResult<T> {
    Success(T),
    Failed(String),
    MaxRetriesExceeded,
}

/// 重试管理器
pub struct RetryManager {
    config: ErrorHandlingConfig,
    retry_stats: RetryStatistics,
}

impl RetryManager {
    pub fn new(config: ErrorHandlingConfig) -> Self {
        Self {
            config,
            retry_stats: RetryStatistics::new(),
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
        let mut last_error: Option<String> = None;

        for attempt in 1..=self.config.max_retries + 1 {
            let attempt_start = Instant::now();
            
            if self.config.verbose_logging && attempt > 1 {
                info!("🔄 重试操作 '{}' - 第 {}/{} 次尝试", 
                    operation_name, attempt, self.config.max_retries + 1);
            }

            match operation() {
                Ok(result) => {
                    let total_duration = start_time.elapsed();
                    if self.config.verbose_logging && attempt > 1 {
                        info!("✅ 操作 '{}' 在第 {} 次尝试后成功 (总耗时: {:?})", 
                            operation_name, attempt, total_duration);
                    }
                    
                    // 更新统计信息
                    self.retry_stats.record_success(operation_name, attempt, total_duration);
                    
                    return Ok(result);
                }
                Err(e) => {
                    let error_msg = format!("{}", e);
                    last_error = Some(error_msg.clone());
                    
                    let attempt_duration = attempt_start.elapsed();
                    
                    if attempt <= self.config.max_retries {
                        if self.config.verbose_logging {
                            warn!("⚠️  操作 '{}' 第 {} 次尝试失败: {} (耗时: {:?})", 
                                operation_name, attempt, error_msg, attempt_duration);
                        }
                        
                        // 计算延迟时间
                        let delay = self.calculate_delay(attempt);
                        
                        if self.config.verbose_logging {
                            debug!("⏳ 等待 {:?} 后重试...", delay);
                        }
                        
                        sleep(delay).await;
                    } else {
                        // 所有重试都失败了
                        let total_duration = start_time.elapsed();
                        warn!("❌ 操作 '{}' 在 {} 次尝试后最终失败 (总耗时: {:?})", 
                            operation_name, attempt - 1, total_duration);
                        
                        // 更新统计信息
                        self.retry_stats.record_failure(operation_name, attempt - 1, total_duration);
                        
                        return Err(anyhow::anyhow!(
                            "操作 '{}' 失败: 已达最大重试次数 ({} 次). 最后错误: {}", 
                            operation_name, self.config.max_retries, 
                            last_error.unwrap_or_else(|| "未知错误".to_string())
                        ));
                    }
                }
            }
        }

        // 这行理论上不应该达到，但作为安全网
        Err(anyhow::anyhow!("重试逻辑异常"))
    }

    /// 计算重试延迟
    fn calculate_delay(&self, attempt: usize) -> Duration {
        if !self.config.exponential_backoff {
            return self.config.base_delay;
        }

        // 指数退避：delay = base_delay * 2^(attempt-1)
        let exponential_delay = self.config.base_delay * (2_u32.pow((attempt - 1) as u32));
        
        // 添加随机抖动 (±25%)
        let jitter_factor = 0.75 + (rand::random::<f64>() * 0.5); // 0.75 到 1.25
        let jittered_delay = Duration::from_nanos(
            (exponential_delay.as_nanos() as f64 * jitter_factor) as u64
        );
        
        // 限制在最大延迟内
        std::cmp::min(jittered_delay, self.config.max_delay)
    }

    /// 获取重试统计信息
    pub fn get_statistics(&self) -> &RetryStatistics {
        &self.retry_stats
    }

    /// 重置统计信息
    pub fn reset_statistics(&mut self) {
        self.retry_stats = RetryStatistics::new();
    }
}

/// 重试统计信息
#[derive(Debug)]
pub struct RetryStatistics {
    pub total_operations: usize,
    pub successful_operations: usize,
    pub failed_operations: usize,
    pub total_retry_attempts: usize,
    pub average_attempts_per_success: f64,
    pub total_time_spent: Duration,
}

impl RetryStatistics {
    fn new() -> Self {
        Self {
            total_operations: 0,
            successful_operations: 0,
            failed_operations: 0,
            total_retry_attempts: 0,
            average_attempts_per_success: 0.0,
            total_time_spent: Duration::ZERO,
        }
    }

    fn record_success(&mut self, _operation_name: &str, attempts: usize, duration: Duration) {
        self.total_operations += 1;
        self.successful_operations += 1;
        self.total_retry_attempts += attempts - 1; // 减去初始尝试
        self.total_time_spent += duration;
        
        self.update_averages();
    }

    fn record_failure(&mut self, _operation_name: &str, attempts: usize, duration: Duration) {
        self.total_operations += 1;
        self.failed_operations += 1;
        self.total_retry_attempts += attempts - 1; // 减去初始尝试
        self.total_time_spent += duration;
        
        self.update_averages();
    }

    fn update_averages(&mut self) {
        if self.successful_operations > 0 {
            self.average_attempts_per_success = 
                (self.total_retry_attempts as f64) / (self.successful_operations as f64) + 1.0;
        }
    }

    /// 获取成功率
    pub fn success_rate(&self) -> f64 {
        if self.total_operations == 0 {
            0.0
        } else {
            (self.successful_operations as f64) / (self.total_operations as f64)
        }
    }

    /// 获取平均执行时间
    pub fn average_execution_time(&self) -> Duration {
        if self.total_operations == 0 {
            Duration::ZERO
        } else {
            self.total_time_spent / (self.total_operations as u32)
        }
    }

    /// 生成统计报告
    pub fn generate_report(&self) -> String {
        format!(
            "重试统计报告:\n\
            - 总操作数: {}\n\
            - 成功操作: {} ({:.1}%)\n\
            - 失败操作: {} ({:.1}%)\n\
            - 总重试次数: {}\n\
            - 平均每次成功需要尝试: {:.1} 次\n\
            - 总耗时: {:?}\n\
            - 平均执行时间: {:?}",
            self.total_operations,
            self.successful_operations,
            self.success_rate() * 100.0,
            self.failed_operations,
            (self.failed_operations as f64 / self.total_operations as f64) * 100.0,
            self.total_retry_attempts,
            self.average_attempts_per_success,
            self.total_time_spent,
            self.average_execution_time()
        )
    }
}

/// 针对特定错误类型的重试策略
pub struct ErrorSpecificRetryStrategy {
    strategies: std::collections::HashMap<ErrorType, RetryConfig>,
}

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_retries: usize,
    pub base_delay: Duration,
    pub max_delay: Duration,
    pub exponential_backoff: bool,
}

impl ErrorSpecificRetryStrategy {
    pub fn new() -> Self {
        let mut strategies = std::collections::HashMap::new();
        
        // UI dump失败 - 较多重试，较短延迟
        strategies.insert(ErrorType::UiDumpFailed, RetryConfig {
            max_retries: 5,
            base_delay: Duration::from_millis(300),
            max_delay: Duration::from_secs(3),
            exponential_backoff: true,
        });

        // 设备忙碌 - 中等重试，中等延迟
        strategies.insert(ErrorType::DeviceBusy, RetryConfig {
            max_retries: 3,
            base_delay: Duration::from_millis(800),
            max_delay: Duration::from_secs(5),
            exponential_backoff: true,
        });

        // 临时连接丢失 - 较多重试，较长延迟
        strategies.insert(ErrorType::TemporaryConnectionLoss, RetryConfig {
            max_retries: 4,
            base_delay: Duration::from_secs(1),
            max_delay: Duration::from_secs(8),
            exponential_backoff: true,
        });

        // 服务临时不可用 - 少量重试，长延迟
        strategies.insert(ErrorType::ServiceTemporarilyUnavailable, RetryConfig {
            max_retries: 2,
            base_delay: Duration::from_secs(2),
            max_delay: Duration::from_secs(10),
            exponential_backoff: false,
        });

        Self { strategies }
    }

    pub fn get_config(&self, error_type: &ErrorType) -> Option<&RetryConfig> {
        self.strategies.get(error_type)
    }

    pub fn should_retry(&self, error_type: &ErrorType) -> bool {
        self.strategies.contains_key(error_type)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_retry_success_after_failure() {
        let config = ErrorHandlingConfig::default();
        let retry_manager = RetryManager::new(config);
        
        let mut call_count = 0;
        let result = retry_manager.execute_with_retry(
            "test_operation",
            || {
                call_count += 1;
                if call_count < 3 {
                    Err("temporary failure")
                } else {
                    Ok("success")
                }
            }
        ).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "success");
        assert_eq!(call_count, 3);
    }

    #[test]
    async fn test_retry_max_attempts_exceeded() {
        let config = ErrorHandlingConfig {
            max_retries: 2,
            base_delay: Duration::from_millis(1),
            ..Default::default()
        };
        let retry_manager = RetryManager::new(config);
        
        let result = retry_manager.execute_with_retry(
            "test_operation",
            || Err::<String, &str>("persistent failure")
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("已达最大重试次数"));
    }
}