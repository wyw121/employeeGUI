use anyhow::Result;
use regex::Regex;

use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider};

#[allow(dead_code)]
pub struct RealDeviceMetricsProvider {
    pub adb_path: String,
}

#[allow(dead_code)]
impl RealDeviceMetricsProvider {
    pub fn new(adb_path: String) -> Self { Self { adb_path } }

    pub fn fetch(&self, serial: &str) -> Result<DeviceMetrics> {
        let size_out = self.exec(serial, &["shell", "wm", "size"])?.trim().to_string();
        let dens_out = self.exec(serial, &["shell", "wm", "density"])?.trim().to_string();

        let (w, h) = parse_size(&size_out).unwrap_or((1080, 1920));
        let density = parse_density(&dens_out);
        Ok(DeviceMetrics { width_px: w, height_px: h, density, rotation: None })
    }

    fn exec(&self, serial: &str, args: &[&str]) -> Result<String> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.arg("-s").arg(serial);
        for a in args { cmd.arg(a); }
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }
        let out = cmd.output()?;
        if !out.status.success() { anyhow::bail!(String::from_utf8_lossy(&out.stderr).to_string()); }
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    }
}

fn parse_size(s: &str) -> Option<(u32, u32)> {
    // Example: Physical size: 1080x1920
    let re = Regex::new(r"(\d+)x(\d+)").ok()?;
    let cap = re.captures(s)?;
    let w = cap.get(1)?.as_str().parse().ok()?;
    let h = cap.get(2)?.as_str().parse().ok()?;
    Some((w, h))
}

fn parse_density(s: &str) -> Option<f32> {
    // Example: Physical density: 480
    let re = Regex::new(r"(\d+(?:\.\d+)?)").ok()?;
    let cap = re.captures(s)?;
    cap.get(1)?.as_str().parse().ok()
}

impl DeviceMetricsProvider for RealDeviceMetricsProvider {
    fn get(&self, serial: &str) -> Option<DeviceMetrics> { self.fetch(serial).ok() }
    fn put(&mut self, _serial: String, _metrics: DeviceMetrics) { /* fetch-on-demand; no-op */ }
}
