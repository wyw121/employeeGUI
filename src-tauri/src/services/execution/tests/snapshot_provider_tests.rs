//! snapshot_provider_tests.rs - 测试 RealSnapshotProvider 离线回退

use super::super::RealSnapshotProvider;

#[tokio::test]
async fn test_real_snapshot_provider_offline_returns_empty() {
    // 使用一个极可能不存在的设备ID
    let provider = RealSnapshotProvider::default();
    let snap = provider.capture("__nonexistent_device_id__").await.expect("should not error");
    assert!(snap.raw_xml.is_none() || snap.raw_xml.as_ref().unwrap().is_empty());
}
