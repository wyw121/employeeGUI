/// 模块化控制流系统集成示例
/// 
/// 展示如何将新的模块化架构集成到现有的SmartScriptExecutor中

use anyhow::Result;
use std::sync::Arc;
use async_trait::async_trait;

use crate::services::script_execution::control_flow::{
    ScriptPreprocessor, 
    executor::StepExecutor
};
use crate::services::smart_script_executor::{
    SmartScriptExecutor, SmartScriptStep, SingleStepTestResult, SmartExecutionResult
};

/// 适配器：将现有的SmartScriptExecutor包装为StepExecutor
pub struct SmartScriptStepExecutorAdapter {
    executor: SmartScriptExecutor,
}

impl SmartScriptStepExecutorAdapter {
    pub fn new(device_id: String) -> Self {
        Self {
            executor: SmartScriptExecutor::new(device_id),
        }
    }
}

#[async_trait]
impl StepExecutor for SmartScriptStepExecutorAdapter {
    async fn execute_step(&self, step: SmartScriptStep) -> Result<SingleStepTestResult> {
        self.executor.execute_single_step(step).await
    }
}

/// 增强的SmartScriptExecutor，集成了控制流处理系统
pub struct EnhancedSmartScriptExecutor {
    /// 原有的执行器（用于单步执行）
    step_executor: Arc<SmartScriptStepExecutorAdapter>,
    
    /// 新的控制流预处理器
    preprocessor: ScriptPreprocessor,
    
    /// 设备ID
    device_id: String,
}

impl EnhancedSmartScriptExecutor {
    /// 创建增强版执行器
    pub fn new(device_id: String) -> Self {
        let step_executor = Arc::new(SmartScriptStepExecutorAdapter::new(device_id.clone()));
        
        Self {
            step_executor,
            preprocessor: ScriptPreprocessor::new(),
            device_id,
        }
    }
    
    /// 创建高性能版本
    pub fn high_performance(device_id: String) -> Self {
        let step_executor = Arc::new(SmartScriptStepExecutorAdapter::new(device_id.clone()));
        
        Self {
            step_executor,
            preprocessor: ScriptPreprocessor::high_performance(),
            device_id,
        }
    }
    
    /// 创建调试版本
    pub fn debug_mode(device_id: String) -> Self {
        let step_executor = Arc::new(SmartScriptStepExecutorAdapter::new(device_id.clone()));
        
        Self {
            step_executor,
            preprocessor: ScriptPreprocessor::debug_mode(),
            device_id,
        }
    }
    
    /// 执行智能脚本（新版本 - 支持所有控制结构）
    pub async fn execute_smart_script_enhanced(
        &mut self, 
        steps: Vec<SmartScriptStep>
    ) -> Result<SmartExecutionResult> {
        tracing::info!("🚀 使用增强版控制流系统执行脚本");
        
        // 使用新的模块化系统预处理和执行
        self.preprocessor
            .preprocess_and_execute(steps, self.step_executor.clone())
            .await
    }
    
    /// 预处理脚本（兼容现有系统）
    pub fn preprocess_script_for_legacy(
        &mut self, 
        steps: Vec<SmartScriptStep>
    ) -> Result<Vec<SmartScriptStep>> {
        tracing::info!("🔄 为遗留系统预处理脚本");
        
        // 返回线性化的步骤列表，可以被现有执行器使用
        self.preprocessor.preprocess_for_legacy_executor(steps)
    }
    
    /// 验证脚本
    pub fn validate_script(
        &mut self, 
        steps: Vec<SmartScriptStep>
    ) -> Result<crate::services::script_execution::control_flow::preprocessor::ValidationReport> {
        tracing::info!("🔍 验证脚本语法和结构");
        
        self.preprocessor.validate_script(steps)
    }
    
    /// 分析脚本复杂度
    pub fn analyze_script_complexity(
        &mut self, 
        steps: Vec<SmartScriptStep>
    ) -> Result<crate::services::script_execution::control_flow::preprocessor::ComplexityAnalysis> {
        tracing::info!("📊 分析脚本复杂度");
        
        self.preprocessor.analyze_complexity(steps)
    }
}

/// 使用示例
#[cfg(test)]
mod integration_examples {
    use super::*;
    
    /// 示例1：基础使用 - 无缝替换现有执行器
    #[tokio::test]
    async fn example_basic_usage() -> Result<()> {
        let mut executor = EnhancedSmartScriptExecutor::new("test_device".to_string());
        
        let steps = vec![
            // 普通步骤
            create_test_step("tap_button", "Tap"),
            
            // 循环开始
            create_loop_start_step("loop_1", 3, false),
            create_test_step("input_text", "Input"),
            create_test_step("wait", "Wait"),
            create_loop_end_step("loop_1"),
            
            // 更多普通步骤
            create_test_step("verify", "Verify"),
        ];
        
        // 使用增强版执行器 - 自动处理循环
        let result = executor.execute_smart_script_enhanced(steps).await?;
        
        assert!(result.success);
        println!("执行结果: {:?}", result);
        
        Ok(())
    }
    
