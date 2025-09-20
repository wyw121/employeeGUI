/// 循环处理器实现
/// 
/// 专门处理各种类型的循环控制结构

use anyhow::{Result, anyhow};
use async_trait::async_trait;
use std::collections::HashMap;
use tracing::{info, warn};

use crate::services::smart_script_executor::SmartScriptStep;
use super::super::ast::{ControlFlowNode, ControlFlowType, LinearStep, StepContext};
use super::super::context::ExecutionContext;
use super::base::{
    ControlStructureHandler, HandlerResult, HandlerConfig, HandlerStats, 
    ValidationResult, ValidationError, ValidationWarning, WarningSeverity,
    CostEstimate, ComplexityLevel, ResultMetadata, ResourceUsage, CpuIntensity
};

/// 循环处理器
pub struct LoopHandler {
    /// 处理器版本
    version: String,
}

impl LoopHandler {
    /// 创建新的循环处理器
    pub fn new() -> Self {
        Self {
            version: "1.0.0".to_string(),
        }
    }
    
    /// 展开循环为线性步骤列表
    fn expand_loop(
        &self,
        node: &ControlFlowNode,
        iterations: i32,
        context: &ExecutionContext,
        config: &HandlerConfig
    ) -> Result<Vec<LinearStep>> {
        let mut linear_steps = Vec::new();
        let effective_iterations = if let Some(max_iter) = config.max_iterations {
            iterations.min(max_iter)
        } else {
            iterations
        };
        
        info!("🔄 展开循环: {} 次迭代，{} 个子节点", 
              effective_iterations, node.children.len());
        
        for iteration in 1..=effective_iterations {
            for child in &node.children {
                self.expand_child_node(child, iteration, context, &mut linear_steps)?;
            }
        }
        
        Ok(linear_steps)
    }
    
    /// 展开子节点
    fn expand_child_node(
        &self,
        child: &ControlFlowNode,
        iteration: i32,
        context: &ExecutionContext,
        linear_steps: &mut Vec<LinearStep>
    ) -> Result<()> {
        match &child.flow_type {
            ControlFlowType::Sequential => {
                // 处理顺序执行的步骤
                for step in &child.steps {
                    let mut expanded_step = step.clone();
                    
                    // 为循环步骤生成唯一标识
                    expanded_step.id = format!("{}__iter_{}", step.id, iteration);
                    expanded_step.name = format!("{} (第{}次)", step.name, iteration);
                    expanded_step.order = linear_steps.len() as i32 + 1;
                    
                    // 注入循环上下文信息
                    self.inject_loop_context(&mut expanded_step, iteration, &child.id)?;
                    
                    let linear_step = LinearStep {
                        step: expanded_step,
                        context: StepContext {
                            source_node_id: child.id.clone(),
                            loop_iteration: Some(iteration),
                            conditional_path: None,
                            nesting_level: context.current_depth() + 1,
                        },
                    };
                    
                    linear_steps.push(linear_step);
                }
            }
            
            ControlFlowType::Loop { .. } => {
                // 嵌套循环：递归处理
                warn!("发现嵌套循环，当前处理器版本暂不支持");
                return Err(anyhow!("嵌套循环暂不支持，请使用专门的嵌套处理器"));
            }
            
            _ => {
                // 其他控制结构：跳过或警告
                warn!("循环中包含不支持的控制结构: {:?}", child.flow_type);
            }
        }
        
        Ok(())
    }
    
    /// 注入循环上下文信息到步骤参数中
    fn inject_loop_context(
        &self,
        step: &mut SmartScriptStep,
        iteration: i32,
        loop_node_id: &str
    ) -> Result<()> {
        // 解析现有参数
        let mut params = if let Ok(obj) = serde_json::from_value::<serde_json::Map<String, serde_json::Value>>(step.parameters.clone()) {
            obj
        } else {
            serde_json::Map::new()
        };
        
        // 注入循环上下文
        params.insert("__loop_iteration".to_string(), serde_json::Value::Number(serde_json::Number::from(iteration)));
        params.insert("__loop_node_id".to_string(), serde_json::Value::String(loop_node_id.to_string()));
        params.insert("__original_step_id".to_string(), serde_json::Value::String(step.id.clone()));
        params.insert("__expanded_at".to_string(), serde_json::Value::Number(serde_json::Number::from(chrono::Utc::now().timestamp_millis())));
        
        // 更新步骤参数
        step.parameters = serde_json::Value::Object(params);
        
        Ok(())
    }
    
