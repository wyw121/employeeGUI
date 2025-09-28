use std::process::{Command, Stdio, Child};
use std::collections::HashMap;
use std::sync::{Mutex, Arc};
use std::io::Read;

use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use tracing::{info, warn, error};
use tauri::Emitter;

#[derive(Default)]
pub struct ScrcpyState {
    // device_id -> (session_name -> child process)
    children: HashMap<String, HashMap<String, Child>>,
}

pub static SCRCPY_STATE: Lazy<Arc<Mutex<ScrcpyState>>> = Lazy::new(|| Arc::new(Mutex::new(ScrcpyState::default())));

fn scrcpy_path() -> String {
    // 1) 环境变量优先
    if let Ok(p) = std::env::var("SCRCPY_PATH") {
        if !p.trim().is_empty() { return p; }
    }
    
    // 2) 尝试多个可能的路径位置
    let possible_paths = [
        // 当前工作目录下的 platform-tools
        #[cfg(windows)]
        ".\\platform-tools\\scrcpy.exe",
        #[cfg(not(windows))]
        "./platform-tools/scrcpy",
        
        // 相对于可执行文件的路径 (Tauri 运行时可能在不同的目录)
        #[cfg(windows)]
        "..\\platform-tools\\scrcpy.exe",
        #[cfg(not(windows))]
        "../platform-tools/scrcpy",
        
        // 尝试从 src-tauri 目录往上找
        #[cfg(windows)]
        "..\\..\\platform-tools\\scrcpy.exe",
        #[cfg(not(windows))]
        "../../platform-tools/scrcpy",
    ];
    
    for path in &possible_paths {
        let p = std::path::Path::new(path);
        if p.exists() {
            info!("找到 scrcpy 路径: {}", path);
            return p.canonicalize()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| path.to_string());
        }
    }
    
    // 3) 检查应用资源目录（Tauri 打包后的位置）
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            #[cfg(windows)]
            let resource_path = exe_dir.join("platform-tools").join("scrcpy.exe");
            #[cfg(not(windows))]
            let resource_path = exe_dir.join("platform-tools").join("scrcpy");
            
            if resource_path.exists() {
                info!("找到应用资源中的 scrcpy: {:?}", resource_path);
                return resource_path.to_string_lossy().to_string();
            }
        }
    }
    
    // 4) 默认依赖 PATH
    warn!("未找到本地 scrcpy，依赖系统 PATH");
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
    pub always_on_top: Option<bool>, // --always-on-top
    pub borderless: Option<bool>,    // --window-borderless
}

#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrcpyCapabilities {
    pub always_on_top: bool,
    pub window_borderless: bool,
    pub max_fps: bool,
    pub bit_rate: bool,
    pub max_size: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionEventPayload<'a> {
    device_id: &'a str,
    session_name: &'a str,
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
            args.push("--video-bit-rate".into());
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

    // 窗口标志
    if opts.always_on_top.unwrap_or(false) {
        args.push("--always-on-top".into());
    }
    if opts.borderless.unwrap_or(false) {
        args.push("--window-borderless".into());
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

fn get_scrcpy_version() -> Result<String> {
    let exe = scrcpy_path();
    let output = Command::new(&exe)
        .arg("--version")
        .output()
        .map_err(|e| anyhow!("scrcpy not found or not executable: {}", e))?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout.trim().to_string())
    } else {
        Err(anyhow!("scrcpy exists but --version returned non-zero"))
    }
}

fn get_scrcpy_help() -> Result<String> {
    let exe = scrcpy_path();
    let output = Command::new(&exe)
        .arg("--help")
        .output()
        .map_err(|e| anyhow!("scrcpy not found or not executable: {}", e))?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    } else {
        Err(anyhow!("scrcpy exists but --help returned non-zero"))
    }
}

fn parse_capabilities(help_text: &str) -> ScrcpyCapabilities {
    let ht = help_text.to_lowercase();
    ScrcpyCapabilities {
        always_on_top: ht.contains("--always-on-top"),
        window_borderless: ht.contains("--window-borderless"),
        max_fps: ht.contains("--max-fps"),
        bit_rate: ht.contains("--bit-rate"),
        max_size: ht.contains("--max-size"),
    }
}

