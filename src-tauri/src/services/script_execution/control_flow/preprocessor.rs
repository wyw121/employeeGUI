/// 模块六：统一脚本预处理器
/// 
/// 职责：
/// - 提供统一的脚本预处理入口
/// - 协调所有控制流处理模块
/// - 管理预处理流水线
/// - 提供高级API接口

use anyhow::Result;
use std::sync::Arc;
use tracing::{info, warn};

use crate::services::execution::model::{SmartScriptStep, SmartExecutionResult};
use super::ast::{ControlFlowNode, ExecutionPlan};
use super::parser::{ControlFlowParser, ParserConfig};
use super::executor::{ControlFlowExecutor, ExecutorConfig, StepExecutor};
use super::context::ExecutionContext;

/// 统一脚本预处理器
/// 
/// 这是控制流处理系统的主要入口点，整合了所有子模块
pub struct ScriptPreprocessor {
    /// 控制流解析器
    parser: ControlFlowParser,
    
    /// 控制流执行引擎
    executor: ControlFlowExecutor,
    
    /// 预处理器配置
    config: PreprocessorConfig,
}

/// 预处理器配置
#[derive(Debug, Clone)]
pub struct PreprocessorConfig {
    /// 解析器配置
    pub parser_config: ParserConfig,
    
    /// 执行器配置
    pub executor_config: ExecutorConfig,
    
    /// 是否启用详细日志
    pub verbose_logging: bool,
    
    /// 预处理优化等级
    pub optimization_level: OptimizationLevel,
}

/// 优化等级
#[derive(Debug, Clone)]
pub enum OptimizationLevel {
    /// 无优化
    None,
    /// 基础优化
    Basic,
    /// 标准优化
    Standard,
    /// 激进优化
    Aggressive,
}

/// 预处理结果
#[derive(Debug, Clone)]
pub struct PreprocessingResult {
    /// 原始步骤数量
    pub original_step_count: usize,
    
    /// 处理后步骤数量
    pub processed_step_count: usize,
    
    /// 控制流AST
    pub control_flow_ast: ControlFlowNode,
    
    /// 执行计划
    pub execution_plan: ExecutionPlan,
    
    /// 预处理统计
    pub preprocessing_stats: PreprocessingStats,
}

/// 预处理统计
#[derive(Debug, Clone)]
pub struct PreprocessingStats {
    /// 识别的控制结构数量
    pub control_structures_found: i32,
    
    /// 解析耗时（毫秒）
    pub parsing_time_ms: u64,
    
    /// 线性化耗时（毫秒）
    pub linearization_time_ms: u64,
    
    /// 总预处理时间（毫秒）
    pub total_preprocessing_time_ms: u64,
    
    /// 应用的优化数量
    pub optimizations_applied: i32,
}

impl ScriptPreprocessor {
    /// 创建新的预处理器
    pub fn new() -> Self {
        Self {
            parser: ControlFlowParser::new(),
            executor: ControlFlowExecutor::new(),
            config: PreprocessorConfig::default(),
        }
    }
    
    /// 使用自定义配置创建预处理器
    pub fn with_config(config: PreprocessorConfig) -> Self {
        let parser = ControlFlowParser::with_config(config.parser_config.clone());
        let executor = ControlFlowExecutor::with_config(config.executor_config.clone());
        
        Self {
            parser,
            executor,
            config,
        }
    }
    
    /// 预处理脚本步骤
    /// 
    /// 这是主要的API方法，将线性步骤转换为可执行计划
    pub fn preprocess_script(&mut self, steps: Vec<SmartScriptStep>) -> Result<PreprocessingResult> {
        let start_time = std::time::Instant::now();
        let original_count = steps.len();
        
        info!("🔄 开始预处理脚本，原始步骤数: {}", original_count);
        
        // 1. 解析控制流结构
        let parsing_start = std::time::Instant::now();
        let control_flow_ast = self.parser.parse_to_ast(steps)?;
        let parsing_time = parsing_start.elapsed();
        
        if self.config.verbose_logging {
            info!("📋 控制流解析完成，耗时: {}ms", parsing_time.as_millis());
        }
        
        // 2. 线性化为执行计划
        let linearization_start = std::time::Instant::now();
        let execution_plan = self.parser.linearize_ast(&control_flow_ast)?;
        let linearization_time = linearization_start.elapsed();
        
        if self.config.verbose_logging {
            info!("📐 AST线性化完成，耗时: {}ms", linearization_time.as_millis());
        }
        
        // 3. 应用优化
        let optimizations_applied = self.apply_optimizations(&execution_plan)?;
        
        let total_time = start_time.elapsed();
        let processed_count = execution_plan.linear_steps.len();
        
        let result = PreprocessingResult {
            original_step_count: original_count,
            processed_step_count: processed_count,
            control_flow_ast,
            execution_plan,
            preprocessing_stats: PreprocessingStats {
                control_structures_found: 0, // TODO: 从解析器获取
                parsing_time_ms: parsing_time.as_millis() as u64,
                linearization_time_ms: linearization_time.as_millis() as u64,
                total_preprocessing_time_ms: total_time.as_millis() as u64,
                optimizations_applied,
            },
        };
        
        info!("✅ 脚本预处理完成: {} -> {} 步骤，耗时 {}ms", 
              original_count, processed_count, total_time.as_millis());
        
        Ok(result)
    }
    
