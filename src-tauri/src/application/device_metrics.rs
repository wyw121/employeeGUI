use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
pub struct DeviceMetrics {
	pub width_px: u32,
	pub height_px: u32,
	pub density: Option<f32>,
	pub rotation: Option<u8>,
}

impl DeviceMetrics {
	pub fn new(width_px: u32, height_px: u32) -> Self {
		Self { width_px, height_px, density: None, rotation: None }
	}
}

#[allow(dead_code)]
pub trait DeviceMetricsProvider: Send + Sync {
	fn get(&self, serial: &str) -> Option<DeviceMetrics>;
	fn put(&mut self, serial: String, metrics: DeviceMetrics);
}

#[allow(dead_code)]
pub struct StubDeviceMetricsProvider {
	cache: HashMap<String, DeviceMetrics>,
	default_metrics: DeviceMetrics,
}

impl StubDeviceMetricsProvider {
	pub fn new() -> Self { Self { cache: HashMap::new(), default_metrics: DeviceMetrics::new(1080, 1920) } }
}

impl DeviceMetricsProvider for StubDeviceMetricsProvider {
	fn get(&self, serial: &str) -> Option<DeviceMetrics> {
		self.cache.get(serial).copied().or(Some(self.default_metrics))
	}

	fn put(&mut self, serial: String, metrics: DeviceMetrics) {
		self.cache.insert(serial, metrics);
	}
}