    /// 示例2：兼容现有系统
    #[tokio::test]
    async fn example_legacy_compatibility() -> Result<()> {
        let mut executor = EnhancedSmartScriptExecutor::new("test_device".to_string());
        
        let original_steps = vec![
            create_loop_start_step("loop_1", 5, false),
            create_test_step("action_1", "Action 1"),
            create_test_step("action_2", "Action 2"), 
            create_loop_end_step("loop_1"),
        ];
        
        // 预处理为线性步骤
        let linear_steps = executor.preprocess_script_for_legacy(original_steps)?;
        
        // 可以传递给现有的执行器
        assert_eq!(linear_steps.len(), 10); // 2个动作 * 5次循环 = 10个步骤
        
        println!("线性化步骤数量: {}", linear_steps.len());
        
        Ok(())
    }
    
    /// 示例3：脚本验证
    #[tokio::test]
    async fn example_script_validation() -> Result<()> {
        let mut executor = EnhancedSmartScriptExecutor::new("test_device".to_string());
        
        let invalid_steps = vec![
            create_loop_start_step("loop_1", 3, false),
            create_test_step("action", "Action"),
            // 缺少循环结束 - 这会导致验证失败
        ];
        
        let validation_result = executor.validate_script(invalid_steps)?;
        
        assert!(!validation_result.is_valid);
        assert!(!validation_result.errors.is_empty());
        
        println!("验证错误: {:?}", validation_result.errors);
        
        Ok(())
    }
    
    /// 示例4：复杂度分析
    #[tokio::test] 
    async fn example_complexity_analysis() -> Result<()> {
        let mut executor = EnhancedSmartScriptExecutor::new("test_device".to_string());
        
        let complex_steps = vec![
            // 外层循环
            create_loop_start_step("outer_loop", 10, false),
                // 内层循环
                create_loop_start_step("inner_loop", 5, false),
                create_test_step("nested_action", "Nested Action"),
                create_loop_end_step("inner_loop"),
            create_loop_end_step("outer_loop"),
        ];
        
        let analysis = executor.analyze_script_complexity(complex_steps)?;
        
        assert_eq!(analysis.original_steps, 5);
        assert_eq!(analysis.expanded_steps, 50); // 10 * 5 = 50
        assert_eq!(analysis.nesting_depth, 2);
        
        println!("复杂度分析: {:?}", analysis);
        
        Ok(())
    }
    
    // 辅助函数
    fn create_test_step(id: &str, name: &str) -> SmartScriptStep {
        SmartScriptStep {
            id: id.to_string(),
            name: name.to_string(),
            step_type: crate::services::smart_script_executor::SmartActionType::Tap,
            parameters: serde_json::json!({}),
            enabled: true,
            order: 0,
        }
    }
    
    fn create_loop_start_step(loop_id: &str, iterations: i32, is_infinite: bool) -> SmartScriptStep {
        SmartScriptStep {
            id: format!("{}_start", loop_id),
            name: format!("循环开始 - {}", loop_id),
            step_type: crate::services::smart_script_executor::SmartActionType::LoopStart,
            parameters: serde_json::json!({
                "loop_id": loop_id,
                "loop_count": iterations,
                "is_infinite_loop": is_infinite
            }),
            enabled: true,
            order: 0,
        }
    }
    
    fn create_loop_end_step(loop_id: &str) -> SmartScriptStep {
        SmartScriptStep {
            id: format!("{}_end", loop_id),
            name: format!("循环结束 - {}", loop_id),
            step_type: crate::services::smart_script_executor::SmartActionType::LoopEnd,
            parameters: serde_json::json!({
                "loop_id": loop_id
            }),
            enabled: true,
            order: 0,
        }
    }
}

/// 便利函数：创建不同配置的增强执行器
pub mod factory {
    use super::*;
    
    /// 为生产环境创建执行器
    pub fn create_production_executor(device_id: String) -> EnhancedSmartScriptExecutor {
        EnhancedSmartScriptExecutor::high_performance(device_id)
    }
    
    /// 为开发/测试环境创建执行器
    pub fn create_development_executor(device_id: String) -> EnhancedSmartScriptExecutor {
        EnhancedSmartScriptExecutor::debug_mode(device_id)
    }
    
    /// 为基础使用场景创建执行器
    pub fn create_standard_executor(device_id: String) -> EnhancedSmartScriptExecutor {
        EnhancedSmartScriptExecutor::new(device_id)
    }
}