pub fn start_scrcpy(device_id: &str, opts: ScrcpyOptions) -> Result<String> {
    ensure_scrcpy_available()?;
    let mut state = SCRCPY_STATE.lock().unwrap();
    let session = opts.session_name.clone().unwrap_or_else(|| "default".to_string());

    let exe = scrcpy_path();
    let args = build_args(device_id, &opts);
    info!("launching scrcpy: {} {:?} (device={}, session={})", exe, args, device_id, session);

    // 先尝试启动并捕获错误信息
    let mut cmd = Command::new(&exe);
    cmd.args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let child = match cmd.spawn() {
        Ok(mut child) => {
            // 给进程一点时间启动，然后检查是否仍在运行
            std::thread::sleep(std::time::Duration::from_millis(500));
            match child.try_wait() {
                Ok(Some(status)) => {
                    // 进程已经退出，读取错误信息
                    let mut stderr = String::new();
                    let mut stdout = String::new();
                    if let Some(mut stderr_pipe) = child.stderr.take() {
                        let _ = std::io::Read::read_to_string(&mut stderr_pipe, &mut stderr);
                    }
                    if let Some(mut stdout_pipe) = child.stdout.take() {
                        let _ = std::io::Read::read_to_string(&mut stdout_pipe, &mut stdout);
                    }
                    error!("scrcpy 进程启动后立即退出，状态码: {}", status);
                    error!("scrcpy stderr: {}", stderr);
                    error!("scrcpy stdout: {}", stdout);
                    return Err(anyhow!("scrcpy 启动失败，退出状态: {}. stderr: {}, stdout: {}", status, stderr, stdout));
                }
                Ok(None) => {
                    // 进程仍在运行，这是正常情况
                    info!("scrcpy 进程启动成功，PID: {:?}", child.id());
                    child
                }
                Err(e) => {
                    error!("检查 scrcpy 进程状态失败: {}", e);
                    return Err(anyhow!("无法检查 scrcpy 进程状态: {}", e));
                }
            }
        }
        Err(e) => {
            error!("启动 scrcpy 失败: {}", e);
            return Err(anyhow!("failed to start scrcpy: {}", e));
        }
    };

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
pub async fn list_device_mirror_sessions(device_id: String) -> Result<Vec<String>, String> {
    let state = SCRCPY_STATE.lock().unwrap();
    if let Some(map) = state.children.get(&device_id) {
        Ok(map.keys().cloned().collect())
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn check_scrcpy_available() -> Result<String, String> {
    match get_scrcpy_version() {
        Ok(v) => Ok(v),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn get_scrcpy_capabilities() -> Result<ScrcpyCapabilities, String> {
    match get_scrcpy_help() {
        Ok(help) => Ok(parse_capabilities(&help)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn start_device_mirror(app: tauri::AppHandle, device_id: String, options: Option<ScrcpyOptions>) -> Result<String, String> {
    // reuse existing logic via internal function
    match start_device_mirror_inner(&app, &device_id, options).await {
        Ok(sess) => Ok(sess),
        Err(e) => {
            let _ = app.emit(
                "scrcpy://session-error",
                serde_json::json!({"deviceId": device_id, "error": e.to_string()}),
            );
            Err(e.to_string())
        }
    }
}

async fn start_device_mirror_inner(app: &tauri::AppHandle, device_id: &str, options: Option<ScrcpyOptions>) -> Result<String> {
    // 规范化选项与会话名
    let opts = options.unwrap_or_default();
    let session_name = opts
        .session_name
        .clone()
        .unwrap_or_else(|| "default".to_string());

    // 确认 scrcpy 可用
    ensure_scrcpy_available()?;

    // 构建命令参数并启动进程
    let exe = scrcpy_path();
    let args = build_args(device_id, &opts);
    info!("launching scrcpy: {} {:?} (device={}, session={})", exe, args, device_id, session_name);

    let child = Command::new(&exe)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| anyhow!("failed to start scrcpy: {}", e))?;

    // 记录会话，若同名会话存在则替换
    {
        let mut state = SCRCPY_STATE.lock().unwrap();
        let entry = state.children.entry(device_id.to_string()).or_insert_with(HashMap::new);
        if let Some(mut old) = entry.remove(&session_name) {
            let _ = old.kill();
            let _ = old.wait();
        }
        entry.insert(session_name.clone(), child);
    }

    // 事件：会话已启动
    let _ = app.emit(
        "scrcpy://session-started",
        serde_json::json!({"deviceId": device_id, "sessionName": session_name}),
    );
    Ok(session_name)
}

#[tauri::command]
pub async fn stop_device_mirror(app: tauri::AppHandle, device_id: String) -> Result<(), String> {
    let stopped_names: Vec<String> = {
        let mut state = SCRCPY_STATE.lock().unwrap();
        if let Some(mut sessions) = state.children.remove(&device_id) {
            let mut names: Vec<String> = Vec::with_capacity(sessions.len());
            for (name, mut child) in sessions.drain() {
                match child.kill() {
                    Ok(_) => { let _ = child.wait(); info!("scrcpy stopped: device={}, session={}", device_id, name); }
                    Err(e) => { error!("failed to kill scrcpy (device={}, session={}): {}", device_id, name, e); }
                }
                names.push(name);
            }
            names
        } else {
            Vec::new()
        }
    };

    for name in stopped_names {
        let _ = app.emit(
            "scrcpy://session-stopped",
            serde_json::json!({"deviceId": device_id, "sessionName": name}),
        );
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_device_mirror_session(app: tauri::AppHandle, device_id: String, session_name: String) -> Result<(), String> {
    let existed = {
        let mut state = SCRCPY_STATE.lock().unwrap();
        if let Some(map) = state.children.get_mut(&device_id) {
            if let Some(mut child) = map.remove(&session_name) {
                match child.kill() {
                    Ok(_) => { let _ = child.wait(); info!("scrcpy stopped: device={}, session={}", device_id, session_name); }
                    Err(e) => { error!("failed to kill scrcpy (device={}, session={}): {}", device_id, session_name, e); }
                }
                true
            } else { false }
        } else { false }
    };
    if existed {
        let _ = app.emit(
            "scrcpy://session-stopped",
            serde_json::json!({"deviceId": device_id, "sessionName": session_name}),
        );
    }
    Ok(())
}
