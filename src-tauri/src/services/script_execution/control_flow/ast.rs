/// 模块一：抽象语法树（AST）定义
/// 
/// 职责：
/// - 定义统一的控制流抽象
/// - 支持各种控制结构的表示
/// - 为扩展新控制结构提供基础

use serde::{Deserialize, Serialize};
use crate::services::execution::model::SmartScriptStep;

/// 控制流节点类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ControlFlowType {
    /// 顺序执行块
    Sequential,
    
    /// 循环控制
    Loop {
        iterations: i32,
        is_infinite: bool,
        condition: Option<String>, // 未来支持条件循环
    },
    
    /// 条件分支 (未来扩展)
    Conditional {
        condition: String,
        condition_type: ConditionalType,
    },
    
    /// 异常处理 (未来扩展)
    Trycatch {
        catch_types: Vec<String>,
    },
    
    /// 并行执行 (未来扩展)
    Parallel {
        max_concurrency: i32,
    },
}

/// 条件类型枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConditionalType {
    /// 元素存在性检查
    ElementExists(String),
    /// 文本匹配检查
    TextMatches(String),
    /// 自定义条件表达式
    CustomExpression(String),
}

/// 控制流AST节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlFlowNode {
    /// 节点唯一标识
    pub id: String,
    
    /// 控制流类型
    pub flow_type: ControlFlowType,
    
    /// 包含的步骤
    pub steps: Vec<SmartScriptStep>,
    
    /// 子节点（支持嵌套控制结构）
    pub children: Vec<ControlFlowNode>,
    
    /// 节点元数据
    pub metadata: ControlFlowMetadata,
}

/// 控制流元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlFlowMetadata {
    /// 节点名称
    pub name: String,
    
    /// 是否启用
    pub enabled: bool,
    
    /// 执行顺序
    pub order: i32,
    
    /// 错误处理策略
    pub error_strategy: ErrorStrategy,
    
    /// 性能统计
    pub performance_hints: Option<PerformanceHints>,
}

/// 错误处理策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorStrategy {
    /// 停止执行
    Stop,
    /// 继续执行
    Continue,
    /// 重试指定次数
    Retry(i32),
    /// 回滚到检查点
    Rollback(String),
}

/// 性能优化提示
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceHints {
    /// 预估执行时间（毫秒）
    pub estimated_duration_ms: u64,
    /// 是否可以并行化
    pub parallelizable: bool,
    /// 资源使用量级别
    pub resource_intensity: ResourceIntensity,
}

/// 资源使用强度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResourceIntensity {
    Low,    // 低资源消耗
    Medium, // 中等资源消耗
    High,   // 高资源消耗
}

/// 执行计划（AST的线性化表示）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionPlan {
    /// 线性化后的步骤列表
    pub linear_steps: Vec<LinearStep>,
    
    /// 执行统计信息
    pub stats: ExecutionStats,
}

/// 线性化步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinearStep {
    /// 原始步骤
    pub step: SmartScriptStep,
    
    /// 执行上下文信息
    pub context: StepContext,
}

/// 步骤执行上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepContext {
    /// 来源控制流节点ID
    pub source_node_id: String,
    
    /// 循环迭代次数（如果在循环中）
    pub loop_iteration: Option<i32>,
    
    /// 条件分支路径（如果在条件中）
    pub conditional_path: Option<String>,
    
    /// 嵌套层级
    pub nesting_level: i32,
}

/// 执行统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStats {
    /// 总步骤数
    pub total_steps: usize,
    
    /// 控制结构数量统计
    pub control_structure_count: ControlStructureCount,
    
    /// 预估执行时间
    pub estimated_duration_ms: u64,
    
    /// 复杂度评级
    pub complexity_rating: ComplexityRating,
}

/// 控制结构数量统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlStructureCount {
    pub loops: i32,
    pub conditionals: i32,
    pub try_catches: i32,
    pub parallels: i32,
}

/// 复杂度评级
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComplexityRating {
    Simple,    // 简单：只有顺序执行
    Moderate,  // 中等：包含循环或条件
    Complex,   // 复杂：多重嵌套
    Advanced,  // 高级：复杂嵌套+并行
}

impl ControlFlowNode {
    /// 创建顺序执行节点
    pub fn sequential(id: String, name: String, steps: Vec<SmartScriptStep>) -> Self {
        Self {
            id,
            flow_type: ControlFlowType::Sequential,
            steps,
            children: vec![],
            metadata: ControlFlowMetadata {
                name,
                enabled: true,
                order: 0,
                error_strategy: ErrorStrategy::Continue,
                performance_hints: None,
            },
        }
    }
    
    /// 创建循环节点
    pub fn loop_node(
        id: String, 
        name: String, 
        iterations: i32, 
        is_infinite: bool,
        children: Vec<ControlFlowNode>
    ) -> Self {
        Self {
            id,
            flow_type: ControlFlowType::Loop { iterations, is_infinite, condition: None },
            steps: vec![],
            children,
            metadata: ControlFlowMetadata {
                name,
                enabled: true,
                order: 0,
                error_strategy: ErrorStrategy::Continue,
                performance_hints: Some(PerformanceHints {
                    estimated_duration_ms: 0, // 需要计算
                    parallelizable: false,
                    resource_intensity: ResourceIntensity::Medium,
                }),
            },
        }
    }
    
    /// 获取节点深度
    pub fn depth(&self) -> i32 {
        if self.children.is_empty() {
            1
        } else {
            1 + self.children.iter().map(|child| child.depth()).max().unwrap_or(0)
        }
    }
    
    /// 计算总步骤数（包括展开的循环）
    pub fn total_step_count(&self) -> usize {
        let mut count = self.steps.len();
        
        for child in &self.children {
            let child_count = child.total_step_count();
            
            // 如果是循环，需要乘以迭代次数
            match &self.flow_type {
                ControlFlowType::Loop { iterations, is_infinite, .. } => {
                    let iter_count = if *is_infinite { 1000 } else { *iterations as usize };
                    count += child_count * iter_count;
                },
                _ => {
                    count += child_count;
                }
            }
        }
        
        count
    }
}