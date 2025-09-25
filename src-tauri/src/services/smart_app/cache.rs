use std::collections::HashMap;
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};

use crate::services::smart_app_manager::AppInfo;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub ttl_ms: u64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self { ttl_ms: 5 * 60 * 1000 }
    }
}

#[derive(Debug)]
pub struct AppCache {
    last_refresh: Option<Instant>,
    pub apps_by_package: HashMap<String, AppInfo>,
    config: CacheConfig,
}

impl AppCache {
    pub fn new(config: Option<CacheConfig>) -> Self {
        Self {
            last_refresh: None,
            apps_by_package: HashMap::new(),
            config: config.unwrap_or_default(),
        }
    }

    pub fn is_valid(&self) -> bool {
        if let Some(t) = self.last_refresh {
            t.elapsed() < Duration::from_millis(self.config.ttl_ms)
        } else {
            false
        }
    }

    pub fn set_apps(&mut self, apps: Vec<AppInfo>) {
        self.apps_by_package.clear();
        for app in apps {
            self.apps_by_package.insert(app.package_name.clone(), app);
        }
        self.last_refresh = Some(Instant::now());
    }

    pub fn get_all(&self) -> Vec<AppInfo> {
        self.apps_by_package.values().cloned().collect()
    }

    pub fn search(&self, query: &str) -> Vec<AppInfo> {
        let q = query.to_lowercase();
        self.apps_by_package
            .values()
            .filter(|a| a.app_name.to_lowercase().contains(&q) || a.package_name.to_lowercase().contains(&q))
            .cloned()
            .collect()
    }
}
