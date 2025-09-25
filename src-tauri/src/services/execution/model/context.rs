//! context.rs - 执行上下文骨架
//! 目标：承载变量、运行期状态、设备信息、统计指标等（逐步从巨石执行器迁移）

use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use std::sync::atomic::{AtomicU64, AtomicBool, Ordering};

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ExecVariables(HashMap<String, serde_json::Value>);

impl ExecVariables {
    pub fn get(&self, key: &str) -> Option<&serde_json::Value> { self.0.get(key) }
    pub fn insert<V: Into<serde_json::Value>>(&mut self, key: impl Into<String>, val: V) {
        self.0.insert(key.into(), val.into());
    }
    pub fn inner(&self) -> &HashMap<String, serde_json::Value> { &self.0 }
}

#[derive(Debug, Default)]
pub struct ExecMetrics {
    steps_executed: AtomicU64,
    steps_succeeded: AtomicU64,
    steps_failed: AtomicU64,
    retries: AtomicU64,
    snapshots_captured: AtomicU64,
    snapshot_total_ms: AtomicU64,
    last_snapshot_timestamp: AtomicU64,
    last_snapshot_ok: AtomicBool,
}

impl Clone for ExecMetrics {
    fn clone(&self) -> Self {
        Self {
            steps_executed: AtomicU64::new(self.steps_executed.load(Ordering::Relaxed)),
            steps_succeeded: AtomicU64::new(self.steps_succeeded.load(Ordering::Relaxed)),
            steps_failed: AtomicU64::new(self.steps_failed.load(Ordering::Relaxed)),
            retries: AtomicU64::new(self.retries.load(Ordering::Relaxed)),
            snapshots_captured: AtomicU64::new(self.snapshots_captured.load(Ordering::Relaxed)),
            snapshot_total_ms: AtomicU64::new(self.snapshot_total_ms.load(Ordering::Relaxed)),
            last_snapshot_timestamp: AtomicU64::new(self.last_snapshot_timestamp.load(Ordering::Relaxed)),
            last_snapshot_ok: AtomicBool::new(self.last_snapshot_ok.load(Ordering::Relaxed)),
        }
    }
}

impl ExecMetrics {
    pub fn record_success(&self) {
        self.steps_executed.fetch_add(1, Ordering::Relaxed);
        self.steps_succeeded.fetch_add(1, Ordering::Relaxed);
    }
    pub fn record_failure(&self) {
        self.steps_executed.fetch_add(1, Ordering::Relaxed);
        self.steps_failed.fetch_add(1, Ordering::Relaxed);
    }
    pub fn record_retry(&self) { self.retries.fetch_add(1, Ordering::Relaxed); }
    pub fn record_snapshot(&self, elapsed_ms: u64, ok: bool) {
        self.snapshots_captured.fetch_add(1, Ordering::Relaxed);
        self.snapshot_total_ms.fetch_add(elapsed_ms, Ordering::Relaxed);
        self.last_snapshot_timestamp.store(
            chrono::Utc::now().timestamp_millis() as u64,
            Ordering::Relaxed
        );
        self.last_snapshot_ok.store(ok, Ordering::Relaxed);
    }
    pub fn snapshot_view(&self) -> serde_json::Value {
        let sc = self.snapshots_captured.load(Ordering::Relaxed);
        let total_ms = self.snapshot_total_ms.load(Ordering::Relaxed);
        let avg = if sc > 0 { total_ms as f64 / sc as f64 } else { 0.0 };
        serde_json::json!({
            "steps_executed": self.steps_executed.load(Ordering::Relaxed),
            "steps_succeeded": self.steps_succeeded.load(Ordering::Relaxed),
            "steps_failed": self.steps_failed.load(Ordering::Relaxed),
            "retries": self.retries.load(Ordering::Relaxed),
            "snapshots_captured": sc,
            "snapshot_total_ms": total_ms,
            "snapshots_avg_ms": avg,
            "last_snapshot_timestamp": self.last_snapshot_timestamp.load(Ordering::Relaxed),
            "last_snapshot_ok": self.last_snapshot_ok.load(Ordering::Relaxed),
        })
    }
}

#[derive(Debug, Clone)]
pub struct ExecutionContext {
    pub device_id: String,
    pub variables: ExecVariables,
    pub metrics: ExecMetrics,
}

impl ExecutionContext {
    pub fn new(device_id: impl Into<String>) -> Self {
        Self { device_id: device_id.into(), variables: ExecVariables::default(), metrics: ExecMetrics::default() }
    }
}
