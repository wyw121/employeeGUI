//! env.rs - ExecutionEnvironment 汇聚重试策略 + 快照提供器 + 上下文
//! 目标：提供对外统一注入点，替换巨石执行器里分散的依赖

use std::sync::{Arc, Mutex};
use crate::services::execution::{ExecutionContext, ExponentialBackoffPolicy, RetryPolicy, NoopSnapshotProvider, UiSnapshotProvider, UiSnapshot};

#[derive(Clone)]
pub struct ExecutionEnvironment {
    pub device_id: String,
    pub context: Arc<Mutex<ExecutionContext>>,
    pub retry_policy: Arc<ExponentialBackoffPolicy>,
    pub snapshot_provider: Arc<dyn UiSnapshotProvider>,
}

impl ExecutionEnvironment {
    pub fn new(device_id: impl Into<String>) -> Self {
        let did = device_id.into();
        Self {
            device_id: did.clone(),
            context: Arc::new(Mutex::new(ExecutionContext::new(did.clone()))),
            retry_policy: Arc::new(ExponentialBackoffPolicy::default()),
            snapshot_provider: Arc::new(NoopSnapshotProvider::default()),
        }
    }

    pub fn with_retry_policy(mut self, policy: ExponentialBackoffPolicy) -> Self {
        self.retry_policy = Arc::new(policy); self
    }

    pub fn with_snapshot_provider<P: UiSnapshotProvider + 'static>(mut self, provider: P) -> Self {
        self.snapshot_provider = Arc::new(provider); self
    }
}

/// 提供一个统一的重试调用包装（统计 + 复用策略）
impl ExecutionEnvironment {
    pub async fn run_with_retry<T, E, F, Fut>(&self, op: F) -> Result<T, E>
    where
        T: Send + 'static,
        E: Send + 'static,
        F: Fn(u32) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<T, E>> + Send + 'static,
    {
        let context = self.context.clone();
        let res = self.retry_policy.run(move |attempt| {
            if attempt > 0 {
                if let Ok(ctx) = context.lock() {
                    ctx.metrics.record_retry();
                }
            }
            op(attempt)
        }).await;

        if let Ok(ctx) = self.context.lock() {
            if res.is_err() {
                ctx.metrics.record_failure();
            } else {
                ctx.metrics.record_success();
            }
        }
        res
    }

    pub async fn capture_snapshot(&self) -> anyhow::Result<UiSnapshot> {
        let start = std::time::Instant::now();
        // 为了调用 provider 需要先拿到 device_id
        let res = self.snapshot_provider.capture(&self.device_id).await;
        let elapsed = start.elapsed().as_millis() as u64;
        if let Ok(ctx) = self.context.lock() {
            ctx.metrics.record_snapshot(elapsed, res.is_ok());
        }
        res
    }

    pub fn export_context_json(&self) -> serde_json::Value {
        if let Ok(ctx) = self.context.lock() {
            serde_json::json!({
                "device_id": self.device_id,
                "metrics": ctx.metrics.snapshot_view(),
                "variables": ctx.variables.inner(),
            })
        } else {
            serde_json::json!({"error": "context_lock_poisoned"})
        }
    }
}
