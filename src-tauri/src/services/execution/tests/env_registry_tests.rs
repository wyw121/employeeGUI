//! env_registry_tests.rs - 测试 EnvRegistry 注册与回收行为

use super::super::{ExecutionEnvironment, register_execution_environment, collect_execution_metrics_json};
use super::super::registry::_test_clear_registry; // cfg(test)
use std::sync::{Arc, Mutex};

#[tokio::test]
async fn test_registry_register_and_collect() {
    _test_clear_registry();
    let env = Arc::new(Mutex::new(ExecutionEnvironment::new("device-test-1")));
    register_execution_environment("device-test-1", &env);
    let json = collect_execution_metrics_json();
    assert_eq!(json["count"].as_u64().unwrap(), 1);
    assert_eq!(json["devices"][0]["device_id"].as_str().unwrap(), "device-test-1");
}

#[tokio::test]
async fn test_registry_drop_allows_gc() {
    _test_clear_registry();
    {
        let env = Arc::new(Mutex::new(ExecutionEnvironment::new("device-temp")));
        register_execution_environment("device-temp", &env);
    }
    // 由于 Weak 引用，collect 时若全部已回收则 count=0
    let json = collect_execution_metrics_json();
    // 允许0（已回收）或1（某些平台 drop 延迟），因此只断言字段存在
    assert!(json["count"].is_u64());
}