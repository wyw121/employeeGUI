use anyhow::Result;
use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider};
use crate::infra::device::metrics_provider::RealDeviceMetricsProvider;
use crate::infra::adb::input_injector::AdbShellInputInjector;
use crate::infra::adb::safe_input_injector::SafeInputInjector;
use crate::services::execution::model::SmartScriptStep;
use super::{adapter::adapt_legacy_steps, mapping::{map_legacy_to_actions}};

#[allow(dead_code)]
pub async fn run_v2_compat(steps: &[SmartScriptStep], device_id: &str, adb_path: &str) -> Result<()> {
    // 1) 适配旧结构
    let legacy = adapt_legacy_steps(steps);
    // 2) 映射到 DSL
    let actions = map_legacy_to_actions(&legacy);
    // 3) 指标：真实分辨率，失败回退默认
    let provider = RealDeviceMetricsProvider::new(adb_path.to_string());
    let metrics = match provider.get(device_id) {
        Some(m) => { tracing::info!("📐 real-metrics(v2): width={} height={} density={:?}", m.width_px, m.height_px, m.density); m }
        None => { tracing::warn!("📐 real-metrics(v2): 获取失败，使用默认 1080x1920"); DeviceMetrics::new(1080, 1920) }
    };
    // 4) 注入器（带轻量重试保护）
    let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(adb_path.to_string()));
    // 5) 执行器
    let exec = super::executor::Executor::new(device_id.to_string(), adb_path.to_string(), injector);
    exec.execute_script(actions, metrics, super::executor::ExecutorConfig { continue_on_error: true }).await
}
