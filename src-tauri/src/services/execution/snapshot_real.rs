//! snapshot_real.rs - RealSnapshotProvider 骨架
//! 说明：演示如何基于现有 session 抓取 XML 与（未来）截图，暂时仅抓取 XML。

use async_trait::async_trait;
use crate::services::execution::{UiSnapshotProvider, UiSnapshot};
use crate::services::adb_session_manager::get_device_session;

#[derive(Debug, Default, Clone)]
pub struct RealSnapshotProvider;

#[async_trait]
impl UiSnapshotProvider for RealSnapshotProvider {
    async fn capture(&self, device_id: &str) -> anyhow::Result<UiSnapshot> {
        // 抓取 XML（与 execute_ui_dump_with_retry 逻辑不同步，只做一次）
        let session = match get_device_session(device_id).await {
            Ok(s) => s,
            Err(_) => {
                // 离线或 session 获取失败：回退为空快照而不是报错
                return Ok(UiSnapshot { raw_xml: None, screenshot_path: None });
            }
        };
        let xml = session.execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml").await.unwrap_or_default();
        Ok(UiSnapshot { raw_xml: Some(xml), screenshot_path: None })
    }
}
