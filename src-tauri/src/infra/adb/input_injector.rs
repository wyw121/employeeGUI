use anyhow::Result;

#[allow(dead_code)]
#[async_trait::async_trait]
pub trait InputInjector: Send + Sync {
    async fn tap(&self, serial: &str, x: u32, y: u32, duration_ms: Option<u32>) -> Result<()>;
    async fn swipe(&self, serial: &str, x1: u32, y1: u32, x2: u32, y2: u32, duration_ms: u32) -> Result<()>;
    async fn keyevent(&self, serial: &str, code: i32) -> Result<()>;
    async fn keyevent_symbolic(&self, serial: &str, code: &str) -> Result<()>;
    async fn input_text(&self, serial: &str, text: &str) -> Result<()>;
}

/// Basic ADB shell based injector (skeleton). Not wired yet.
#[allow(dead_code)]
pub struct AdbShellInputInjector {
    pub adb_path: String,
}

#[allow(dead_code)]
impl AdbShellInputInjector {
    pub fn new(adb_path: String) -> Self { Self { adb_path } }
}

#[async_trait::async_trait]
impl InputInjector for AdbShellInputInjector {
    async fn tap(&self, serial: &str, x: u32, y: u32, duration_ms: Option<u32>) -> Result<()> {
        // For long press, fallback to swipe with same start/end and duration
        if let Some(d) = duration_ms {
            return self.swipe(serial, x, y, x, y, d).await;
        }
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.arg("-s").arg(serial).arg("shell").arg("input").arg("tap")
            .arg(x.to_string()).arg(y.to_string());
        #[cfg(windows)]
        { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
        let out = tokio::task::spawn_blocking(move || cmd.output()).await??;
        if !out.status.success() { anyhow::bail!(String::from_utf8_lossy(&out.stderr).to_string()); }
        Ok(())
    }

    async fn swipe(&self, serial: &str, x1: u32, y1: u32, x2: u32, y2: u32, duration_ms: u32) -> Result<()> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.arg("-s").arg(serial).arg("shell").arg("input").arg("swipe")
            .arg(x1.to_string()).arg(y1.to_string()).arg(x2.to_string()).arg(y2.to_string()).arg(duration_ms.to_string());
        #[cfg(windows)]
        { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
        let out = tokio::task::spawn_blocking(move || cmd.output()).await??;
        if !out.status.success() { anyhow::bail!(String::from_utf8_lossy(&out.stderr).to_string()); }
        Ok(())
    }

    async fn keyevent(&self, serial: &str, code: i32) -> Result<()> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.arg("-s").arg(serial).arg("shell").arg("input").arg("keyevent").arg(code.to_string());
        #[cfg(windows)]
        { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
        let out = tokio::task::spawn_blocking(move || cmd.output()).await??;
        if !out.status.success() { anyhow::bail!(String::from_utf8_lossy(&out.stderr).to_string()); }
        Ok(())
    }

    async fn keyevent_symbolic(&self, serial: &str, code: &str) -> Result<()> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.arg("-s").arg(serial).arg("shell").arg("input").arg("keyevent").arg(code);
        #[cfg(windows)]
        { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
        let out = tokio::task::spawn_blocking(move || cmd.output()).await??;
        if !out.status.success() { anyhow::bail!(String::from_utf8_lossy(&out.stderr).to_string()); }
        Ok(())
    }

    async fn input_text(&self, serial: &str, text: &str) -> Result<()> {
        // Simple fallback: `input text` (IME strategy can be added later)
        // Escape spaces as %s to improve reliability
        let escaped = text.replace(' ', "%s");
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.arg("-s").arg(serial).arg("shell").arg("input").arg("text").arg(escaped);
        #[cfg(windows)]
        { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
        let out = tokio::task::spawn_blocking(move || cmd.output()).await??;
        if !out.status.success() { anyhow::bail!(String::from_utf8_lossy(&out.stderr).to_string()); }
        Ok(())
    }
}
