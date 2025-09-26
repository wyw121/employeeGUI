use std::process::{Command, Stdio, Child};
use std::collections::HashMap;
use std::sync::{Mutex, Arc};

use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use tauri::State;
use tracing::{info, warn, error};

#[derive(Default)]
pub struct ScrcpyState {
    // device_id -> child process
    children: HashMap<String, Child>,
}

pub static SCRCPY_STATE: Lazy<Arc<Mutex<ScrcpyState>>> = Lazy::new(|| Arc::new(Mutex::new(ScrcpyState::default())));

fn scrcpy_path() -> String {
    // Windows 默认依赖 PATH 中的 scrcpy.exe
    // 可扩展：读取配置或与平台工具目录拼接
    "scrcpy".to_string()
}

fn build_args(device_id: &str, stay_awake: bool) -> Vec<String> {
    let mut args = vec![
        "--serial".into(), device_id.into(),
        "--stay-awake".into(),
        "--no-audio".into(),
        "--turn-screen-off".into(),
    ];
    if !stay_awake {
        // 如果不保持唤醒则移除该参数
        args.retain(|a| a != "--stay-awake");
    }
    args
}

pub fn start_scrcpy(device_id: &str, stay_awake: bool) -> Result<()> {
    let mut state = SCRCPY_STATE.lock().unwrap();
    if state.children.contains_key(device_id) {
        warn!("scrcpy already running for {}", device_id);
        return Ok(());
    }

    let exe = scrcpy_path();
    let args = build_args(device_id, stay_awake);
    info!("launching scrcpy: {} {:?}", exe, args);

    let child = Command::new(exe)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| anyhow!("failed to start scrcpy: {}", e))?;

    state.children.insert(device_id.to_string(), child);
    Ok(())
}

pub fn stop_scrcpy(device_id: &str) -> Result<()> {
    let mut state = SCRCPY_STATE.lock().unwrap();
    if let Some(mut child) = state.children.remove(device_id) {
        match child.kill() {
            Ok(_) => {
                let _ = child.wait();
                info!("scrcpy stopped for {}", device_id);
                Ok(())
            }
            Err(e) => Err(anyhow!("failed to kill scrcpy: {}", e)),
        }
    } else {
        warn!("scrcpy not running for {}", device_id);
        Ok(())
    }
}

#[tauri::command]
pub async fn start_device_mirror(device_id: String, options: Option<serde_json::Value>) -> Result<(), String> {
    let stay_awake = options
        .and_then(|v| v.get("stayAwake").and_then(|x| x.as_bool()))
        .unwrap_or(true);
    start_scrcpy(&device_id, stay_awake).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_device_mirror(device_id: String) -> Result<(), String> {
    stop_scrcpy(&device_id).map_err(|e| e.to_string())
}
