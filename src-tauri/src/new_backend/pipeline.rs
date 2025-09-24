use anyhow::Result;
use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider, StubDeviceMetricsProvider};
use crate::infra::adb::input_injector::{AdbShellInputInjector, InputInjector};
use super::{adapter::adapt_legacy_steps, mapping::{map_legacy_to_actions}};

#[allow(dead_code)]
pub async fn run_v2_compat(steps: &[crate::services::smart_script_executor::SmartScriptStep], device_id: &str, adb_path: &str) -> Result<()> {
    // 1) 适配旧结构
    let legacy = adapt_legacy_steps(steps);
    // 2) 映射到 DSL
    let actions = map_legacy_to_actions(&legacy);
    // 3) 指标（先用 Stub）
    let mut metrics_provider = StubDeviceMetricsProvider::new();
    let metrics = metrics_provider.get(device_id).unwrap_or(DeviceMetrics::new(1080, 1920));
    // 4) 注入器
    let injector = AdbShellInputInjector::new(adb_path.to_string());
    // 5) 执行器
    let exec = super::executor::Executor::new(device_id.to_string(), adb_path.to_string(), injector);
    exec.execute_script(actions, metrics, super::executor::ExecutorConfig { continue_on_error: true }).await
}
