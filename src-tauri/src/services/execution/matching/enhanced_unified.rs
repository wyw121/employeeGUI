//! enhanced_unified.rs - 增强的统一匹配引擎
//! 
//! 使用模块化策略处理器重构的匹配引擎，确保正确处理前端发送的匹配策略。

use std::collections::HashMap;
use anyhow::Result;
use serde_json::Value;
use tracing::{info, warn, debug};

use crate::services::execution::model::SmartScriptStep;
use crate::services::execution::matching::LegacyUiActions;
use crate::services::execution::matching::legacy_regex::run_traditional_find;

use super::strategies::{
    create_strategy_processor,
    extract_matching_context,
    MatchingContext,
    ProcessingError,
};

/// 增强的统一匹配引擎
/// 
/// 主要改进：
/// 1. 使用模块化策略处理器
/// 2. 正确处理前端重构后的匹配参数
/// 3. 确保 standard 策略忽略固化坐标
/// 4. 提供更好的错误处理和日志记录
pub async fn run_enhanced_unified_match<T>(
    actions: &T,
    device_id: &str,
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String>
where
    T: LegacyUiActions + Send + Sync,
{
    logs.push("🚀 [增强版] 执行统一元素查找".to_string());
    
    let params: HashMap<String, Value> =
        serde_json::from_value(step.parameters.clone())?;

    // 尝试提取匹配上下文
    if let Some(mut context) = extract_matching_context(&params) {
        logs.push("✅ 检测到匹配策略配置，使用增强匹配引擎".to_string());
        
        // 设置设备 ID
        context.device_id = device_id.to_string();
        
    logs.push(format!("📋 匹配策略: {}", context.strategy));
    logs.push(format!("🔍 匹配字段: {:?}", context.fields));
    logs.push(format!("📝 匹配值: {:?}", context.values));
        
        if !context.includes.is_empty() {
            logs.push(format!("✅ 包含条件: {:?}", context.includes));
        }
        if !context.excludes.is_empty() {
            logs.push(format!("❌ 排除条件: {:?}", context.excludes));
        }
        
        // 额外记录匹配模式与正则
        if !context.match_mode.is_empty() {
            logs.push(format!("🧪 匹配模式(match_mode): {:?}", context.match_mode));
        }
        if !context.regex_includes.is_empty() {
            logs.push(format!("🧩 正则包含(regex_includes): {:?}", context.regex_includes));
        }
        if !context.regex_excludes.is_empty() {
            logs.push(format!("🚫 正则排除(regex_excludes): {:?}", context.regex_excludes));
        }

        // 创建策略处理器
        let processor = create_strategy_processor(&context.strategy);
        logs.push(format!("🎯 创建策略处理器: {}", processor.strategy_name()));
        
        // 检查是否应该忽略固化坐标
        if processor.should_ignore_fallback_bounds() {
            logs.push("🚫 当前策略忽略固化坐标，将重新匹配元素".to_string());
            debug!("策略 {} 忽略固化坐标", context.strategy);
        } else {
            logs.push("📍 当前策略可能使用固化坐标".to_string());
        }
        
        // 执行策略处理
        info!("🎯 执行增强匹配 - 策略: {}, 设备: {}", context.strategy, device_id);
        
        match processor.process(&mut context, logs).await {
            Ok(result) if result.success => {
                if let Some((x, y)) = result.coordinates {
                    logs.push(format!(
                        "✅ 增强匹配成功: {} -> 坐标({}, {})", 
                        result.message, x, y
                    ));
                    
                    if result.fallback_used {
                        logs.push("⚠️ 使用了固化坐标作为回退方案（保守路线）".to_string());
                        warn!("增强匹配使用固化坐标回退");
                    }
                    
                    // 执行点击
                    match actions.execute_click_with_retry(x, y, logs).await {
                        Ok(_) => {
                            let success_msg = format!(
                                "✅ 增强匹配点击成功 (策略: {}, 坐标: ({}, {}){})",
                                context.strategy, x, y,
                                if result.fallback_used { ", 使用固化坐标" } else { "" }
                            );
                            logs.push(success_msg.clone());
                            info!("✅ 增强匹配执行成功: {}", success_msg);
                            return Ok(success_msg);
                        }
                        Err(e) => {
                            let error_msg = format!("❌ 点击操作失败: {}", e);
                            logs.push(error_msg);
                            warn!("增强匹配点击失败: {}", e);
                            return Err(e);
                        }
                    }
                } else {
                    let msg = format!("✅ 匹配成功但无坐标: {}", result.message);
                    logs.push(msg.clone());
                    return Ok(msg);
                }
            }
            Ok(result) => {
                let msg = format!("❌ 增强匹配失败: {}", result.message);
                logs.push(msg);
                warn!("增强匹配策略失败: {}", result.message);
            }
            Err(ProcessingError::UnsupportedStrategy(strategy)) => {
                let msg = format!("❌ 不支持的策略: {}", strategy);
                logs.push(msg);
                warn!("不支持的匹配策略: {}", strategy);
            }
            Err(ProcessingError::InvalidParameters(msg)) => {
                let error_msg = format!("❌ 参数无效: {}", msg);
                logs.push(error_msg);
                warn!("增强匹配参数无效: {}", msg);
            }
            Err(e) => {
                let error_msg = format!("❌ 增强匹配处理失败: {}", e);
                logs.push(error_msg);
                warn!("增强匹配处理失败: {}", e);
            }
        }
    } else {
        logs.push("ℹ️ 未检测到匹配策略配置".to_string());
        debug!("未找到 matching 配置，使用传统匹配");
    }

    // 回退到传统匹配逻辑
    logs.push("🔄 回退到传统匹配逻辑（保守路线）".to_string());
    warn!("增强匹配失败，回退到传统匹配");
    run_traditional_find(actions, step, logs).await
}

/// 验证匹配参数是否有效
#[allow(dead_code)]
fn validate_matching_parameters(context: &MatchingContext, logs: &mut Vec<String>) -> bool {
    if context.strategy.is_empty() {
        logs.push("❌ 匹配策略为空".to_string());
        return false;
    }
    
    if context.fields.is_empty() && context.values.is_empty() {
        logs.push("❌ 未提供匹配字段或值".to_string());
        return false;
    }
    
    if context.device_id.is_empty() {
        logs.push("❌ 设备 ID 为空".to_string());
        return false;
    }
    
    true
}