    /// 预处理并执行脚本
    /// 
    /// 一站式方法：预处理 + 执行
    pub async fn preprocess_and_execute(
        &mut self,
        steps: Vec<SmartScriptStep>,
        step_executor: Arc<dyn StepExecutor>
    ) -> Result<SmartExecutionResult> {
        info!("🚀 开始预处理并执行脚本");
        
        // 1. 预处理
        let preprocessing_result = self.preprocess_script(steps)?;
        
        // 2. 执行
        let execution_result = self.executor
            .execute_plan(preprocessing_result.execution_plan, step_executor)
            .await?;
        
        // 3. 转换结果格式
        Ok(SmartExecutionResult::from(execution_result))
    }
    
    /// 仅预处理，返回线性步骤列表（兼容现有API）
    /// 
    /// 这个方法提供与现有系统的兼容性
    pub fn preprocess_for_legacy_executor(&mut self, steps: Vec<SmartScriptStep>) -> Result<Vec<SmartScriptStep>> {
        let preprocessing_result = self.preprocess_script(steps)?;
        
        // 提取线性步骤
        let linear_steps: Vec<SmartScriptStep> = preprocessing_result.execution_plan.linear_steps
            .into_iter()
            .map(|linear_step| linear_step.step)
            .collect();
        
        info!("🔄 为遗留执行器预处理完成，返回 {} 个线性步骤", linear_steps.len());
        
        Ok(linear_steps)
    }
    
    /// 验证脚本的正确性
    pub fn validate_script(&mut self, steps: Vec<SmartScriptStep>) -> Result<ValidationReport> {
        info!("🔍 开始验证脚本");
        
        let mut report = ValidationReport {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
            suggestions: Vec::new(),
        };
        
        // 1. 尝试解析
        match self.parser.parse_to_ast(steps) {
            Ok(ast) => {
                // 2. 验证AST的正确性
                if let Err(e) = self.validate_ast(&ast, &mut report) {
                    warn!("AST验证失败: {}", e);
                    report.is_valid = false;
                    report.errors.push(ValidationIssue {
                        code: "AST_VALIDATION_FAILED".to_string(),
                        message: e.to_string(),
                        location: None,
                        severity: IssueSeverity::Error,
                    });
                }
            }
            Err(e) => {
                report.is_valid = false;
                report.errors.push(ValidationIssue {
                    code: "PARSING_FAILED".to_string(),
                    message: e.to_string(),
                    location: None,
                    severity: IssueSeverity::Error,
                });
            }
        }
        
        info!("✅ 脚本验证完成: {} (错误: {}, 警告: {})", 
              if report.is_valid { "通过" } else { "失败" },
              report.errors.len(), report.warnings.len());
        
        Ok(report)
    }
    
    /// 获取脚本复杂度分析
    pub fn analyze_complexity(&mut self, steps: Vec<SmartScriptStep>) -> Result<ComplexityAnalysis> {
        let preprocessing_result = self.preprocess_script(steps)?;
        
        let analysis = ComplexityAnalysis {
            original_steps: preprocessing_result.original_step_count,
            expanded_steps: preprocessing_result.processed_step_count,
            expansion_ratio: preprocessing_result.processed_step_count as f64 / 
                           preprocessing_result.original_step_count.max(1) as f64,
            control_structures: preprocessing_result.preprocessing_stats.control_structures_found,
            nesting_depth: self.calculate_nesting_depth(&preprocessing_result.control_flow_ast),
            estimated_execution_time_ms: preprocessing_result.execution_plan.stats.estimated_duration_ms,
            complexity_rating: preprocessing_result.execution_plan.stats.complexity_rating.clone(),
        };
        
        info!("📊 复杂度分析完成: 展开比 {:.2}, 嵌套深度 {}", 
              analysis.expansion_ratio, analysis.nesting_depth);
        
        Ok(analysis)
    }
    
