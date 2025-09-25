//! registry.rs - 全局执行环境注册表
//! 用途：
//! - 追踪所有 SmartScriptExecutor 对应的 ExecutionEnvironment（弱引用防止泄漏）
//! - 聚合 metrics 暴露给 Tauri 命令
//! - 后续可支持按 device_id / 脚本实例区分

use std::sync::{Arc, Mutex};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Weak;
use crate::services::execution::ExecutionEnvironment;

#[derive(Default)]
struct EnvRegistryInner {
    // key: device_id (暂定) -> env (Weak)
    items: HashMap<String, Weak<ExecutionEnvironment>>,
}

pub struct EnvRegistry {
    inner: Mutex<EnvRegistryInner>,
}

impl EnvRegistry {
    pub fn register(&self, device_id: &str, env: &Arc<ExecutionEnvironment>) {
        let mut guard = self.inner.lock().unwrap();
        guard.items.insert(device_id.to_string(), Arc::downgrade(env));
    }

    pub fn snapshot_metrics(&self) -> serde_json::Value {
        let guard = self.inner.lock().unwrap();
        let mut arr = Vec::new();
        // 全局聚合初始化
        let mut total_steps = 0u64;
        let mut total_success = 0u64;
        let mut total_failed = 0u64;
        let mut total_retries = 0u64;
        let mut total_snaps = 0u64;
        let mut total_snap_ms = 0u64;
        for (_, weak_env) in guard.items.iter() {
            if let Some(strong) = weak_env.upgrade() {
                let json = strong.export_context_json();
                if let Some(m) = json.get("metrics") {
                    total_steps += m.get("steps_executed").and_then(|v| v.as_u64()).unwrap_or(0);
                    total_success += m.get("steps_succeeded").and_then(|v| v.as_u64()).unwrap_or(0);
                    total_failed += m.get("steps_failed").and_then(|v| v.as_u64()).unwrap_or(0);
                    total_retries += m.get("retries").and_then(|v| v.as_u64()).unwrap_or(0);
                    total_snaps += m.get("snapshots_captured").and_then(|v| v.as_u64()).unwrap_or(0);
                    total_snap_ms += m.get("snapshot_total_ms").and_then(|v| v.as_u64()).unwrap_or(0);
                }
                arr.push(json);
            }
        }
        let avg_snap_ms = if total_snaps > 0 { total_snap_ms as f64 / total_snaps as f64 } else { 0.0 };
        serde_json::json!({
            "devices": arr,
            "count": arr.len(),
            "aggregate": {
                "steps_executed": total_steps,
                "steps_succeeded": total_success,
                "steps_failed": total_failed,
                "retries": total_retries,
                "snapshots_captured": total_snaps,
                "snapshot_total_ms": total_snap_ms,
                "snapshots_avg_ms": avg_snap_ms,
            }
        })
    }
}

pub static EXEC_ENV_REGISTRY: Lazy<EnvRegistry> = Lazy::new(|| EnvRegistry { inner: Mutex::new(EnvRegistryInner::default()) });

pub fn register_execution_environment(device_id: &str, env: &Arc<ExecutionEnvironment>) {
    EXEC_ENV_REGISTRY.register(device_id, env);
}

pub fn collect_execution_metrics_json() -> serde_json::Value {
    EXEC_ENV_REGISTRY.snapshot_metrics()
}

#[cfg(test)]
pub fn _test_clear_registry() {
    use std::collections::HashMap;
    if let Ok(mut guard) = EXEC_ENV_REGISTRY.inner.lock() {
        guard.items = HashMap::new();
    }
}
