//! ui_snapshot.rs - UI 层快照提供骨架
//! 目标：抽象 UI dump / screenshot / layout capture，后续统一注入

use async_trait::async_trait;

#[derive(Debug, Clone)]
pub struct UiSnapshot {
    pub raw_xml: Option<String>,
    pub screenshot_path: Option<String>,
}

#[async_trait]
pub trait UiSnapshotProvider: Send + Sync {
    async fn capture(&self, device_id: &str) -> anyhow::Result<UiSnapshot>;
}

#[derive(Debug, Default, Clone)]
pub struct NoopSnapshotProvider;

#[async_trait]
impl UiSnapshotProvider for NoopSnapshotProvider {
    async fn capture(&self, _device_id: &str) -> anyhow::Result<UiSnapshot> {
        Ok(UiSnapshot { raw_xml: None, screenshot_path: None })
    }
}
