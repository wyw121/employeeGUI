use anyhow::{Context, Result};
use tracing::{info, warn};

use super::input_injector::{AdbShellInputInjector, InputInjector};
use super::safe_input_injector::SafeInputInjector;

/// 通过“注入器优先 + 原始 adb 回退”发送符号化按键，例如 "KEYCODE_HOME"。
pub async fn keyevent_symbolic_injector_first(adb_path: &str, serial: &str, symbolic: &str) -> Result<()> {
    let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(adb_path.to_string()));
    match injector.keyevent_symbolic(serial, symbolic).await {
        Ok(()) => {
            info!("🪄 injector-v1.0: {} 已通过统一注入器执行", symbolic);
            Ok(())
        }
        Err(e) => {
            warn!("🪄 injector-v1.0: 注入器 {} 失败，将回退旧命令。错误: {}", symbolic, e);
            let output = std::process::Command::new(adb_path)
                .args(&["-s", serial, "shell", "input", "keyevent", symbolic])
                .output()
                .context("fallback keyevent execution failed")?;
            if !output.status.success() {
                let err = String::from_utf8_lossy(&output.stderr);
                anyhow::bail!(format!("keyevent fallback failed: {}", err));
            }
            Ok(())
        }
    }
}

/// 数值化 keycode 版本（尽量使用符号化版本；此函数用于兼容）。
pub async fn keyevent_code_injector_first(adb_path: &str, serial: &str, code: i32) -> Result<()> {
    let injector = SafeInputInjector::from_env(AdbShellInputInjector::new(adb_path.to_string()));
    match injector.keyevent(serial, code).await {
        Ok(()) => {
            info!("🪄 injector-v1.0: keyevent({}) 已通过统一注入器执行", code);
            Ok(())
        }
        Err(e) => {
            warn!("🪄 injector-v1.0: 注入器 keyevent({}) 失败，将回退旧命令。错误: {}", code, e);
            let output = std::process::Command::new(adb_path)
                .args(&["-s", serial, "shell", "input", "keyevent", &code.to_string()])
                .output()
                .context("fallback numeric keyevent execution failed")?;
            if !output.status.success() {
                let err = String::from_utf8_lossy(&output.stderr);
                anyhow::bail!(format!("keyevent fallback failed: {}", err));
            }
            Ok(())
        }
    }
}
