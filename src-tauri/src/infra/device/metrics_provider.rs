use anyhow::Result;
use regex::Regex;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::{env};
use tracing::{debug, warn, info};

use crate::application::device_metrics::{DeviceMetrics, DeviceMetricsProvider};

#[allow(dead_code)]
struct CacheEntry {
    metrics: DeviceMetrics,
    at: Instant,
}

pub struct RealDeviceMetricsProvider {
    pub adb_path: String,
    // 简单进程级缓存，减少重复 adb 调用
    cache: Mutex<HashMap<String, CacheEntry>>,
    ttl: Duration,
}

#[allow(dead_code)]
impl RealDeviceMetricsProvider {
    pub fn new(adb_path: String) -> Self {
        // 允许通过环境变量覆盖默认 TTL（秒）
        let ttl_secs = env::var("METRICS_TTL_SECS")
            .ok()
            .and_then(|s| s.parse::<u64>().ok())
            .map(|v| v.clamp(5, 600)) // 安全范围 5s ~ 600s
            .unwrap_or(60);
        let ttl = Duration::from_secs(ttl_secs);
        info!("📐 metrics-cache TTL = {}s (env METRICS_TTL_SECS)", ttl_secs);
        Self { adb_path, cache: Mutex::new(HashMap::new()), ttl }
    }

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
    fn get(&self, serial: &str) -> Option<DeviceMetrics> {
        // 命中缓存且未过期直接返回
        if let Ok(map) = self.cache.lock() {
            if let Some(entry) = map.get(serial) {
                if entry.at.elapsed() < self.ttl {
                    debug!("📐 metrics-cache hit: {} (age={}ms)", serial, entry.at.elapsed().as_millis());
                    return Some(entry.metrics);
                } else {
                    debug!("📐 metrics-cache stale: {} (age={}ms), will refresh", serial, entry.at.elapsed().as_millis());
                }
            }
        }

        // 未命中或过期则获取并写入缓存
        match self.fetch(serial) {
            Ok(m) => {
                if let Ok(mut map) = self.cache.lock() {
                    map.insert(serial.to_string(), CacheEntry { metrics: m, at: Instant::now() });
                }
                Some(m)
            }
            Err(e) => {
                warn!("📐 metrics-fetch failed for {}: {}", serial, e);
                None
            }
        }
    }

    fn put(&mut self, serial: String, metrics: DeviceMetrics) {
        if let Ok(mut map) = self.cache.lock() {
            map.insert(serial, CacheEntry { metrics, at: Instant::now() });
        }
    }
}
