/// 模块五：控制流执行引擎
/// 
/// 职责：
/// - 统一的控制流执行入口
/// - 协调各个控制结构处理器
/// - 管理执行流程和状态
/// - 提供执行策略和优化

use anyhow::{Result, anyhow};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, warn, error};

use crate::services::execution::model::{SmartScriptStep, SingleStepTestResult, SmartExecutionResult};
use super::ast::{ControlFlowNode, ExecutionPlan, LinearStep};
use super::context::ExecutionContext;
use super::handlers::base::{ControlStructureHandler, HandlerConfig};
use super::handlers::LoopHandler;

/// 控制流执行引擎
pub struct ControlFlowExecutor {
    /// 注册的处理器映射
    handlers: HashMap<String, Arc<dyn ControlStructureHandler>>,
    
    /// 执行配置
    config: ExecutorConfig,
    
    /// 执行统计
    stats: ExecutorStats,
}

/// 执行器配置
#[derive(Debug, Clone)]
pub struct ExecutorConfig {
    /// 是否启用并行执行
    pub enable_parallel_execution: bool,
    
    /// 最大并发数
    pub max_concurrency: usize,
    
    /// 执行超时（毫秒）
    pub execution_timeout_ms: Option<u64>,
    
    /// 错误处理策略
    pub error_handling: ExecutionErrorHandling,
    
    /// 性能优化设置
    pub optimization: OptimizationConfig,
}

/// 错误处理配置
#[derive(Debug, Clone)]
pub struct ExecutionErrorHandling {
    /// 是否在错误时继续执行
    pub continue_on_error: bool,
    
    /// 最大重试次数
    pub max_retries: i32,
    
    /// 重试间隔（毫秒）
    pub retry_interval_ms: u64,
    
    /// 是否启用智能恢复
    pub enable_smart_recovery: bool,
}

/// 优化配置
#[derive(Debug, Clone)]
pub struct OptimizationConfig {
    /// 是否启用步骤合并
    pub enable_step_merging: bool,
    
    /// 是否启用缓存
    pub enable_caching: bool,
    
    /// 是否启用预加载
    pub enable_preloading: bool,
    
    /// 批处理大小
    pub batch_size: usize,
}

/// 执行统计
#[derive(Debug, Clone, Default)]
pub struct ExecutorStats {
    /// 执行的计划数量
    pub plans_executed: i64,
    
    /// 执行的总步骤数
    pub total_steps_executed: i64,
    
    /// 成功执行的步骤数
    pub successful_steps: i64,
    
    /// 失败的步骤数
    pub failed_steps: i64,
    
    /// 总执行时间（毫秒）
    pub total_execution_time_ms: u64,
    
    /// 平均每步执行时间（毫秒）
    pub avg_step_time_ms: f64,
}

/// 执行结果
#[derive(Debug)]
pub struct ExecutionResult {
    /// 执行是否成功
    pub success: bool,
    
    /// 执行的步骤结果列表
    pub step_results: Vec<StepExecutionResult>,
    
    /// 执行统计信息
    pub execution_stats: ExecutionStatistics,
    
    /// 错误信息
    pub errors: Vec<ExecutionError>,
    
    /// 最终上下文状态
    pub final_context: ExecutionContext,
}

/// 单步执行结果
#[derive(Debug)]
pub struct StepExecutionResult {
    /// 步骤信息
    pub step: SmartScriptStep,
    
    /// 执行结果
    pub result: Result<SingleStepTestResult, String>,
    
    /// 执行耗时（毫秒）
    pub duration_ms: u64,
    
    /// 执行上下文快照
    pub context_snapshot: Option<String>,
}

/// 执行统计信息
#[derive(Debug, Clone)]
pub struct ExecutionStatistics {
    /// 开始时间
    pub start_time: i64,
    
    /// 结束时间
    pub end_time: i64,
    
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
    
    /// 步骤统计
    pub step_stats: StepStatistics,
    
    /// 性能指标
    pub performance_metrics: PerformanceMetrics,
}

/// 步骤统计
#[derive(Debug, Clone)]
pub struct StepStatistics {
    /// 总步骤数
    pub total_steps: i32,
    
    /// 成功步骤数
    pub successful_steps: i32,
    
    /// 失败步骤数
    pub failed_steps: i32,
    
    /// 跳过步骤数
    pub skipped_steps: i32,
    
    /// 重试次数
    pub retry_count: i32,
}

/// 性能指标
#[derive(Debug, Clone)]
pub struct PerformanceMetrics {
    /// 最快步骤耗时（毫秒）
    pub min_step_time_ms: u64,
    
    /// 最慢步骤耗时（毫秒）
    pub max_step_time_ms: u64,
    
    /// 平均步骤耗时（毫秒）
    pub avg_step_time_ms: f64,
    
    /// 吞吐量（步骤/秒）
    pub throughput_steps_per_sec: f64,
}

/// 执行错误
#[derive(Debug, Clone)]
pub struct ExecutionError {
    /// 错误代码
    pub code: String,
    
