use std::collections::HashMap;

use anyhow::Result;

use crate::services::adb_session_manager::get_device_session;
use crate::services::smart_script_executor::SmartScriptExecutor;
use serde_json;

pub async fn handle_tap(
    executor: &SmartScriptExecutor,
    step: &crate::services::execution::model::SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("👆 通过ADB Shell会话执行点击测试（带错误处理）".to_string());

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    let x = params["x"].as_i64().unwrap_or(0) as i32;
    let y = params["y"].as_i64().unwrap_or(0) as i32;

    logs.push(format!(
        "📍 点击坐标: ({}, {}) (从 parameters: x={}/y={})",
        x,
        y,
        params
            .get("x")
            .map(|v| v.as_i64().unwrap_or(0))
            .unwrap_or(0),
        params
            .get("y")
            .map(|v| v.as_i64().unwrap_or(0))
            .unwrap_or(0)
    ));

    match executor.execute_click_with_retry(x, y, logs).await {
        Ok(output) => {
            logs.push(format!("📤 命令输出: {}", output.trim()));
            Ok("点击成功".to_string())
        }
        Err(e) => Err(e),
    }
}

pub async fn handle_wait(
    step: &crate::services::execution::model::SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    let _ = step;
    logs.push("执行等待测试".to_string());
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    Ok("等待完成".to_string())
}

pub async fn handle_input(
    executor: &SmartScriptExecutor,
    step: &crate::services::execution::model::SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("通过ADB Shell会话执行输入测试".to_string());

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    let text = params["text"].as_str().unwrap_or("");
    logs.push(format!("输入文本: {}", text));

    let session = get_device_session(executor.device_id()).await?;
    session.input_text(text).await?;
    let output = "OK".to_string();

    logs.push(format!("命令输出: {}", output));
    Ok("输入成功".to_string())
}

pub async fn handle_swipe(
    executor: &SmartScriptExecutor,
    step: &crate::services::execution::model::SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("🔄 滑动操作（增强执行器）".to_string());
    match executor.execute_basic_swipe(step).await {
        Ok((_found_elements, _data)) => {
            logs.push("✅ 滑动执行完成".to_string());
            Ok("滑动成功".to_string())
        }
        Err(e) => {
            let msg = format!("❌ 滑动执行失败: {}", e);
            logs.push(msg.clone());
            Err(e)
        }
    }
}

pub async fn handle_keyevent(
    executor: &SmartScriptExecutor,
    step: &crate::services::execution::model::SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    use serde_json::Value;
    let params: std::collections::HashMap<String, Value> = serde_json::from_value(step.parameters.clone())?;
    let code = params.get("code").and_then(|v| v.as_i64()).unwrap_or(4) as i32; // 默认 BACK
    logs.push(format!("🔑 发送系统按键: code={}", code));

    // 走已有的会话封装（内部已支持注入器优先 + 回退）
    let session = crate::services::adb_session_manager::get_device_session(executor.device_id()).await?;
    session.key_event(code).await?;
    Ok(format!("按键 {} 已发送", code))
}
