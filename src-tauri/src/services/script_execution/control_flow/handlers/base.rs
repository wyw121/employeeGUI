/// 控制结构处理器基础接口
/// 
/// 定义了所有控制结构处理器必须实现的统一接口

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::services::smart_script_executor::SmartScriptStep;
use super::super::ast::{ControlFlowNode, LinearStep};
use super::super::context::ExecutionContext;

/// 控制结构处理器统一接口
#[async_trait]
pub trait ControlStructureHandler: Send + Sync {
    /// 处理器类型名称
    fn handler_type(&self) -> &'static str;
    
    /// 检查是否可以处理指定的控制流节点
    fn can_handle(&self, node: &ControlFlowNode) -> bool;
    
    /// 处理控制流节点，返回线性化的步骤列表
    async fn handle(
        &self, 
        node: &ControlFlowNode, 
        context: &mut ExecutionContext,
        config: &HandlerConfig
    ) -> Result<HandlerResult>;
    
    /// 验证控制流节点的有效性
    fn validate(&self, node: &ControlFlowNode) -> Result<ValidationResult>;
    
    /// 估算处理该节点的性能开销
    fn estimate_cost(&self, node: &ControlFlowNode) -> CostEstimate;
    
    /// 获取处理器配置的默认值
    fn default_config(&self) -> HandlerConfig {
        HandlerConfig::default()
    }
}

/// 处理器返回结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandlerResult {
    /// 处理后的线性步骤列表
    pub linear_steps: Vec<LinearStep>,
    
    /// 处理统计信息
    pub stats: HandlerStats,
    
    /// 执行元数据
    pub metadata: ResultMetadata,
}

/// 处理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandlerConfig {
    /// 是否启用优化
    pub enable_optimization: bool,
    
    /// 最大执行次数限制
    pub max_iterations: Option<i32>,
    
    /// 错误处理策略
    pub error_strategy: ErrorHandlingStrategy,
    
    /// 超时设置（毫秒）
    pub timeout_ms: Option<u64>,
    
    /// 自定义参数
    pub custom_params: HashMap<String, serde_json::Value>,
}

/// 错误处理策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorHandlingStrategy {
    /// 立即停止
    StopImmediately,
    /// 继续执行
    Continue,
    /// 重试指定次数
    RetryWithLimit(i32),
    /// 跳过当前项目
    SkipCurrent,
}

/// 处理器统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandlerStats {
    /// 处理的原始步骤数
    pub original_steps: usize,
    
    /// 展开后的步骤数
    pub expanded_steps: usize,
    
    /// 处理时间（毫秒）
    pub processing_time_ms: u64,
    
    /// 优化效果
    pub optimization_applied: bool,
    
    /// 资源使用情况
    pub resource_usage: ResourceUsage,
}

/// 资源使用统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUsage {
    /// 内存使用（字节）
    pub memory_bytes: u64,
    
    /// CPU使用率估算
    pub cpu_intensity: CpuIntensity,
    
    /// IO操作次数
    pub io_operations: u64,
}

/// CPU使用强度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CpuIntensity {
    Low,
    Medium,
    High,
    Critical,
}

/// 结果元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultMetadata {
    /// 处理器版本
    pub handler_version: String,
    
    /// 处理时间戳
    pub processed_at: i64,
    
    /// 处理器特定的元数据
    pub handler_specific: HashMap<String, serde_json::Value>,
}

/// 验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    /// 是否通过验证
    pub is_valid: bool,
    
    /// 验证错误列表
    pub errors: Vec<ValidationError>,
    
    /// 验证警告列表
    pub warnings: Vec<ValidationWarning>,
}

/// 验证错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    /// 错误代码
    pub code: String,
    
    /// 错误消息
    pub message: String,
    
    /// 错误位置
    pub location: Option<String>,
}

/// 验证警告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    /// 警告代码
    pub code: String,
    
    /// 警告消息
    pub message: String,
    
    /// 严重程度
    pub severity: WarningSeverity,
}

/// 警告严重程度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WarningSeverity {
    Info,
    Minor,
    Major,
    Critical,
}

/// 成本估算
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostEstimate {
    /// 执行时间估算（毫秒）
    pub execution_time_ms: u64,
    
    /// 内存使用估算（字节）
    pub memory_usage_bytes: u64,
    
    /// 复杂度评级
    pub complexity: ComplexityLevel,
    
    /// 并行化可能性
    pub parallelizable: bool,
}

/// 复杂度级别
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComplexityLevel {
    O1,      // 常数时间
    OLogN,   // 对数时间
    ON,      // 线性时间
    ONLogN,  // 线性对数时间
    ON2,     // 二次时间
    ON3,     // 三次时间
    Exponential, // 指数时间
}

impl Default for HandlerConfig {
    fn default() -> Self {
        Self {
            enable_optimization: true,
            max_iterations: Some(1000),
            error_strategy: ErrorHandlingStrategy::Continue,
            timeout_ms: Some(300_000), // 5分钟
            custom_params: HashMap::new(),
        }
    }
}

impl Default for HandlerStats {
    fn default() -> Self {
        Self {
            original_steps: 0,
            expanded_steps: 0,
            processing_time_ms: 0,
            optimization_applied: false,
            resource_usage: ResourceUsage {
                memory_bytes: 0,
                cpu_intensity: CpuIntensity::Low,
                io_operations: 0,
            },
        }
    }
}

impl ValidationResult {
    /// 创建成功的验证结果
    pub fn success() -> Self {
        Self {
            is_valid: true,
            errors: vec![],
            warnings: vec![],
        }
    }
    
    /// 创建失败的验证结果
    pub fn failure(errors: Vec<ValidationError>) -> Self {
        Self {
            is_valid: false,
            errors,
            warnings: vec![],
        }
    }
    
    /// 添加警告
    pub fn with_warnings(mut self, warnings: Vec<ValidationWarning>) -> Self {
        self.warnings = warnings;
        self
    }
}