    /// 优化循环展开
    fn optimize_expansion(
        &self,
        steps: &mut Vec<LinearStep>,
        config: &HandlerConfig
    ) -> bool {
        if !config.enable_optimization {
            return false;
        }
        
        let original_count = steps.len();
        
        // 优化1：去除重复的等待步骤
        self.deduplicate_wait_steps(steps);
        
        // 优化2：合并相同的操作
        self.merge_similar_operations(steps);
        
        let optimized_count = steps.len();
        let optimization_applied = original_count != optimized_count;
        
        if optimization_applied {
            info!("🚀 循环优化: {} -> {} 步骤", original_count, optimized_count);
        }
        
        optimization_applied
    }
    
    /// 去除重复的等待步骤
    fn deduplicate_wait_steps(&self, steps: &mut Vec<LinearStep>) {
        // 简单实现：移除连续的相同等待步骤
        let mut i = 0;
        while i < steps.len() - 1 {
            let current = &steps[i];
            let next = &steps[i + 1];
            
            if self.is_same_wait_step(&current.step, &next.step) {
                steps.remove(i + 1);
            } else {
                i += 1;
            }
        }
    }
    
    /// 合并相似的操作
    fn merge_similar_operations(&self, _steps: &mut Vec<LinearStep>) {
        // 这里可以实现更复杂的操作合并逻辑
        // 例如：连续的点击操作、批量输入等
    }
    
    /// 判断是否为相同的等待步骤
    fn is_same_wait_step(&self, step1: &SmartScriptStep, step2: &SmartScriptStep) -> bool {
        use crate::services::smart_script_executor::SmartActionType;
        
        matches!(step1.step_type, SmartActionType::Wait) &&
        matches!(step2.step_type, SmartActionType::Wait) &&
        step1.parameters.get("duration") == step2.parameters.get("duration")
    }
}

