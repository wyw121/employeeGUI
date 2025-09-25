//! retry.rs - 重试 / 回退策略骨架
//! 目标：统一封装未来从 smart_script_executor 拆出的 retry_* 逻辑

use std::time::Duration;
use rand::{Rng, thread_rng};
use async_trait::async_trait;

#[async_trait]
pub trait RetryPolicy<T, E>
where
    T: Send + 'static,
    E: Send + 'static,
{
    async fn run<F, Fut>(&self, op: F) -> Result<T, E>
    where
        F: Fn(u32) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<T, E>> + Send + 'static;
}

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub base_delay_ms: u64,
    pub max_delay_ms: u64,
    pub jitter_ratio: f64, // 0.0 - 1.0 之间
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self { max_retries: 3, base_delay_ms: 120, max_delay_ms: 1500, jitter_ratio: 0.15 }
    }
}

impl RetryConfig {
    pub fn from_env() -> Self {
        let mut cfg = RetryConfig::default();
        if let Ok(v) = std::env::var("RETRY_MAX_RETRIES") { if let Ok(p) = v.parse() { cfg.max_retries = p; } }
        if let Ok(v) = std::env::var("RETRY_BASE_DELAY_MS") { if let Ok(p) = v.parse() { cfg.base_delay_ms = p; } }
        if let Ok(v) = std::env::var("RETRY_MAX_DELAY_MS") { if let Ok(p) = v.parse() { cfg.max_delay_ms = p; } }
        if let Ok(v) = std::env::var("RETRY_JITTER_RATIO") { if let Ok(p) = v.parse::<f64>() { cfg.jitter_ratio = p.clamp(0.0, 1.0); } }
        cfg
    }
}

#[derive(Debug, Clone)]
pub struct ExponentialBackoffPolicy {
    pub config: RetryConfig,
}

impl ExponentialBackoffPolicy {
    pub fn new(config: RetryConfig) -> Self { Self { config } }
}

impl Default for ExponentialBackoffPolicy {
    fn default() -> Self { Self { config: RetryConfig::default() } }
}

#[async_trait]
impl<T, E> RetryPolicy<T, E> for ExponentialBackoffPolicy
where
    T: Send + 'static,
    E: Send + 'static,
{
    async fn run<F, Fut>(&self, op: F) -> Result<T, E>
    where
        F: Fn(u32) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<T, E>> + Send + 'static,
    {
        let mut attempt = 0u32;
        loop {
            match op(attempt).await {
                Ok(v) => return Ok(v),
                Err(e) => {
                    if attempt >= self.config.max_retries { return Err(e); }
                    attempt += 1;
                    let exp_delay = (self.config.base_delay_ms * 2u64.pow(attempt - 1)).min(self.config.max_delay_ms);
                    // jitter: 在 [exp_delay * (1-jitter_ratio), exp_delay * (1+jitter_ratio)] 之间
                    let jr = self.config.jitter_ratio;
                    let low = (exp_delay as f64 * (1.0 - jr)) as u64;
                    let high = (exp_delay as f64 * (1.0 + jr)) as u64;
                    let delay = if high > low { thread_rng().gen_range(low..=high) } else { exp_delay };
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                }
            }
        }
    }
}
