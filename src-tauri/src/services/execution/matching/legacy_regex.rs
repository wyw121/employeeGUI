//! legacy_regex.rs - 传统 XML + 正则匹配回退逻辑
//!
//! 将原 `smart_script_executor` 中基于 UI dump 的查找、关注按钮特化等实现迁移到独立模块，
//! 方便后续逐步替换或删除。

use anyhow::Result;
use regex::Regex;
use serde_json::Value;
use tracing::{info};

use crate::services::execution::matching::LegacyUiActions;
use crate::services::execution::model::SmartScriptStep;
use crate::utils::bounds;

/// 传统的元素查找逻辑（兼容旧实现）。
///
/// - 先通过 UI dump（支持多次回退重试）获取 XML
/// - 尝试解析参数中的 bounds、文本或 content-desc
/// - 找到坐标后执行点击操作
pub async fn run_traditional_find<T>(
    actions: &T,
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String>
where
    T: LegacyUiActions + Send + Sync,
{
    logs.push("🔍 执行智能元素查找测试（带错误处理）".to_string());

    // 执行UI dump操作，用传统的重试逻辑
    let ui_dump = actions.execute_ui_dump_with_retry(logs).await?;

    let params: std::collections::HashMap<String, Value> =
        serde_json::from_value(step.parameters.clone())?;

    // 记录查找参数
    logs.push("🎯 查找参数:".to_string());

    let mut element_found = false;
    let mut find_method = String::new();
    let mut click_coords: Option<(i32, i32)> = None;

    if let Some(element_text) = params.get("element_text").and_then(|v| v.as_str()) {
        if !element_text.is_empty() {
            logs.push(format!("  📝 元素文本: {}", element_text));
            if ui_dump.contains(element_text) {
                logs.push(format!("✅ 在UI中找到目标元素: {}", element_text));
                element_found = true;
                find_method = format!("通过文本: {}", element_text);
            } else {
                logs.push(format!("❌ 未在UI中找到目标元素: {}", element_text));
            }
        }
    }

    if !element_found {
        if let Some(content_desc) = params.get("content_desc").and_then(|v| v.as_str()) {
            if !content_desc.is_empty() {
                logs.push(format!("  📝 内容描述: {}", content_desc));
                if ui_dump.contains(content_desc) {
                    logs.push(format!("✅ 在UI中找到目标元素 (通过content-desc): {}", content_desc));
                    element_found = true;
                    find_method = format!("通过content-desc: {}", content_desc);
                } else {
                    logs.push(format!("❌ 未在UI中找到目标元素 (通过content-desc): {}", content_desc));
                }
            }
        }
    }

    if let Some(bounds_val) = params.get("bounds").or_else(|| params.get("boundsRect")) {
        logs.push(format!(
            "  📍 元素边界(原始): {} (类型: {})",
            bounds_val,
            bounds_val_type(bounds_val)
        ));
        match bounds::parse_bounds_value(bounds_val) {
            Ok(rect) => {
                let (center_x, center_y) = rect.center();
                click_coords = Some((center_x, center_y));
                logs.push(format!("🎯 计算中心点坐标: ({}, {})", center_x, center_y));
                logs.push(format!(
                    "📊 归一化边界: left={}, top={}, right={}, bottom={}",
                    rect.left, rect.top, rect.right, rect.bottom
                ));
            }
            Err(e) => {
                logs.push(format!("❌ bounds 解析失败: {}", e));
                logs.push(format!(
                    "🔍 来源参数键: {} | 原始值: {}",
                    if params.contains_key("bounds") { "bounds" } else { "boundsRect" },
                    bounds_val
                ));
                logs.push("🔄 将尝试基于 UI dump 文本/描述查找元素坐标".to_string());
            }
        }
    }

    if click_coords.is_none() {
        let query_text = params
            .get("element_text")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let query_desc = params
            .get("content_desc")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if !query_text.is_empty() || !query_desc.is_empty() {
            let needle = if !query_text.is_empty() { query_text } else { query_desc };
            logs.push(format!("🔎 未提供bounds，尝试基于UI dump按'{}'解析坐标", needle));
            if let Some((cx, cy)) = find_element_in_ui(&ui_dump, needle, logs).await? {
                logs.push(format!("✅ 解析到元素中心坐标: ({}, {})", cx, cy));
                click_coords = Some((cx, cy));
            } else {
                logs.push("⚠️  在UI dump中找到元素文本但未能解析到有效坐标".to_string());
            }
        } else {
            logs.push("ℹ️ 未提供bounds且未提供文本/描述用于解析坐标".to_string());
        }
    }

    if let Some((center_x, center_y)) = click_coords {
        let click_result = actions
            .execute_click_with_retry(center_x, center_y, logs)
            .await;
        match click_result {
            Ok(output) => {
                logs.push(format!("✅ 点击命令输出: {}", output));
                let result_msg = if element_found {
                    format!(
                        "✅ 成功找到并点击元素: {} -> 坐标({}, {})",
                        find_method, center_x, center_y
                    )
                } else {
                    format!(
                        "✅ 基于坐标点击元素: ({}, {}) (未在UI中确认元素存在)",
                        center_x, center_y
                    )
                };
                Ok(result_msg)
            }
            Err(e) => {
                logs.push(format!("❌ 点击操作失败: {}", e));
                Err(e)
            }
        }
    } else {
        if element_found {
            Ok(format!("✅ 找到元素但无法定位坐标: {}", find_method))
        } else {
            logs.push("⚠️  未提供有效的查找参数".to_string());
            Ok("元素查找测试完成 (无查找条件)".to_string())
        }
    }
}

fn bounds_val_type(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

/// 通用批量匹配 - 查找所有匹配元素，支持排除特定文本。
pub async fn find_element_in_ui(
    ui_dump: &str,
    element_text: &str,
    logs: &mut Vec<String>,
) -> Result<Option<(i32, i32)>> {
    info!("🔍🔍🔍 [ENHANCED] 批量匹配搜索: '{}'", element_text);
    info!("📊📊📊 [ENHANCED] UI dump 长度: {} 字符", ui_dump.len());
    logs.push(format!("🔍🔍🔍 [ENHANCED] 批量匹配搜索: '{}'", element_text));
    logs.push(format!(
        "📊📊📊 [ENHANCED] UI dump 长度: {} 字符",
        ui_dump.len()
    ));

    if element_text == "关注" {
        info!("🎯🎯🎯 [ENHANCED] 批量关注模式：查找所有关注按钮，排除已关注");
        info!("🔄🔄🔄 [ENHANCED] 调用 find_all_follow_buttons 方法...");
        logs.push("🎯🎯🎯 [ENHANCED] 批量关注模式：查找所有关注按钮，排除已关注".to_string());
        logs.push("🔄🔄🔄 [ENHANCED] 调用 find_all_follow_buttons 方法...".to_string());
        let result = find_all_follow_buttons(ui_dump, logs).await;
        info!("📋📋📋 [ENHANCED] find_all_follow_buttons 返回结果: {:?}", result);
        logs.push(format!(
            "📋📋📋 [ENHANCED] find_all_follow_buttons 返回结果: {:?}",
            result
        ));
        return result;
    }

    let text_pattern = format!(r#"text="[^"]*{}[^"]*""#, regex::escape(element_text));
    let content_desc_pattern =
        format!(r#"content-desc="[^"]*{}[^"]*""#, regex::escape(element_text));

    let text_regex = Regex::new(&text_pattern).unwrap_or_else(|_| {
        logs.push(format!("⚠️  正则表达式编译失败: {}", text_pattern));
        Regex::new(r".*").unwrap()
    });

    let content_desc_regex = Regex::new(&content_desc_pattern).unwrap_or_else(|_| {
        logs.push(format!(
            "⚠️  正则表达式编译失败: {}",
            content_desc_pattern
        ));
        Regex::new(r".*").unwrap()
    });

    for (line_num, line) in ui_dump.lines().enumerate() {
        if text_regex.is_match(line) {
            logs.push(format!("✅ 在第{}行找到匹配的text属性", line_num + 1));
            if let Some(coords) = extract_bounds_from_line(line, logs) {
                return Ok(Some(coords));
            }
        }

        if content_desc_regex.is_match(line) {
            logs.push(format!(
                "✅ 在第{}行找到匹配的content-desc属性",
                line_num + 1
            ));
            if let Some(coords) = extract_bounds_from_line(line, logs) {
                return Ok(Some(coords));
            }
        }
    }

    logs.push("❌ 在UI dump中未找到匹配的元素".to_string());
    Ok(None)
}

/// 从UI dump行中提取bounds坐标。
pub fn extract_bounds_from_line(line: &str, logs: &mut Vec<String>) -> Option<(i32, i32)> {
    let bounds_regex = Regex::new(r#"bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]""#).ok()?;

    if let Some(captures) = bounds_regex.captures(line) {
        let left: i32 = captures.get(1)?.as_str().parse().ok()?;
        let top: i32 = captures.get(2)?.as_str().parse().ok()?;
        let right: i32 = captures.get(3)?.as_str().parse().ok()?;
        let bottom: i32 = captures.get(4)?.as_str().parse().ok()?;

        let center_x = (left + right) / 2;
        let center_y = (top + bottom) / 2;

        logs.push(format!(
            "📊 提取到bounds: [{},{}][{},{}] -> 中心点({},{})",
            left, top, right, bottom, center_x, center_y
        ));

        Some((center_x, center_y))
    } else {
        logs.push("⚠️  该行未找到有效的bounds属性".to_string());
        None
    }
}

/// 通用批量关注按钮查找 - 支持所有APP，自动排除"已关注"。
pub async fn find_all_follow_buttons(
    ui_dump: &str,
    logs: &mut Vec<String>,
) -> Result<Option<(i32, i32)>> {
    info!("🎯🎯🎯 [ENHANCED] 通用批量关注模式启动...");
    info!("🔍🔍🔍 [ENHANCED] 搜索策略：查找所有'关注'按钮，排除'已关注'按钮");
    logs.push("🎯🎯🎯 [ENHANCED] 通用批量关注模式启动...".to_string());
    logs.push("🔍🔍🔍 [ENHANCED] 搜索策略：查找所有'关注'按钮，排除'已关注'按钮".to_string());

    let mut candidates = Vec::new();

    let follow_patterns = [
        r#"text="关注""#,
        r#"text="[^"]*关注[^"]*""#,
        r#"content-desc="[^"]*关注[^"]*""#,
    ];

    let exclude_patterns = [
        r#"text="[^"]*已关注[^"]*""#,
        r#"text="[^"]*取消关注[^"]*""#,
        r#"text="[^"]*following[^"]*""#,
        r#"text="[^"]*unfollow[^"]*""#,
        r#"content-desc="[^"]*已关注[^"]*""#,
        r#"content-desc="[^"]*following[^"]*""#,
    ];

    logs.push(format!("🔍 开始扫描UI dump，共{}行", ui_dump.lines().count()));
    info!("🔍 开始扫描UI dump，共{}行", ui_dump.lines().count());

    for (line_num, line) in ui_dump.lines().enumerate() {
        if exclude_patterns.iter().any(|pattern| {
            Regex::new(pattern)
                .map(|regex| regex.is_match(line))
                .unwrap_or(false)
        }) {
            logs.push(format!("❌ 第{}行被排除: 包含已关注相关文本", line_num + 1));
            continue;
        }

        for (pattern_idx, pattern) in follow_patterns.iter().enumerate() {
            if Regex::new(pattern)
                .map(|regex| regex.is_match(line))
                .unwrap_or(false)
            {
                if line.contains(r#"clickable="true""#) {
                    info!(
                        "✅ 第{}行匹配模式{}: 找到可点击关注按钮",
                        line_num + 1,
                        pattern_idx + 1
                    );
                    logs.push(format!(
                        "✅ 第{}行匹配模式{}: 找到可点击关注按钮",
                        line_num + 1,
                        pattern_idx + 1
                    ));

                    if let Some(coords) = extract_bounds_from_line(line, logs) {
                        let priority = match pattern_idx {
                            0 => 1,
                            1 => 2,
                            2 => 3,
                            _ => 4,
                        };

                        logs.push(format!(
                            "📍 候选按钮 {}: 坐标({}, {}), 优先级{}",
                            candidates.len() + 1,
                            coords.0,
                            coords.1,
                            priority
                        ));

                        candidates.push((coords, priority, line_num + 1, line.to_string()));
                    }
                } else {
                    logs.push(format!("⚠️  第{}行匹配但不可点击，跳过", line_num + 1));
                }
                break;
            }
        }
    }

    candidates.sort_by_key(|&(_, priority, _, _)| priority);

    if candidates.is_empty() {
        info!("❌ 未找到任何可用的关注按钮");
        logs.push("❌ 未找到任何可用的关注按钮".to_string());
        logs.push("💡 请检查当前页面是否包含关注按钮，或者按钮文本是否为'关注'".to_string());
        return Ok(None);
    }

    info!("🎯 共找到{}个关注按钮候选", candidates.len());
    logs.push(format!("🎯 共找到{}个关注按钮候选", candidates.len()));

    for (idx, (coords, priority, line_num, _)) in candidates.iter().enumerate() {
        logs.push(format!(
            "  📋 候选{}: 第{}行, 坐标({}, {}), 优先级{}",
            idx + 1,
            line_num,
            coords.0,
            coords.1,
            priority
        ));
    }

    let (best_coords, best_priority, best_line, best_content) = &candidates[0];
    logs.push(format!(
        "✅ 选择最佳关注按钮: 第{}行，优先级{}，坐标({}, {})",
        best_line,
        best_priority,
        best_coords.0,
        best_coords.1
    ));
    logs.push(format!(
        "📝 按钮内容预览: {}",
        best_content.chars().take(100).collect::<String>()
    ));

    if best_coords.0 <= 0 || best_coords.1 <= 0 || best_coords.0 > 2000 || best_coords.1 > 3000 {
        logs.push(format!(
            "⚠️  坐标({}, {})看起来不合理，请检查XML解析",
            best_coords.0,
            best_coords.1
        ));
    } else {
        logs.push(format!(
            "✅ 坐标({}, {})看起来合理",
            best_coords.0,
            best_coords.1
        ));
    }

    Ok(Some(*best_coords))
}
