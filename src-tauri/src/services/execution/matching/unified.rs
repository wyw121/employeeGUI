//! unified.rs - 标准匹配入口 + 回退桥接
//!
//! 将原 `smart_script_executor` 的 `test_find_element_unified` 迁移到独立模块，
//! 通过 `LegacyUiActions` trait 与旧执行器解耦，方便未来替换为纯 ExecStep 流程。

use std::collections::HashMap;

use anyhow::Result;
use async_trait::async_trait;

use crate::services::execution::matching::legacy_regex::run_traditional_find;
use crate::services::execution::model::SmartScriptStep;
use crate::xml_judgment_service::{match_element_by_criteria, MatchCriteriaDTO};

/// 提供旧执行器调用 UI 操作所需的抽象接口。
#[async_trait]
pub trait LegacyUiActions {
    async fn execute_click_with_retry(
        &self,
        x: i32,
        y: i32,
        logs: &mut Vec<String>,
    ) -> Result<String>;

    async fn execute_ui_dump_with_retry(&self, logs: &mut Vec<String>) -> Result<String>;
}

/// 统一元素匹配入口：
/// - 优先解析 `parameters.matching`
/// - 调用标准匹配引擎
/// - 尝试解析预览 bounds 并执行点击
/// - 匹配失败时回退到传统逻辑
pub async fn run_unified_match<T>(
    actions: &T,
    device_id: &str,
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String>
where
    T: LegacyUiActions + Send + Sync,
{
    logs.push("🎯 执行统一元素查找（标准匹配引擎）".to_string());

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    if let Some(matching_val) = params.get("matching") {
        logs.push("📋 发现匹配策略配置，使用统一匹配引擎".to_string());

        let matching: serde_json::Value = matching_val.clone();
        let strategy = matching
            .get("strategy")
            .and_then(|s| s.as_str())
            .unwrap_or("standard")
            .to_string();

        let fields: Vec<String> = matching
            .get("fields")
            .and_then(|f| f.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        let mut values = HashMap::new();
        if let Some(values_obj) = matching.get("values").and_then(|v| v.as_object()) {
            for (k, v) in values_obj {
                if let Some(s) = v.as_str() {
                    values.insert(k.clone(), s.to_string());
                }
            }
        }

        let mut includes = HashMap::new();
        if let Some(includes_obj) = matching.get("includes").and_then(|v| v.as_object()) {
            for (k, v) in includes_obj {
                if let Some(arr) = v.as_array() {
                    let words: Vec<String> = arr
                        .iter()
                        .filter_map(|item| item.as_str().map(|s| s.to_string()))
                        .collect();
                    includes.insert(k.clone(), words);
                }
            }
        }

        let mut excludes = HashMap::new();
        if let Some(excludes_obj) = matching.get("excludes").and_then(|v| v.as_object()) {
            for (k, v) in excludes_obj {
                if let Some(arr) = v.as_array() {
                    let words: Vec<String> = arr
                        .iter()
                        .filter_map(|item| item.as_str().map(|s| s.to_string()))
                        .collect();
                    excludes.insert(k.clone(), words);
                }
            }
        }

        // 解析 match_mode（兼容驼峰/下划线）
        let mut match_mode = HashMap::new();
        if let Some(mode_obj) = matching
            .get("match_mode").and_then(|v| v.as_object())
            .or_else(|| matching.get("matchMode").and_then(|v| v.as_object()))
        {
            for (k, v) in mode_obj {
                if let Some(s) = v.as_str() {
                    match_mode.insert(k.clone(), s.to_string());
                }
            }
        }

        // 解析 regex_includes（兼容驼峰/下划线）
        let mut regex_includes = HashMap::new();
        if let Some(ri_obj) = matching
            .get("regex_includes").and_then(|v| v.as_object())
            .or_else(|| matching.get("regexIncludes").and_then(|v| v.as_object()))
        {
            for (k, v) in ri_obj {
                if let Some(arr) = v.as_array() {
                    let patterns: Vec<String> = arr
                        .iter()
                        .filter_map(|item| item.as_str().map(|s| s.to_string()))
                        .collect();
                    regex_includes.insert(k.clone(), patterns);
                }
            }
        }

        // 解析 regex_excludes（兼容驼峰/下划线）
        let mut regex_excludes = HashMap::new();
        if let Some(re_obj) = matching
            .get("regex_excludes").and_then(|v| v.as_object())
            .or_else(|| matching.get("regexExcludes").and_then(|v| v.as_object()))
        {
            for (k, v) in re_obj {
                if let Some(arr) = v.as_array() {
                    let patterns: Vec<String> = arr
                        .iter()
                        .filter_map(|item| item.as_str().map(|s| s.to_string()))
                        .collect();
                    regex_excludes.insert(k.clone(), patterns);
                }
            }
        }

        logs.push(format!(
            "🎯 匹配策略: {} | 字段: {:?} | 值: {:?}",
            strategy, fields, values
        ));

        if !includes.is_empty() {
            logs.push(format!("✅ 包含条件: {:?}", includes));
        }
        if !excludes.is_empty() {
            logs.push(format!("❌ 排除条件: {:?}", excludes));
        }

        let criteria = MatchCriteriaDTO {
            strategy: strategy.clone(),
            fields,
            values,
            includes,
            excludes,
            match_mode,
            regex_includes,
            regex_excludes,
        };

        let strategy_name = strategy.clone();

        match match_element_by_criteria(device_id.to_string(), criteria.clone()).await {
            Ok(result) if result.ok => {
                logs.push(format!("✅ 匹配成功: {}", result.message));

                if let Some(preview) = result.preview {
                    if let Some(bounds_str) = preview.bounds {
                        logs.push(format!("📍 匹配到元素边界: {}", bounds_str));

                        match crate::utils::bounds::parse_bounds_str(&bounds_str) {
                            Ok(rect) => {
                                let (center_x, center_y) = rect.center();
                                logs.push(format!(
                                    "🎯 计算中心点: ({}, {})",
                                    center_x, center_y
                                ));

                                match actions
                                    .execute_click_with_retry(center_x, center_y, logs)
                                    .await
                                {
                                    Ok(_) => {
                                        let msg = format!(
                                            "✅ 成功找到并点击元素 (策略: {}, 坐标: ({}, {}))",
                                            strategy_name, center_x, center_y
                                        );
                                        logs.push(msg.clone());
                                        return Ok(msg);
                                    }
                                    Err(e) => {
                                        logs.push(format!("❌ 点击操作失败: {}", e));
                                        return Err(e);
                                    }
                                }
                            }
                            Err(e) => {
                                logs.push(format!(
                                    "⚠️ bounds 解析失败: {} (原始: {})",
                                    e, bounds_str
                                ));
                            }
                        }
                    }

                    let msg = format!(
                        "✅ 匹配成功但无法执行点击 (策略: {}, 无有效坐标)",
                        strategy_name
                    );
                    logs.push(msg.clone());
                    return Ok(msg);
                } else {
                    let msg = format!(
                        "✅ 匹配成功但无预览信息 (策略: {})",
                        strategy_name
                    );
                    logs.push(msg.clone());
                    return Ok(msg);
                }
            }
            Ok(result) => {
                logs.push(format!(
                    "❌ 匹配失败: {} (总节点数: {:?})",
                    result.message, result.total
                ));
            }
            Err(e) => {
                logs.push(format!("❌ 匹配引擎调用失败: {}", e));
            }
        }
    }

    logs.push("🔄 回退到传统参数解析".to_string());
    run_traditional_find(actions, step, logs).await
}
