//! custom_strategy.rs - Custom 匹配策略处理器
//! 
//! Custom 策略根据实际情况智能选择 absolute 或 standard 策略。

use super::{StrategyProcessor, MatchingContext, StrategyResult, ProcessingError};
use super::{StandardStrategyProcessor, AbsoluteStrategyProcessor};
use async_trait::async_trait;
use anyhow::Result;
use tracing::{info, debug};

/// Custom 策略处理器
/// 
/// 特点：
/// - 智能选择策略：有位置约束时使用 absolute，否则使用 standard
/// - 提供向后兼容性
/// - 自适应匹配模式
pub struct CustomStrategyProcessor {
    standard_processor: StandardStrategyProcessor,
    absolute_processor: AbsoluteStrategyProcessor,
}

impl CustomStrategyProcessor {
    pub fn new() -> Self {
        Self {
            standard_processor: StandardStrategyProcessor::new(),
            absolute_processor: AbsoluteStrategyProcessor::new(),
        }
    }
    
    /// 判断是否有有效的位置约束
    fn has_valid_position_constraints(&self, context: &MatchingContext) -> bool {
        // 检查是否有 bounds 相关的字段和值
        let has_position_fields = context.fields.iter().any(|field| {
            matches!(field.as_str(), "bounds" | "index" | "x" | "y")
        });
        
        let has_position_values = context.values.keys().any(|key| {
            matches!(key.as_str(), "bounds" | "index" | "x" | "y")
        });
        
        let has_fallback_bounds = context.fallback_bounds.is_some();
        
        has_position_fields || has_position_values || has_fallback_bounds
    }
}

#[async_trait]
impl StrategyProcessor for CustomStrategyProcessor {
    async fn process(&self, context: &mut MatchingContext, logs: &mut Vec<String>) -> Result<StrategyResult, ProcessingError> {
        logs.push("🎨 使用 Custom 策略进行智能匹配".to_string());
        logs.push("📋 Custom 策略特点: 根据参数智能选择 absolute 或 standard".to_string());
        
        // 验证参数
        self.validate_parameters(context)?;
        
        // 判断使用哪种策略
        let use_absolute = self.has_valid_position_constraints(context);
        
        if use_absolute {
            logs.push("🎯 检测到位置约束，使用 absolute 策略".to_string());
            debug!("Custom 策略选择 absolute: 有位置约束");
            info!("🎨 Custom 策略 -> Absolute");
            
            // 临时修改策略名称以便日志记录
            let original_strategy = context.strategy.clone();
            context.strategy = "absolute".to_string();
            let result = self.absolute_processor.process(context, logs).await;
            context.strategy = original_strategy; // 恢复原策略名称
            result
        } else {
            logs.push("🎯 未检测到位置约束，使用 standard 策略".to_string());
            debug!("Custom 策略选择 standard: 无位置约束");
            info!("🎨 Custom 策略 -> Standard");
            
            // 临时修改策略名称以便日志记录
            let original_strategy = context.strategy.clone();
            context.strategy = "standard".to_string();
            let result = self.standard_processor.process(context, logs).await;
            context.strategy = original_strategy; // 恢复原策略名称
            result
        }
    }
    
    fn validate_parameters(&self, context: &MatchingContext) -> Result<(), ProcessingError> {
        if context.fields.is_empty() && context.values.is_empty() && context.fallback_bounds.is_none() {
            return Err(ProcessingError::InvalidParameters(
                "Custom 策略需要至少提供一个匹配条件".to_string()
            ));
        }
        
        Ok(())
    }
    
    fn strategy_name(&self) -> &'static str {
        "custom"
    }
    
    fn should_ignore_fallback_bounds(&self) -> bool {
        false // Custom 策略根据情况决定
    }
    
    fn priority(&self) -> u8 {
        30 // 较高优先级
    }
}