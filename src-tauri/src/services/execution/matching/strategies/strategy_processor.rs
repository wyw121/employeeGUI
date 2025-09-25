//! strategy_processor.rs - 策略处理器接口和通用类型
//! 
//! 定义了所有匹配策略处理器需要实现的接口，以及相关的数据结构。

use std::collections::HashMap;
use serde_json::Value;
use anyhow::Result;
use async_trait::async_trait;

/// 匹配上下文 - 包含所有匹配所需的信息
#[derive(Debug, Clone)]
pub struct MatchingContext {
    pub strategy: String,
    pub fields: Vec<String>,
    pub values: HashMap<String, String>,
    pub includes: HashMap<String, Vec<String>>,
    pub excludes: HashMap<String, Vec<String>>,
    /// 每字段匹配模式：equals | contains | regex
    pub match_mode: HashMap<String, String>,
    /// 每字段“必须匹配”的正则
    pub regex_includes: HashMap<String, Vec<String>>,
    /// 每字段“不可匹配”的正则
    pub regex_excludes: HashMap<String, Vec<String>>,
    pub fallback_bounds: Option<Value>,
    pub device_id: String,
}

/// 策略处理结果
#[derive(Debug, Clone)]
pub struct StrategyResult {
    pub success: bool,
    pub message: String,
    pub coordinates: Option<(i32, i32)>,
    pub bounds: Option<String>,
    pub matched_element: Option<String>,
    pub fallback_used: bool,
}

/// 处理错误类型
#[derive(Debug)]
pub enum ProcessingError {
    UnsupportedStrategy(String),
    InvalidParameters(String),
    MatchingFailed(String),
    XmlParsingFailed(String),
    CoordinateCalculationFailed(String),
}

impl std::fmt::Display for ProcessingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProcessingError::UnsupportedStrategy(s) => write!(f, "策略不支持: {}", s),
            ProcessingError::InvalidParameters(s) => write!(f, "参数无效: {}", s),
            ProcessingError::MatchingFailed(s) => write!(f, "匹配失败: {}", s),
            ProcessingError::XmlParsingFailed(s) => write!(f, "XML 解析失败: {}", s),
            ProcessingError::CoordinateCalculationFailed(s) => write!(f, "坐标计算失败: {}", s),
        }
    }
}

impl std::error::Error for ProcessingError {}

/// 策略处理器接口
#[async_trait]
pub trait StrategyProcessor {
    /// 处理匹配请求
    async fn process(&self, context: &mut MatchingContext, logs: &mut Vec<String>) -> Result<StrategyResult, ProcessingError>;
    
    /// 验证策略参数
    fn validate_parameters(&self, context: &MatchingContext) -> Result<(), ProcessingError>;
    
    /// 获取策略名称
    fn strategy_name(&self) -> &'static str;
    
    /// 是否需要忽略固化坐标
    fn should_ignore_fallback_bounds(&self) -> bool {
        true // 默认忽略，只有 absolute 策略使用固化坐标
    }
    
    /// 获取优先级（数字越小优先级越高）
    fn priority(&self) -> u8 {
        100 // 默认优先级
    }
}

impl StrategyResult {
    pub fn success(message: String, coordinates: (i32, i32)) -> Self {
        Self {
            success: true,
            message,
            coordinates: Some(coordinates),
            bounds: None,
            matched_element: None,
            fallback_used: false,
        }
    }
    
    pub fn success_with_bounds(message: String, coordinates: (i32, i32), bounds: String) -> Self {
        Self {
            success: true,
            message,
            coordinates: Some(coordinates),
            bounds: Some(bounds),
            matched_element: None,
            fallback_used: false,
        }
    }
    
    pub fn fallback_success(message: String, coordinates: (i32, i32)) -> Self {
        Self {
            success: true,
            message,
            coordinates: Some(coordinates),
            bounds: None,
            matched_element: None,
            fallback_used: true,
        }
    }
    
    pub fn failure(message: String) -> Self {
        Self {
            success: false,
            message,
            coordinates: None,
            bounds: None,
            matched_element: None,
            fallback_used: false,
        }
    }
}