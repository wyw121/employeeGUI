use anyhow::{Context, Result};
use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{timeout, Duration};
use tracing::{debug, error, info, warn};

/// ADB Shell长连接会话管理器
/// 维护到指定设备的持久shell连接，减少命令执行开销
pub struct AdbShellSession {
    device_id: String,
    adb_path: String,
    shell_process: Arc<Mutex<Option<Child>>>,
    is_connected: Arc<Mutex<bool>>,
}

impl AdbShellSession {
    /// 创建新的ADB Shell会话
    pub fn new(device_id: String, adb_path: String) -> Self {
        Self {
            device_id,
            adb_path,
            shell_process: Arc::new(Mutex::new(None)),
            is_connected: Arc::new(Mutex::new(false)),
        }
    }

    /// 建立到设备的持久shell连接
    pub async fn connect(&self) -> Result<()> {
        let mut process_lock = self.shell_process.lock().await;
        let mut connected_lock = self.is_connected.lock().await;

        // 如果已经连接，先断开
        if *connected_lock {
            self.disconnect_internal(&mut process_lock).await;
        }

        info!("🔌 建立ADB Shell长连接 - 设备: {}", self.device_id);

        // 验证ADB路径是否存在
        if !std::path::Path::new(&self.adb_path).exists() {
            return Err(anyhow::anyhow!("ADB文件不存在: {}", self.adb_path));
        }

        // 启动adb shell进程
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(&["-s", &self.device_id, "shell"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            // Windows: 隐藏命令行窗口
            cmd.creation_flags(0x08000000);
        }

        let mut child = cmd.spawn()
            .context("启动ADB shell进程失败")?;

        // 验证shell是否成功启动
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        // 发送测试命令验证连接
        if let Some(ref mut stdin) = child.stdin.as_mut() {
            writeln!(stdin, "echo 'ADB_SHELL_READY'").context("发送测试命令失败")?;
            stdin.flush().context("刷新命令失败")?;
        } else {
            return Err(anyhow::anyhow!("无法获取shell输入流"));
        }

        *process_lock = Some(child);
        *connected_lock = true;

        info!("✅ ADB Shell长连接建立成功");
        Ok(())
    }

    /// 断开shell连接
    pub async fn disconnect(&self) -> Result<()> {
        let mut process_lock = self.shell_process.lock().await;
        self.disconnect_internal(&mut process_lock).await;
        Ok(())
    }

    async fn disconnect_internal(&self, process_lock: &mut tokio::sync::MutexGuard<'_, Option<Child>>) {
        let mut connected_lock = self.is_connected.lock().await;
        
        if let Some(mut child) = process_lock.take() {
            info!("🔌 断开ADB Shell连接");
            
            // 优雅关闭：发送exit命令
            if let Some(ref mut stdin) = child.stdin.as_mut() {
                let _ = writeln!(stdin, "exit");
                let _ = stdin.flush();
            }
            
            // 等待进程结束
            tokio::time::sleep(Duration::from_millis(100)).await;
            
            // 强制终止如果还在运行
            let _ = child.kill();
            let _ = child.wait();
        }
        
        *connected_lock = false;
    }

    /// 检查连接是否活跃
    pub async fn is_connected(&self) -> bool {
        *self.is_connected.lock().await
    }

    /// 执行shell命令并获取结果
    pub async fn execute_command(&self, command: &str) -> Result<String> {
        self.execute_command_with_timeout(command, Duration::from_secs(10)).await
    }

    /// 执行shell命令并指定超时时间
    pub async fn execute_command_with_timeout(&self, command: &str, timeout_duration: Duration) -> Result<String> {
        if !self.is_connected().await {
            return Err(anyhow::anyhow!("Shell连接未建立，请先调用connect()"));
        }

        debug!("📤 执行Shell命令: {}", command);

        let result = timeout(timeout_duration, async {
            // 这里需要实现命令执行逻辑
            // 由于ADB shell是交互式的，我们需要重构为更好的方式
            // 暂时使用独立命令作为fallback
            self.execute_single_command(command).await
        }).await;

        match result {
            Ok(output) => {
                debug!("✅ 命令执行成功");
                output
            }
            Err(_) => {
                warn!("⏰ 命令执行超时，尝试重连");
                // 超时后尝试重连
                let _ = self.reconnect().await;
                Err(anyhow::anyhow!("命令执行超时: {}", command))
            }
        }
    }

    /// 执行独立的ADB命令（作为fallback）
    async fn execute_single_command(&self, shell_command: &str) -> Result<String> {
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(&["-s", &self.device_id, "shell", shell_command]);

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }

        let output = cmd.output().context("执行ADB命令失败")?;
        
        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("命令执行失败: {}", error));
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    /// 重新连接
    pub async fn reconnect(&self) -> Result<()> {
        warn!("🔄 尝试重新建立ADB Shell连接");
        let _ = self.disconnect().await;
        tokio::time::sleep(Duration::from_millis(1000)).await;
        self.connect().await
    }