#[async_trait]
impl ControlStructureHandler for LoopHandler {
    fn handler_type(&self) -> &'static str {
        "LoopHandler"
    }
    
    fn can_handle(&self, node: &ControlFlowNode) -> bool {
        matches!(node.flow_type, ControlFlowType::Loop { .. })
    }
    
    async fn handle(
        &self,
        node: &ControlFlowNode,
        context: &mut ExecutionContext,
        config: &HandlerConfig
    ) -> Result<HandlerResult> {
        let start_time = std::time::Instant::now();
        
        // 提取循环参数
        let (iterations, is_infinite) = match &node.flow_type {
            ControlFlowType::Loop { iterations, is_infinite, .. } => (*iterations, *is_infinite),
            _ => return Err(anyhow!("节点类型不匹配")),
        };
        
        // 处理无限循环
        let effective_iterations = if is_infinite {
            config.max_iterations.unwrap_or(1000)
        } else {
            iterations
        };
        
        info!("🔄 开始处理循环: {} 次迭代 (原始: {}, 无限: {})", 
              effective_iterations, iterations, is_infinite);
        
        // 展开循环
        let mut linear_steps = self.expand_loop(node, effective_iterations, context, config)?;
        
        // 应用优化
        let optimization_applied = self.optimize_expansion(&mut linear_steps, config);
        
        let processing_time = start_time.elapsed();
        
        // 构建统计信息
        let stats = HandlerStats {
            original_steps: node.children.iter().map(|c| c.steps.len()).sum(),
            expanded_steps: linear_steps.len(),
            processing_time_ms: processing_time.as_millis() as u64,
            optimization_applied,
            resource_usage: ResourceUsage {
                memory_bytes: (linear_steps.len() * std::mem::size_of::<LinearStep>()) as u64,
                cpu_intensity: if linear_steps.len() > 1000 { CpuIntensity::High } else { CpuIntensity::Medium },
                io_operations: 0,
            },
        };
        
        // 构建结果元数据
        let mut handler_specific = HashMap::new();
        handler_specific.insert("iterations".to_string(), serde_json::Value::Number(serde_json::Number::from(effective_iterations)));
        handler_specific.insert("is_infinite".to_string(), serde_json::Value::Bool(is_infinite));
        handler_specific.insert("original_iterations".to_string(), serde_json::Value::Number(serde_json::Number::from(iterations)));
        
        let metadata = ResultMetadata {
            handler_version: self.version.clone(),
            processed_at: chrono::Utc::now().timestamp_millis(),
            handler_specific,
        };
        
        info!("✅ 循环处理完成: {} 步骤，耗时 {}ms", 
              linear_steps.len(), processing_time.as_millis());
        
        Ok(HandlerResult {
            linear_steps,
            stats,
            metadata,
        })
    }
    
    fn validate(&self, node: &ControlFlowNode) -> Result<ValidationResult> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        
        // 验证循环类型
        let (iterations, is_infinite) = match &node.flow_type {
            ControlFlowType::Loop { iterations, is_infinite, .. } => (*iterations, *is_infinite),
            _ => {
                errors.push(ValidationError {
                    code: "INVALID_NODE_TYPE".to_string(),
                    message: "节点类型不是循环类型".to_string(),
                    location: Some(node.id.clone()),
                });
                return Ok(ValidationResult::failure(errors));
            }
        };
        
        // 验证迭代次数
        if !is_infinite && iterations <= 0 {
            errors.push(ValidationError {
                code: "INVALID_ITERATIONS".to_string(),
                message: format!("循环次数必须大于0，当前值: {}", iterations),
                location: Some(node.id.clone()),
            });
        }
        
        if iterations > 10000 {
            warnings.push(ValidationWarning {
                code: "HIGH_ITERATION_COUNT".to_string(),
                message: format!("循环次数过高 ({}), 可能影响性能", iterations),
                severity: WarningSeverity::Major,
            });
        }
        
        // 验证循环体
        if node.children.is_empty() {
            warnings.push(ValidationWarning {
                code: "EMPTY_LOOP_BODY".to_string(),
                message: "循环体为空".to_string(),
                severity: WarningSeverity::Minor,
            });
        }
        
        // 验证嵌套深度
        let max_depth = node.depth();
        if max_depth > 5 {
            warnings.push(ValidationWarning {
                code: "DEEP_NESTING".to_string(),
                message: format!("嵌套深度过深 ({}), 建议重构", max_depth),
                severity: WarningSeverity::Major,
            });
        }
        
        let result = if errors.is_empty() {
            ValidationResult::success().with_warnings(warnings)
        } else {
            ValidationResult::failure(errors).with_warnings(warnings)
        };
        
        Ok(result)
    }
    
    fn estimate_cost(&self, node: &ControlFlowNode) -> CostEstimate {
        let (iterations, is_infinite) = match &node.flow_type {
            ControlFlowType::Loop { iterations, is_infinite, .. } => (*iterations, *is_infinite),
            _ => (1, false),
        };
        
        let effective_iterations = if is_infinite { 1000 } else { iterations };
        let steps_per_iteration: usize = node.children.iter().map(|c| c.steps.len()).sum();
        let total_steps = steps_per_iteration * effective_iterations as usize;
        
        CostEstimate {
            execution_time_ms: (total_steps as u64) * 500, // 假设每步500ms
            memory_usage_bytes: total_steps as u64 * 1024, // 假设每步1KB
            complexity: if effective_iterations > 1000 {
                ComplexityLevel::ON2
            } else {
                ComplexityLevel::ON
            },
            parallelizable: false, // 循环通常需要顺序执行
        }
    }
}

impl Default for LoopHandler {
    fn default() -> Self {
        Self::new()
    }
}