use std::process::{Command, Stdio, Child};
use std::collections::HashMap;
use std::sync::{Mutex, Arc};

use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use tauri::State;
use tracing::{info, warn, error};

#[derive(Default)]
pub struct ScrcpyState {
    // device_id -> (session_name -> child process)
    children: HashMap<String, HashMap<String, Child>>,
}

pub static SCRCPY_STATE: Lazy<Arc<Mutex<ScrcpyState>>> = Lazy::new(|| Arc::new(Mutex::new(ScrcpyState::default())));

fn scrcpy_path() -> String {
    // Windows 默认依赖 PATH 中的 scrcpy.exe
    // 可扩展：读取配置或与平台工具目录拼接
    "scrcpy".to_string()
}

// 用户可配置的 scrcpy 选项（保持小集合，满足前端表单）
#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrcpyOptions {
    pub stay_awake: Option<bool>,
    pub turn_screen_off: Option<bool>,
    pub resolution: Option<String>, // e.g. "1280:720" or "1280x720" (scrcpy 为 -m/--max-size 效果不同，这里按 --max-size 简化)
    pub bitrate: Option<String>,    // e.g. "8M"
    pub max_fps: Option<u32>,       // e.g. 60
    pub window_title: Option<String>,
    pub session_name: Option<String>, // 会话名，不传则使用默认 "default"
}

fn build_args(device_id: &str, opts: &ScrcpyOptions) -> Vec<String> {
    let mut args: Vec<String> = vec!["--serial".into(), device_id.into()];

    // 电源/屏幕
    if opts.stay_awake.unwrap_or(true) {
        args.push("--stay-awake".into());
    }
    if opts.turn_screen_off.unwrap_or(false) {
        args.push("--turn-screen-off".into());
    }
    // 关闭音频（桌面场景常见）
    args.push("--no-audio".into());

    // 码率
    if let Some(b) = &opts.bitrate {
        if !b.trim().is_empty() {
            args.push("--bit-rate".into());
            args.push(b.trim().to_string());
        }
    }
    // 分辨率/最大尺寸（scrcpy 用 --max-size 控制较长边像素，简单起见兼容 "1280" 或 "1280x720"：我们解析为 "1280"）
    if let Some(r) = &opts.resolution {
        let s = r.trim();
        if !s.is_empty() {
            // 提取数字，取较长边像素
            if let Some(num) = s.split(|c| c == 'x' || c == ':' || c == 'X').next() {
                if !num.is_empty() {
                    args.push("--max-size".into());
                    args.push(num.to_string());
                }
            }
        }
    }
    // FPS
    if let Some(fps) = opts.max_fps {
        if fps > 0 {
            args.push("--max-fps".into());
            args.push(fps.to_string());
        }
    }
    // 窗口标题
    if let Some(title) = &opts.window_title {
        if !title.trim().is_empty() {
            args.push("--window-title".into());
            args.push(title.trim().to_string());
        }
    }

    args
}

fn ensure_scrcpy_available() -> Result<()> {
    let exe = scrcpy_path();
    // 尝试运行 --version 以检查是否可执行
    match Command::new(&exe).arg("--version").stdout(Stdio::null()).stderr(Stdio::null()).status() {
        Ok(status) => {
            if status.success() {
                Ok(())
            } else {
                Err(anyhow!("scrcpy exists but returned non-zero on --version"))
            }
        }
        Err(e) => Err(anyhow!("scrcpy not found or not executable: {}. 请确认已安装并加入 PATH。", e))
    }
}

pub fn start_scrcpy(device_id: &str, opts: ScrcpyOptions) -> Result<String> {
    ensure_scrcpy_available()?;
    let mut state = SCRCPY_STATE.lock().unwrap();
    let session = opts.session_name.clone().unwrap_or_else(|| "default".to_string());

    let exe = scrcpy_path();
    let args = build_args(device_id, &opts);
    info!("launching scrcpy: {} {:?} (device={}, session={})", exe, args, device_id, session);

    let child = Command::new(exe)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| anyhow!("failed to start scrcpy: {}", e))?;

    let entry = state.children.entry(device_id.to_string()).or_insert_with(HashMap::new);
    if let Some(mut old) = entry.remove(&session) {
        let _ = old.kill();
        let _ = old.wait();
    }
    entry.insert(session.clone(), child);
    Ok(session)
}

pub fn stop_scrcpy(device_id: &str) -> Result<()> {
    let mut state = SCRCPY_STATE.lock().unwrap();
    if let Some(mut sessions) = state.children.remove(device_id) {
        for (name, mut child) in sessions.drain() {
            match child.kill() {
                Ok(_) => { let _ = child.wait(); info!("scrcpy stopped: device={}, session={}", device_id, name); }
                Err(e) => { error!("failed to kill scrcpy (device={}, session={}): {}", device_id, name, e); }
            }
        }
        Ok(())
    } else {
        warn!("scrcpy not running for {}", device_id);
        Ok(())
    }
}

pub fn stop_scrcpy_session(device_id: &str, session: &str) -> Result<()> {
    let mut state = SCRCPY_STATE.lock().unwrap();
    if let Some(map) = state.children.get_mut(device_id) {
        if let Some(mut child) = map.remove(session) {
            match child.kill() {
                Ok(_) => { let _ = child.wait(); info!("scrcpy stopped: device={}, session={}", device_id, session); Ok(()) }
                Err(e) => Err(anyhow!("failed to kill scrcpy: {}", e))
            }
        } else {
            warn!("no session {} for device {}", session, device_id);
            Ok(())
        }
    } else {
        warn!("no sessions for device {}", device_id);
        Ok(())
    }
}

pub fn cleanup_all() {
    let mut state = SCRCPY_STATE.lock().unwrap();
    for (device_id, sessions) in state.children.drain() {
        for (name, mut child) in sessions.into_iter() {
            if let Err(e) = child.kill() {
                error!("cleanup kill failed: device={}, session={}, err={}", device_id, name, e);
            }
            let _ = child.wait();
        }
    }
}

#[tauri::command]
pub async fn start_device_mirror(device_id: String, options: Option<serde_json::Value>) -> Result<String, String> {
    // 兼容：如果 options 缺失，使用默认选项
    let opts: ScrcpyOptions = match options {
        Some(v) => serde_json::from_value(v).map_err(|e| format!("invalid options: {}", e))?,
        None => ScrcpyOptions::default(),
    };
    start_scrcpy(&device_id, opts).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_device_mirror(device_id: String) -> Result<(), String> {
    stop_scrcpy(&device_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_device_mirror_session(device_id: String, session_name: String) -> Result<(), String> {
    stop_scrcpy_session(&device_id, &session_name).map_err(|e| e.to_string())
}