    /// 错误消息
    pub message: String,
    
    /// 发生错误的步骤ID
    pub step_id: Option<String>,
    
    /// 错误堆栈
    pub stack_trace: Option<String>,
    
    /// 错误时间戳
    pub timestamp: i64,
}

impl ControlFlowExecutor {
    /// 创建新的执行引擎
    pub fn new() -> Self {
        let mut executor = Self {
            handlers: HashMap::new(),
            config: ExecutorConfig::default(),
            stats: ExecutorStats::default(),
        };
        
        // 注册默认处理器
        executor.register_default_handlers();
        
        info!("🚀 控制流执行引擎已创建");
        
        executor
    }
    
    /// 使用自定义配置创建执行引擎
    pub fn with_config(config: ExecutorConfig) -> Self {
        let mut executor = Self::new();
        executor.config = config;
        executor
    }
    
    /// 注册默认处理器
    fn register_default_handlers(&mut self) {
        // 注册循环处理器
        self.register_handler("loop", Arc::new(LoopHandler::new()));
        
        info!("📋 已注册 {} 个默认处理器", self.handlers.len());
    }
    
    /// 注册控制结构处理器
    pub fn register_handler(&mut self, name: &str, handler: Arc<dyn ControlStructureHandler>) {
        self.handlers.insert(name.to_string(), handler);
        info!("🔧 注册处理器: {}", name);
    }
    
    /// 执行控制流计划
    pub async fn execute_plan(
        &mut self,
        plan: ExecutionPlan,
        step_executor: Arc<dyn StepExecutor>,
    ) -> Result<ExecutionResult> {
        let start_time = std::time::Instant::now();
        let start_timestamp = chrono::Utc::now().timestamp_millis();
        
        info!("🎬 开始执行控制流计划，总步骤数: {}", plan.linear_steps.len());
        
        let mut context = ExecutionContext::new();
        let mut step_results = Vec::new();
        let mut errors = Vec::new();
        let mut successful_steps = 0i32;
        let mut failed_steps = 0i32;
        let mut skipped_steps = 0i32;
        
        // 性能指标追踪
        let mut min_step_time = u64::MAX;
        let mut max_step_time = 0u64;
        let mut total_step_time = 0u64;
        
        // 执行每个线性步骤
        for (index, linear_step) in plan.linear_steps.iter().enumerate() {
            let step_start_time = std::time::Instant::now();
            
            info!("🔄 执行步骤 {}/{}: {}", 
                  index + 1, plan.linear_steps.len(), linear_step.step.name);
            
            // 更新执行上下文
            self.update_context_for_step(&mut context, linear_step).await?;
            
            // 执行单个步骤
            let execution_result = self.execute_single_step(
                &linear_step.step,
                &mut context,
                step_executor.clone()
            ).await;
            
            let step_duration = step_start_time.elapsed();
            let step_duration_ms = step_duration.as_millis() as u64;
            
            // 更新性能指标
            min_step_time = min_step_time.min(step_duration_ms);
            max_step_time = max_step_time.max(step_duration_ms);
            total_step_time += step_duration_ms;
            
            // 处理执行结果
            match execution_result {
                Ok(result) => {
                    successful_steps += 1;
                    step_results.push(StepExecutionResult {
                        step: linear_step.step.clone(),
                        result: Ok(result),
                        duration_ms: step_duration_ms,
                        context_snapshot: None,
                    });
                }
                Err(e) => {
                    failed_steps += 1;
                    
                    let error = ExecutionError {
                        code: "STEP_EXECUTION_FAILED".to_string(),
                        message: e.to_string(),
                        step_id: Some(linear_step.step.id.clone()),
                        stack_trace: None,
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };
                    
                    errors.push(error);
                    
                    step_results.push(StepExecutionResult {
                        step: linear_step.step.clone(),
                        result: Err(e.to_string()),
                        duration_ms: step_duration_ms,
                        context_snapshot: None,
                    });
                    
                    // 根据错误处理策略决定是否继续
                    if !self.config.error_handling.continue_on_error {
                        warn!("💥 步骤执行失败，停止执行: {}", e);
                        break;
                    } else {
                        warn!("⚠️ 步骤执行失败，继续执行: {}", e);
                    }
                }
            }
        }
        
        let total_duration = start_time.elapsed();
        let end_timestamp = chrono::Utc::now().timestamp_millis();
        
        // 计算性能指标
        let avg_step_time = if step_results.len() > 0 {
            total_step_time as f64 / step_results.len() as f64
        } else {
            0.0
        };
        
        let throughput = if total_duration.as_secs() > 0 {
            step_results.len() as f64 / total_duration.as_secs() as f64
        } else {
            0.0
        };
        
        // 更新引擎统计
        self.stats.plans_executed += 1;
        self.stats.total_steps_executed += step_results.len() as i64;
        self.stats.successful_steps += successful_steps as i64;
        self.stats.failed_steps += failed_steps as i64;
        self.stats.total_execution_time_ms += total_duration.as_millis() as u64;
        
        if self.stats.total_steps_executed > 0 {
            self.stats.avg_step_time_ms = 
                self.stats.total_execution_time_ms as f64 / self.stats.total_steps_executed as f64;
        }
        
        // 构建执行结果
        let execution_result = ExecutionResult {
            success: failed_steps == 0,
            step_results,
            execution_stats: ExecutionStatistics {
                start_time: start_timestamp,
                end_time: end_timestamp,
                total_duration_ms: total_duration.as_millis() as u64,
                step_stats: StepStatistics {
                    total_steps: plan.linear_steps.len() as i32,
                    successful_steps,
                    failed_steps,
                    skipped_steps,
                    retry_count: 0, // TODO: 实现重试逻辑
                },
                performance_metrics: PerformanceMetrics {
                    min_step_time_ms: if min_step_time == u64::MAX { 0 } else { min_step_time },
                    max_step_time_ms: max_step_time,
                    avg_step_time_ms: avg_step_time,
                    throughput_steps_per_sec: throughput,
                },
            },
            errors,
            final_context: context,
        };
        
        info!("🎉 控制流执行完成: 成功 {}, 失败 {}, 总耗时 {}ms", 
              successful_steps, failed_steps, total_duration.as_millis());
        
        Ok(execution_result)
    }
    
