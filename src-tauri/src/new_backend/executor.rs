use anyhow::Result;
use crate::domain::actions::Action;
use crate::application::normalizer::{normalize_action, DeviceMetrics};
use crate::infra::adb::input_injector::InputInjector;

#[allow(dead_code)]
pub struct ExecutorConfig {
    pub continue_on_error: bool,
}

#[allow(dead_code)]
pub struct Executor<I: InputInjector> {
    pub device_id: String,
    pub adb_path: String,
    pub injector: I,
}

#[allow(dead_code)]
impl<I: InputInjector> Executor<I> {
    pub fn new(device_id: String, adb_path: String, injector: I) -> Self { Self { device_id, adb_path, injector } }

    pub async fn execute_step(&self, action: Action, metrics: DeviceMetrics) -> Result<()> {
        let normalized = normalize_action(action, &metrics);
        match normalized {
            Action::Tap { x: crate::domain::coords::Coord::Px(x), y: crate::domain::coords::Coord::Px(y), duration_ms } => {
                self.injector.tap(&self.device_id, x, y, duration_ms).await
            }
            Action::Swipe { start, end, duration_ms } => {
                // start/end already pixels
                self.injector.swipe(&self.device_id, start.x, start.y, end.x, end.y, duration_ms).await
            }
            Action::InputText { text } => {
                self.injector.input_text(&self.device_id, &text).await
            }
            Action::KeyEvent { code } => {
                self.injector.keyevent(&self.device_id, code).await
            }
            Action::Wait { ms } => {
                tokio::time::sleep(std::time::Duration::from_millis(ms as u64)).await;
                Ok(())
            }
            Action::Tap { .. } => unreachable!("tap normalized to pixels"),
            Action::SmartScroll { .. } => unreachable!("smart scroll normalized to swipe"),
        }
    }

    pub async fn execute_script(&self, actions: Vec<Action>, metrics: DeviceMetrics, cfg: ExecutorConfig) -> Result<()> {
        let _ = cfg; // suppress unused
        for a in actions { self.execute_step(a, metrics).await?; }
        Ok(())
    }
}
