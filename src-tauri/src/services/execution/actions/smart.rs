use std::collections::HashMap;

use anyhow::{anyhow, Result};

use crate::services::adb_session_manager::get_device_session;
use crate::services::execution::matching::{find_all_follow_buttons, find_element_in_ui};
use crate::services::execution::matching::enhanced_unified::run_enhanced_unified_match;
use crate::services::execution::model::SmartScriptStep;
use crate::services::execution::run_unified_match;
use crate::services::smart_script_executor::SmartScriptExecutor;
use serde_json;

pub async fn handle_smart_tap(
    executor: &SmartScriptExecutor,
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("执行智能点击测试".to_string());

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    if let Some(package_name) = params.get("package_name").and_then(|v| v.as_str()) {
        logs.push(format!("启动应用: {}", package_name));

        let session = get_device_session(executor.device_id()).await?;
        let command = format!(
            "am start -n {}/com.xingin.xhs.activity.SplashActivity",
            package_name
        );
        let output = session.execute_command(&command).await?;

        logs.push(format!("启动命令输出: {}", output));
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

        Ok("应用启动成功".to_string())
    } else {
        let x = params["x"].as_i64().unwrap_or(0) as i32;
        let y = params["y"].as_i64().unwrap_or(0) as i32;

        logs.push(format!(
            "智能点击坐标: ({}, {}) (从 parameters: x={}/y={})",
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

        let session = get_device_session(executor.device_id()).await?;
        session.tap(x, y).await?;
        logs.push("命令输出: OK".to_string());
        Ok("智能点击成功".to_string())
    }
}

pub async fn handle_unified_match(
    executor: &SmartScriptExecutor,
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("🎯 [增强版] 进入 handle_unified_match".to_string());
    logs.push(format!("🎯 [增强版] 步骤参数: {:?}", step.parameters));
    
    // 优先使用增强版本的匹配引擎
    let result = run_enhanced_unified_match(executor, executor.device_id(), step, logs).await;
    
    logs.push(format!("🎯 [增强版] run_enhanced_unified_match 返回结果: {:?}", result));
    result
}

pub async fn handle_batch_match(
    executor: &SmartScriptExecutor,
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("🚀 执行批量匹配操作（动态元素查找）".to_string());

    let ui_dump = executor.execute_ui_dump_with_retry(logs).await?;

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    logs.push("🎯 批量匹配查找参数:".to_string());
    logs.push(format!("📋 参数详情: {:?}", params));

    let element_text = params
        .get("element_text")
        .or_else(|| params.get("text"))
        .or_else(|| params.get("target_text"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let final_element_text = if element_text.is_empty() {
        if step.name.contains("关注") || step.description.contains("关注") {
            logs.push("🔍 从步骤名称/描述中推断出这是批量关注操作".to_string());
            "关注"
        } else {
            logs.push("❌ 批量匹配失败: 没有提供元素文本且无法从步骤名称推断".to_string());
            return Err(anyhow::anyhow!("批量匹配需要元素文本"));
        }
    } else {
        element_text
    };

    logs.push(format!("  📝 目标元素文本: '{}'", final_element_text));

    let element_coords = find_element_in_ui(&ui_dump, final_element_text, logs).await?;

    if let Some((x, y)) = element_coords {
        logs.push(format!("🎯 动态找到元素坐标: ({}, {})", x, y));

        if (x, y) == (540, 960) {
            logs.push("⚠️  检测到可疑的硬编码坐标 (540, 960)，这可能是错误的".to_string());
            logs.push("🔄 重新尝试查找关注按钮...".to_string());
            if let Some(correct_coords) = find_all_follow_buttons(&ui_dump, logs).await? {
                logs.push(format!(
                    "✅ 重新找到正确的关注按钮坐标: ({}, {})",
                    correct_coords.0, correct_coords.1
                ));
                let click_result = executor
                    .execute_click_with_retry(correct_coords.0, correct_coords.1, logs)
                    .await;
                match click_result {
                    Ok(output) => {
                        logs.push(format!("✅ 点击命令输出: {}", output));
                        return Ok(format!(
                            "✅ 批量匹配成功: 重新找到并点击关注按钮 -> 坐标({}, {})",
                            correct_coords.0, correct_coords.1
                        ));
                    }
                    Err(e) => {
                        logs.push(format!("❌ 点击操作失败: {}", e));
                        return Err(e);
                    }
                }
            }
        }

        let click_result = executor.execute_click_with_retry(x, y, logs).await;

        match click_result {
            Ok(output) => {
                logs.push(format!("✅ 点击命令输出: {}", output));
                Ok(format!(
                    "✅ 批量匹配成功: 动态找到并点击元素'{}' -> 坐标({}, {})",
                    final_element_text, x, y
                ))
            }
            Err(e) => {
                logs.push(format!("❌ 点击操作失败: {}", e));
                Err(e)
            }
        }
    } else {
        logs.push(format!(
            "❌ 批量匹配失败: 未在当前UI中找到元素'{}'",
            final_element_text
        ));
        Err(anyhow::anyhow!("未找到目标元素: {}", final_element_text))
    }
}

pub async fn handle_recognize_page(
    executor: &SmartScriptExecutor,
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("执行页面识别测试".to_string());

    let session = get_device_session(executor.device_id()).await?;

    let current_activity = session
        .execute_command("dumpsys activity activities | grep mCurrentFocus")
        .await?;
    logs.push(format!("当前Activity: {}", current_activity.trim()));

    let ui_dump = match executor.capture_ui_snapshot().await {
        Ok(Some(xml)) if !xml.is_empty() => xml,
        _ => session
            .execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml")
            .await?,
    };

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    if let Some(expected_page) = params.get("expected_page").and_then(|v| v.as_str()) {
        if ui_dump.contains(expected_page) || current_activity.contains(expected_page) {
            logs.push(format!("成功识别页面: {}", expected_page));
            Ok("页面识别成功".to_string())
        } else {
            logs.push(format!("页面识别失败，期望: {}", expected_page));
            Ok("页面识别完成，但未匹配预期".to_string())
        }
    } else {
        Ok("页面识别测试完成".to_string())
    }
}