    /// 更新执行上下文
    async fn update_context_for_step(
        &self,
        context: &mut ExecutionContext,
        linear_step: &LinearStep
    ) -> Result<()> {
        // 根据步骤上下文更新执行上下文
        if let Some(iteration) = linear_step.context.loop_iteration {
            // 设置循环迭代变量
            context.set_variable(
                "__current_iteration".to_string(),
                serde_json::Value::Number(serde_json::Number::from(iteration)),
                crate::services::script_execution::control_flow::context::VariableSource::LoopIterator {
                    loop_id: linear_step.context.source_node_id.clone(),
                }
            )?;
        }
        
        // 设置嵌套层级变量
        context.set_variable(
            "__nesting_level".to_string(),
            serde_json::Value::Number(serde_json::Number::from(linear_step.context.nesting_level)),
            crate::services::script_execution::control_flow::context::VariableSource::SystemBuiltin
        )?;
        
        Ok(())
    }
    
    /// 执行单个步骤
    async fn execute_single_step(
        &self,
        step: &SmartScriptStep,
        _context: &mut ExecutionContext,
        step_executor: Arc<dyn StepExecutor>
    ) -> Result<SingleStepTestResult> {
        step_executor.execute_step(step.clone()).await
    }
    
    /// 获取执行统计
    pub fn get_stats(&self) -> &ExecutorStats {
        &self.stats
    }
    
    /// 重置统计信息
    pub fn reset_stats(&mut self) {
        self.stats = ExecutorStats::default();
        info!("📊 执行统计信息已重置");
    }
}

/// 步骤执行器接口
/// 
/// 这个接口允许控制流执行引擎与具体的步骤执行逻辑解耦
#[async_trait::async_trait]
pub trait StepExecutor: Send + Sync {
    /// 执行单个步骤
    async fn execute_step(&self, step: SmartScriptStep) -> Result<SingleStepTestResult>;
}

/// 默认配置实现
impl Default for ExecutorConfig {
    fn default() -> Self {
        Self {
            enable_parallel_execution: false, // 默认关闭并行执行
            max_concurrency: 4,
            execution_timeout_ms: Some(3600_000), // 1小时
            error_handling: ExecutionErrorHandling {
                continue_on_error: true,
                max_retries: 3,
                retry_interval_ms: 1000,
                enable_smart_recovery: true,
            },
            optimization: OptimizationConfig {
                enable_step_merging: true,
                enable_caching: false,
                enable_preloading: false,
                batch_size: 10,
            },
        }
    }
}

impl Default for ControlFlowExecutor {
    fn default() -> Self {
        Self::new()
    }
}

/// 将 SmartExecutionResult 转换为 ExecutionResult
impl From<ExecutionResult> for SmartExecutionResult {
    fn from(result: ExecutionResult) -> Self {
        use std::collections::HashMap;
        
        SmartExecutionResult {
            success: result.success,
            total_steps: result.execution_stats.step_stats.total_steps as u32,
            executed_steps: (result.execution_stats.step_stats.successful_steps + 
                           result.execution_stats.step_stats.failed_steps) as u32,
            failed_steps: result.execution_stats.step_stats.failed_steps as u32,
            skipped_steps: result.execution_stats.step_stats.skipped_steps as u32,
            duration_ms: result.execution_stats.total_duration_ms,
            logs: result.errors.iter().map(|e| e.message.clone()).collect(),
            final_page_state: None,
            extracted_data: HashMap::new(),
            message: if result.success {
                "执行成功".to_string()
            } else {
                format!("执行失败: {} 个步骤失败", result.execution_stats.step_stats.failed_steps)
            },
        }
    }
}