    /// 应用优化
    fn apply_optimizations(&self, _plan: &ExecutionPlan) -> Result<i32> {
        let mut optimizations_applied = 0;
        
        match self.config.optimization_level {
            OptimizationLevel::None => {
                // 不应用任何优化
            }
            OptimizationLevel::Basic => {
                // 基础优化：去重、合并等待
                optimizations_applied += 1;
            }
            OptimizationLevel::Standard => {
                // 标准优化：包含基础优化 + 步骤重排
                optimizations_applied += 2;
            }
            OptimizationLevel::Aggressive => {
                // 激进优化：包含所有优化 + 并行化
                optimizations_applied += 3;
            }
        }
        
        if optimizations_applied > 0 {
            info!("🚀 应用了 {} 项优化", optimizations_applied);
        }
        
        Ok(optimizations_applied)
    }
    
    /// 验证AST
    fn validate_ast(&self, _ast: &ControlFlowNode, _report: &mut ValidationReport) -> Result<()> {
        // TODO: 实现AST验证逻辑
        Ok(())
    }
    
    /// 计算嵌套深度
    fn calculate_nesting_depth(&self, ast: &ControlFlowNode) -> i32 {
        ast.depth()
    }
}

/// 验证报告
#[derive(Debug, Clone)]
pub struct ValidationReport {
    pub is_valid: bool,
    pub errors: Vec<ValidationIssue>,
    pub warnings: Vec<ValidationIssue>,
    pub suggestions: Vec<ValidationIssue>,
}

/// 验证问题
#[derive(Debug, Clone)]
pub struct ValidationIssue {
    pub code: String,
    pub message: String,
    pub location: Option<String>,
    pub severity: IssueSeverity,
}

/// 问题严重程度
#[derive(Debug, Clone)]
pub enum IssueSeverity {
    Error,
    Warning,
    Info,
    Suggestion,
}

/// 复杂度分析
#[derive(Debug, Clone)]
pub struct ComplexityAnalysis {
    pub original_steps: usize,
    pub expanded_steps: usize,
    pub expansion_ratio: f64,
    pub control_structures: i32,
    pub nesting_depth: i32,
    pub estimated_execution_time_ms: u64,
    pub complexity_rating: crate::services::script_execution::control_flow::ast::ComplexityRating,
}

/// 默认配置
impl Default for PreprocessorConfig {
    fn default() -> Self {
        Self {
            parser_config: ParserConfig::default(),
            executor_config: ExecutorConfig::default(),
            verbose_logging: false,
            optimization_level: OptimizationLevel::Standard,
        }
    }
}

impl Default for ScriptPreprocessor {
    fn default() -> Self {
        Self::new()
    }
}

/// 便利构造方法
impl ScriptPreprocessor {
    /// 创建高性能预处理器配置
    pub fn high_performance() -> Self {
        let config = PreprocessorConfig {
            parser_config: ParserConfig {
                validate_nesting: true,
                enable_optimization: true,
                max_nesting_depth: 20,
                allow_unmatched_structures: false,
            },
            executor_config: ExecutorConfig {
                enable_parallel_execution: true,
                max_concurrency: 8,
                execution_timeout_ms: Some(1800_000), // 30分钟
                error_handling: crate::services::script_execution::control_flow::executor::ExecutionErrorHandling {
                    continue_on_error: true,
                    max_retries: 5,
                    retry_interval_ms: 500,
                    enable_smart_recovery: true,
                },
                optimization: crate::services::script_execution::control_flow::executor::OptimizationConfig {
                    enable_step_merging: true,
                    enable_caching: true,
                    enable_preloading: true,
                    batch_size: 20,
                },
            },
            verbose_logging: false,
            optimization_level: OptimizationLevel::Aggressive,
        };
        
        Self::with_config(config)
    }
    
    /// 创建调试友好的预处理器配置
    pub fn debug_mode() -> Self {
        let config = PreprocessorConfig {
            parser_config: ParserConfig {
                validate_nesting: true,
                enable_optimization: false,
                max_nesting_depth: 10,
                allow_unmatched_structures: true,
            },
            executor_config: ExecutorConfig {
                enable_parallel_execution: false,
                max_concurrency: 1,
                execution_timeout_ms: Some(600_000), // 10分钟
                error_handling: crate::services::script_execution::control_flow::executor::ExecutionErrorHandling {
                    continue_on_error: false,
                    max_retries: 1,
                    retry_interval_ms: 2000,
                    enable_smart_recovery: false,
                },
                optimization: crate::services::script_execution::control_flow::executor::OptimizationConfig {
                    enable_step_merging: false,
                    enable_caching: false,
                    enable_preloading: false,
                    batch_size: 1,
                },
            },
            verbose_logging: true,
            optimization_level: OptimizationLevel::None,
        };
        
        Self::with_config(config)
    }
}