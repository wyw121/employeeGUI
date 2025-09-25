//! retry.rs - 重试 / 回退策略骨架
//! 目标：统一封装未来从 smart_script_executor 拆出的 retry_* 逻辑

use std::time::Duration;
use async_trait::async_trait;

#[async_trait]
pub trait RetryPolicy<T, E> {
    async fn run<F, Fut>(&self, op: F) -> Result<T, E>
    where
        F: Fn(u32) -> Fut + Send + Sync,
        Fut: std::future::Future<Output = Result<T, E>> + Send;
}

#[derive(Debug, Clone)]
pub struct ExponentialBackoffPolicy {
    pub max_retries: u32,
    pub base_delay_ms: u64,
    pub max_delay_ms: u64,
}

impl Default for ExponentialBackoffPolicy {
    fn default() -> Self {
        Self { max_retries: 3, base_delay_ms: 120, max_delay_ms: 1500 }
    }
}

#[async_trait]
impl<T, E> RetryPolicy<T, E> for ExponentialBackoffPolicy {
    async fn run<F, Fut>(&self, op: F) -> Result<T, E>
    where
        F: Fn(u32) -> Fut + Send + Sync,
        Fut: std::future::Future<Output = Result<T, E>> + Send,
    {
        let mut attempt = 0u32;
        loop {
            match op(attempt).await {
                Ok(v) => return Ok(v),
                Err(e) => {
                    if attempt >= self.max_retries { return Err(e); }
                    attempt += 1;
                    let delay = (self.base_delay_ms * 2u64.pow(attempt - 1)).min(self.max_delay_ms);
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                }
            }
        }
    }
}