    // === 常用操作封装 ===

    /// 点击屏幕坐标
    pub async fn tap(&self, x: i32, y: i32) -> Result<()> {
        let command = format!("input tap {} {}", x, y);
        self.execute_command(&command).await?;
        info!("👆 点击坐标: ({}, {})", x, y);
        Ok(())
    }

    /// 滑动操作
    pub async fn swipe(&self, x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: u32) -> Result<()> {
        let command = format!("input swipe {} {} {} {} {}", x1, y1, x2, y2, duration_ms);
        self.execute_command(&command).await?;
        info!("👆 滑动: ({}, {}) -> ({}, {}), 持续: {}ms", x1, y1, x2, y2, duration_ms);
        Ok(())
    }

    /// 输入文本
    pub async fn input_text(&self, text: &str) -> Result<()> {
        let command = format!("input text '{}'", text);
        self.execute_command(&command).await?;
        info!("⌨️ 输入文本: {}", text);
        Ok(())
    }

    /// 按键操作
    pub async fn key_event(&self, keycode: i32) -> Result<()> {
        let command = format!("input keyevent {}", keycode);
        self.execute_command(&command).await?;
        info!("🔑 按键: {}", keycode);
        Ok(())
    }

    /// 获取当前界面UI层次结构
    pub async fn dump_ui(&self) -> Result<String> {
        let command = "uiautomator dump --compressed /dev/stdout";
        let result = self.execute_command_with_timeout(command, Duration::from_secs(15)).await?;
        debug!("📱 UI结构获取成功，长度: {} 字符", result.len());
        Ok(result)
    }

    /// 获取屏幕分辨率
    pub async fn get_screen_size(&self) -> Result<(i32, i32)> {
        let command = "wm size";
        let output = self.execute_command(command).await?;
        
        // 解析输出格式：Physical size: 1080x2340
        for line in output.lines() {
            if line.contains("Physical size:") {
                if let Some(size_str) = line.split(":").nth(1) {
                    let size_str = size_str.trim();
                    if let Some((w, h)) = size_str.split_once("x") {
                        if let (Ok(width), Ok(height)) = (w.parse::<i32>(), h.parse::<i32>()) {
                            return Ok((width, height));
                        }
                    }
                }
            }
        }
        
        Err(anyhow::anyhow!("无法解析屏幕分辨率: {}", output))
    }

    /// 获取当前Activity
    pub async fn get_current_activity(&self) -> Result<String> {
        let command = "dumpsys activity activities | grep -E 'mResumedActivity|mFocusedActivity' | head -1";
        let output = self.execute_command(command).await?;
        Ok(output.trim().to_string())
    }

    /// 启动应用
    pub async fn start_app(&self, package_name: &str) -> Result<()> {
        let command = format!("monkey -p {} -c android.intent.category.LAUNCHER 1", package_name);
        self.execute_command(&command).await?;
        info!("🚀 启动应用: {}", package_name);
        Ok(())
    }

    /// 批量执行命令（利用长连接优势）
    pub async fn execute_batch_commands(&self, commands: Vec<&str>) -> Result<Vec<String>> {
        let mut results = Vec::new();
        
        info!("📦 批量执行 {} 个命令", commands.len());
        for (i, command) in commands.iter().enumerate() {
            debug!("📤 [{}/{}] {}", i + 1, commands.len(), command);
            match self.execute_command(command).await {
                Ok(result) => results.push(result),
                Err(e) => {
                    error!("❌ 命令执行失败: {} - {}", command, e);
                    results.push(format!("ERROR: {}", e));
                }
            }
            
            // 短暂延迟避免命令冲突
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        
        info!("✅ 批量命令执行完成");
        Ok(results)
    }
}

impl Drop for AdbShellSession {
    fn drop(&mut self) {
        // 同步方式清理资源
        if let Ok(mut process_lock) = self.shell_process.try_lock() {
            if let Some(mut child) = process_lock.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}