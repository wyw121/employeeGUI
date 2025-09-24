use anyhow::Result;
use crate::domain::actions::Action;
use crate::domain::coords::Coord;
use crate::application::normalizer::normalize_action;
use crate::application::device_metrics::DeviceMetrics;
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
        let a = normalize_action(action, &metrics);
        match a {
            Action::Tap { x, y, duration_ms } => {
                // 提取像素坐标（u32）
                let x = px(&x);
                let y = px(&y);
                self.injector
                    .tap(&self.device_id, x, y, Some(duration_ms.unwrap_or(0)))
                    .await?;
            }
            Action::Swipe { start, end, duration_ms } => {
                let dur = duration_ms;
                // Coord -> u32 像素
                let x1 = px(&start.x);
                let y1 = px(&start.y);
                let x2 = px(&end.x);
                let y2 = px(&end.y);
                self.injector
                    .swipe(&self.device_id, x1, y1, x2, y2, dur)
                    .await?;
            }
            Action::InputText { text } => {
                self.injector.input_text(&self.device_id, &text).await?;
            }
            Action::KeyEvent { code } => {
                self.injector.keyevent(&self.device_id, code).await?;
            }
            Action::Wait { ms } => {
                tokio::time::sleep(std::time::Duration::from_millis(ms as u64)).await;
            }
            _ => {}
        }
        Ok(())
    }

    pub async fn execute_script(&self, actions: Vec<Action>, metrics: DeviceMetrics, cfg: ExecutorConfig) -> Result<()> {
        let _ = cfg; // suppress unused
        for a in actions { self.execute_step(a, metrics).await?; }
        Ok(())
    }
}

#[inline]
fn px(c: &Coord) -> u32 {
    match c {
        Coord::Px(v) => *v,
        Coord::Percent(p) => {
            // 正常情况下不应出现（normalize_action 已转换为 Px），但为了健壮性保底取整
            (*p as u32).min(u32::MAX)
        }
    }
}
