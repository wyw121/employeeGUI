//! retry_policy_tests.rs - 测试 RetryConfig 环境变量覆盖与指数回退基本行为

use super::super::{RetryConfig, ExponentialBackoffPolicy, RetryPolicy};

#[tokio::test]
async fn test_retry_config_from_env_overrides() {
    std::env::set_var("RETRY_MAX_RETRIES", "5");
    std::env::set_var("RETRY_BASE_DELAY_MS", "10");
    std::env::set_var("RETRY_MAX_DELAY_MS", "40");
    std::env::set_var("RETRY_JITTER_RATIO", "0.5");

    let cfg = RetryConfig::from_env();
    assert_eq!(cfg.max_retries, 5);
    assert_eq!(cfg.base_delay_ms, 10);
    assert_eq!(cfg.max_delay_ms, 40);
    assert!((cfg.jitter_ratio - 0.5).abs() < f64::EPSILON);
}

#[tokio::test]
async fn test_retry_policy_runs_until_success() {
    let policy = ExponentialBackoffPolicy::new(RetryConfig { max_retries: 3, base_delay_ms: 1, max_delay_ms: 4, jitter_ratio: 0.0 });
    let mut attempts = 0;
    let result: Result<u32, &'static str> = policy.run(|_a| {
        attempts += 1;
        let ok = attempts >= 3;
        async move { if ok { Ok(42) } else { Err("fail") } }
    }).await;
    assert_eq!(result.unwrap(), 42);
    assert_eq!(attempts, 3);
}