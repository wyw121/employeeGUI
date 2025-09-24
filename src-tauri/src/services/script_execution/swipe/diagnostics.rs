use anyhow::Result;
use std::time::{Duration, Instant};
use tracing::{info, warn, error};

/// 滑动诊断工具
#[derive(Debug, Clone)]
pub struct SwipeDiagnostics {
    pub device_id: String,
    pub adb_path: String,
}

impl SwipeDiagnostics {
    pub fn new(device_id: String, adb_path: String) -> Self {
        Self { device_id, adb_path }
    }

    /// 执行滑动前的诊断检查
    pub async fn pre_swipe_diagnostics(&self) -> Result<PreSwipeState> {
        let start_time = Instant::now();
        
        info!("🔍 开始滑动前诊断检查...");
        
        // 检查设备连接状态
        let device_connected = self.check_device_connection().await?;
        if !device_connected {
            error!("❌ 设备连接异常: {}", self.device_id);
            return Err(anyhow::anyhow!("设备未连接"));
        }
        
        // 获取当前UI状态
        let ui_snapshot = self.capture_ui_snapshot().await?;
        
        // 检查屏幕是否可操作
        let screen_interactive = self.check_screen_interactive().await?;
        
        let elapsed = start_time.elapsed();
        info!("✅ 滑动前诊断完成 (耗时: {}ms)", elapsed.as_millis());
        
        Ok(PreSwipeState {
            device_connected,
            ui_snapshot,
            screen_interactive,
            timestamp: Instant::now(),
        })
    }

    /// 执行滑动后的验证检查
    pub async fn post_swipe_validation(&self, pre_state: &PreSwipeState, 
                                     expected_change: SwipeExpectedChange) -> Result<SwipeValidationResult> {
        let start_time = Instant::now();
        
        info!("🔍 开始滑动后验证检查...");
        
        // 等待UI稳定
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        // 获取滑动后的UI状态
        let post_ui_snapshot = self.capture_ui_snapshot().await?;
        
        // 比较UI变化
        let ui_changed = self.detect_ui_changes(&pre_state.ui_snapshot, &post_ui_snapshot);
        
        let elapsed = start_time.elapsed();
        let validation_result = SwipeValidationResult {
            ui_changed,
            expected_change_detected: self.validate_expected_change(&expected_change, &post_ui_snapshot),
            pre_swipe_hash: pre_state.ui_snapshot.hash.clone(),
            post_swipe_hash: post_ui_snapshot.hash.clone(),
            validation_duration: elapsed,
        };
        
        if validation_result.ui_changed {
            info!("✅ 滑动验证成功: UI已发生变化 (耗时: {}ms)", elapsed.as_millis());
        } else {
            warn!("⚠️ 滑动可能无效: UI未发生明显变化 (耗时: {}ms)", elapsed.as_millis());
        }
        
        Ok(validation_result)
    }

    /// 检查设备连接状态
    async fn check_device_connection(&self) -> Result<bool> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.args(&["-s", &self.device_id, "get-state"]);
        
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }
        
        let output = tokio::task::spawn_blocking(move || cmd.output()).await??;
        
        let state = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(state == "device")
    }

    /// 捕获UI快照
    async fn capture_ui_snapshot(&self) -> Result<UISnapshot> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.args(&["-s", &self.device_id, "shell", "dumpsys", "window", "displays"]);
        
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }
        
        let output = tokio::task::spawn_blocking(move || cmd.output()).await??;
        
        if !output.status.success() {
            warn!("⚠️ 无法获取UI快照，使用空快照");
            return Ok(UISnapshot {
                hash: "empty".to_string(),
                timestamp: Instant::now(),
            });
        }
        
        let content = String::from_utf8_lossy(&output.stdout);
        let hash = format!("{:x}", md5::compute(content.as_bytes()));
        
        Ok(UISnapshot {
            hash,
            timestamp: Instant::now(),
        })
    }

    /// 检查屏幕是否可交互
    async fn check_screen_interactive(&self) -> Result<bool> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.args(&["-s", &self.device_id, "shell", "dumpsys", "power"]);
        
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }
        
        let output = tokio::task::spawn_blocking(move || cmd.output()).await??;
        
        if !output.status.success() {
            warn!("⚠️ 无法检查电源状态，假设屏幕可交互");
            return Ok(true);
        }
        
        let content = String::from_utf8_lossy(&output.stdout);
        let screen_on = content.contains("mWakefulness=Awake") || content.contains("Display Power: state=ON");
        
        Ok(screen_on)
    }

    /// 检测UI变化
    fn detect_ui_changes(&self, pre_snapshot: &UISnapshot, post_snapshot: &UISnapshot) -> bool {
        pre_snapshot.hash != post_snapshot.hash
    }

    /// 验证期望的变化
    fn validate_expected_change(&self, _expected: &SwipeExpectedChange, _post_snapshot: &UISnapshot) -> bool {
        // 这里可以根据具体需求实现更详细的验证逻辑
        // 目前简单返回true
        true
    }
}

/// 滑动前状态
#[derive(Debug, Clone)]
pub struct PreSwipeState {
    pub device_connected: bool,
    pub ui_snapshot: UISnapshot,
    pub screen_interactive: bool,
    pub timestamp: Instant,
}

/// UI快照
#[derive(Debug, Clone)]
pub struct UISnapshot {
    pub hash: String,
    pub timestamp: Instant,
}

/// 滑动期望变化
#[derive(Debug, Clone)]
pub enum SwipeExpectedChange {
    ScrollDown,
    ScrollUp,
    PageTransition,
    ElementVisibilityChange,
    Other(String),
}

/// 滑动验证结果
#[derive(Debug, Clone)]
pub struct SwipeValidationResult {
    pub ui_changed: bool,
    pub expected_change_detected: bool,
    pub pre_swipe_hash: String,
    pub post_swipe_hash: String,
    pub validation_duration: Duration,
}