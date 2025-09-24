use anyhow::{Context, Result};
use tracing::{info, warn};

use super::input_injector::{AdbShellInputInjector, InputInjector};
use super::safe_input_injector::SafeInputInjector;
use crate::infra::device::metrics_provider::RealDeviceMetricsProvider;
use crate::application::device_metrics::DeviceMetricsProvider;

/// 注入器优先的点击；支持可选长按（通过 swipe 同点实现）
pub async fn tap_injector_first(adb_path: &str, serial: &str, x: i32, y: i32, long_press_ms: Option<u32>) -> Result<()> {
    let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(adb_path.to_string()));
    match injector.tap(serial, x as u32, y as u32, long_press_ms).await {
        Ok(()) => {
            info!("🪄 injector-v1.0: tap 已通过统一注入器执行 x={}, y={}, longPress={:?}", x, y, long_press_ms);
            Ok(())
        }
        Err(e) => {
            warn!("🪄 injector-v1.0: 注入器 tap 失败，将回退旧命令。错误: {}", e);
            let mut cmd = std::process::Command::new(adb_path);
            cmd.args(&["-s", serial, "shell", "input"]);
            if let Some(d) = long_press_ms {
                cmd.args(&["swipe", &x.to_string(), &y.to_string(), &x.to_string(), &y.to_string(), &d.to_string()]);
            } else {
                cmd.args(&["tap", &x.to_string(), &y.to_string()]);
            }
            let out = cmd.output().context("fallback tap execution failed")?;
            if !out.status.success() {
                let err = String::from_utf8_lossy(&out.stderr);
                anyhow::bail!(format!("tap fallback failed: {}", err));
            }
            Ok(())
        }
    }
}

/// 注入器优先的滑动
pub async fn swipe_injector_first(adb_path: &str, serial: &str, x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: u32) -> Result<()> {
    let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(adb_path.to_string()));
    match injector.swipe(serial, x1 as u32, y1 as u32, x2 as u32, y2 as u32, duration_ms).await {
        Ok(()) => {
            info!("🪄 injector-v1.0: swipe 已通过统一注入器执行 from=({}, {}) to=({}, {}), d={}ms", x1, y1, x2, y2, duration_ms);
            Ok(())
        }
        Err(e) => {
            warn!("🪄 injector-v1.0: 注入器 swipe 失败，将回退旧命令。错误: {}", e);
            let out = std::process::Command::new(adb_path)
                .args(&["-s", serial, "shell", "input", "swipe", &x1.to_string(), &y1.to_string(), &x2.to_string(), &y2.to_string(), &duration_ms.to_string()])
                .output()
                .context("fallback swipe execution failed")?;
            if !out.status.success() {
                let err = String::from_utf8_lossy(&out.stderr);
                anyhow::bail!(format!("swipe fallback failed: {}", err));
            }
            Ok(())
        }
    }
}

/// 注入器优先的文本输入（简单版：空格转 %s，IME 策略后续可扩展）
pub async fn input_text_injector_first(adb_path: &str, serial: &str, text: &str) -> Result<()> {
    let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(adb_path.to_string()));
    match injector.input_text(serial, text).await {
        Ok(()) => {
            info!("🪄 injector-v1.0: text 已通过统一注入器执行 len={}", text.len());
            Ok(())
        }
        Err(e) => {
            warn!("🪄 injector-v1.0: 注入器 text 失败，将回退旧命令。错误: {}", e);
            let escaped = text.replace(' ', "%s");
            let out = std::process::Command::new(adb_path)
                .args(&["-s", serial, "shell", "input", "text", &escaped])
                .output()
                .context("fallback text execution failed")?;
            if !out.status.success() {
                let err = String::from_utf8_lossy(&out.stderr);
                anyhow::bail!(format!("text fallback failed: {}", err));
            }
            Ok(())
        }
    }
}

/// 坐标安全夹紧工具：按屏幕宽高将坐标夹在 [margin, max - margin] 范围内
fn clamp_coord(x: i32, y: i32, w: u32, h: u32) -> (i32, i32) {
    let w = w as i32; let h = h as i32;
    // 2% 边距，最小 8px，最大 40px（避免夹太多影响点击）
    let mut margin_x = (w as f32 * 0.02) as i32;
    let mut margin_y = (h as f32 * 0.02) as i32;
    margin_x = margin_x.clamp(8, 40);
    margin_y = margin_y.clamp(8, 40);
    let cx = x.clamp(margin_x, w - margin_x);
    let cy = y.clamp(margin_y, h - margin_y);
    (cx, cy)
}

/// 安全点击：先获取设备分辨率，对坐标进行夹紧，再走注入器优先
pub async fn tap_safe_injector_first(adb_path: &str, serial: &str, x: i32, y: i32, long_press_ms: Option<u32>) -> Result<()> {
    let provider = RealDeviceMetricsProvider::new(adb_path.to_string());
    let metrics = provider.get(serial).unwrap_or_else(|| crate::application::device_metrics::DeviceMetrics::new(1080, 1920));
    let (cx, cy) = clamp_coord(x, y, metrics.width_px, metrics.height_px);
    if (cx, cy) != (x, y) {
        info!("🛡️ 坐标夹紧: ({}, {}) -> ({}, {}) in {}x{}", x, y, cx, cy, metrics.width_px, metrics.height_px);
    }
    tap_injector_first(adb_path, serial, cx, cy, long_press_ms).await
}

/// 安全滑动：对起止坐标进行夹紧后执行
pub async fn swipe_safe_injector_first(adb_path: &str, serial: &str, x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: u32) -> Result<()> {
    let provider = RealDeviceMetricsProvider::new(adb_path.to_string());
    let metrics = provider.get(serial).unwrap_or_else(|| crate::application::device_metrics::DeviceMetrics::new(1080, 1920));
    let (sx, sy) = clamp_coord(x1, y1, metrics.width_px, metrics.height_px);
    let (ex, ey) = clamp_coord(x2, y2, metrics.width_px, metrics.height_px);
    if (sx, sy) != (x1, y1) || (ex, ey) != (x2, y2) {
        info!("🛡️ 滑动夹紧: ({}, {}) -> ({}, {}) 变为 ({}, {}) -> ({}, {}) in {}x{}", x1, y1, x2, y2, sx, sy, ex, ey, metrics.width_px, metrics.height_px);
    }
    swipe_injector_first(adb_path, serial, sx, sy, ex, ey, duration_ms).await
}
