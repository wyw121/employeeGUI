//! context.rs - 执行上下文骨架
//! 目标：承载变量、运行期状态、设备信息、统计指标等（逐步从巨石执行器迁移）

use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ExecVariables(HashMap<String, serde_json::Value>);

impl ExecVariables {
    pub fn get(&self, key: &str) -> Option<&serde_json::Value> { self.0.get(key) }
    pub fn insert<V: Into<serde_json::Value>>(&mut self, key: impl Into<String>, val: V) {
        self.0.insert(key.into(), val.into());
    }
    pub fn inner(&self) -> &HashMap<String, serde_json::Value> { &self.0 }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExecMetrics {
    pub steps_executed: u64,
    pub steps_succeeded: u64,
    pub steps_failed: u64,
    pub retries: u64,
}

impl ExecMetrics {
    pub fn record_success(&mut self) { self.steps_executed += 1; self.steps_succeeded += 1; }
    pub fn record_failure(&mut self) { self.steps_executed += 1; self.steps_failed += 1; }
    pub fn record_retry(&mut self) { self.retries += 1; }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
