//! absolute_strategy.rs - Absolute 匹配策略处理器
//! 
//! Absolute 策略使用精确的位置信息进行匹配，适用于同设备同分辨率的精确定位。

use super::{StrategyProcessor, MatchingContext, StrategyResult, ProcessingError};
use async_trait::async_trait;
use anyhow::Result;
use tracing::{info, warn, debug};

/// Absolute 策略处理器
/// 
/// 特点：
/// - 优先使用固化的 bounds 坐标
/// - 提供最精确的定位
/// - 适用于同设备、同分辨率场景
pub struct AbsoluteStrategyProcessor;

impl AbsoluteStrategyProcessor {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl StrategyProcessor for AbsoluteStrategyProcessor {
    async fn process(&self, context: &mut MatchingContext, logs: &mut Vec<String>) -> Result<StrategyResult, ProcessingError> {
        logs.push("📍 使用 Absolute 策略进行精确匹配".to_string());
        logs.push("📋 Absolute 策略特点: 优先使用固化坐标进行精确定位".to_string());
        
        // 验证参数
        self.validate_parameters(context)?;
        
        // 尝试使用固化坐标
        if let Some(fallback_bounds) = &context.fallback_bounds {
            logs.push("🎯 使用固化坐标进行 Absolute 匹配".to_string());
            debug!("Absolute 策略使用固化坐标: {:?}", fallback_bounds);
            
            match crate::utils::bounds::parse_bounds_value(fallback_bounds) {
                Ok(rect) => {
                    let (center_x, center_y) = rect.center();
                    logs.push(format!("📍 解析固化坐标成功: ({}, {})", center_x, center_y));
                    
                    info!("✅ Absolute 策略使用固化坐标 - 坐标: ({}, {})", center_x, center_y);
                    
                    return Ok(StrategyResult::fallback_success(
                        "Absolute 策略使用固化坐标".to_string(),
                        (center_x, center_y),
                    ));
                }
                Err(e) => {
                    warn!("⚠️ 固化坐标解析失败: {}", e);
                    logs.push(format!("⚠️ 固化坐标解析失败: {}", e));
                }
            }
        }
        
        // 如果没有固化坐标，尝试使用完整匹配
        logs.push("🔄 固化坐标不可用，尝试完整字段匹配".to_string());
        
        if !context.fields.is_empty() && !context.values.is_empty() {
            // 这里可以调用完整的匹配引擎，包括位置字段
            let criteria = crate::xml_judgment_service::MatchCriteriaDTO {
                strategy: "absolute".to_string(),
                fields: context.fields.clone(),
                values: context.values.clone(),
                includes: context.includes.clone(),
                excludes: context.excludes.clone(),
                match_mode: context.match_mode.clone(),
                regex_includes: context.regex_includes.clone(),
                regex_excludes: context.regex_excludes.clone(),
            };
            
            match crate::xml_judgment_service::match_element_by_criteria(context.device_id.clone(), criteria).await {
                Ok(result) if result.ok => {
                    if let Some(preview) = result.preview {
                        if let Some(bounds_str) = preview.bounds {
                            match crate::utils::bounds::parse_bounds_str(&bounds_str) {
                                Ok(rect) => {
                                    let (center_x, center_y) = rect.center();
                                    logs.push(format!("✅ Absolute 完整匹配成功: ({}, {})", center_x, center_y));
                                    
                                    return Ok(StrategyResult::success_with_bounds(
                                        "Absolute 策略完整匹配成功".to_string(),
                                        (center_x, center_y),
                                        bounds_str,
                                    ));
                                }
                                Err(e) => {
                                    logs.push(format!("⚠️ bounds 解析失败: {}", e));
                                }
                            }
                        }
                    }
                }
                Ok(result) => {
                    logs.push(format!("❌ Absolute 完整匹配失败: {}", result.message));
                }
                Err(e) => {
                    logs.push(format!("❌ Absolute 匹配引擎调用失败: {}", e));
                }
            }
        }
        
        Ok(StrategyResult::failure("Absolute 策略无法找到有效坐标".to_string()))
    }
    
    fn validate_parameters(&self, _context: &MatchingContext) -> Result<(), ProcessingError> {
        // Absolute 策略对参数要求较宽松
        Ok(())
    }
    
    fn strategy_name(&self) -> &'static str {
        "absolute"
    }
    
    fn should_ignore_fallback_bounds(&self) -> bool {
        false // Absolute 策略使用固化坐标
    }
    
    fn priority(&self) -> u8 {
        50 // 中等优先级
    }
}