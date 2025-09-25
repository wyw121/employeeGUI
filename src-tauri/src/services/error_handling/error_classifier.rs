/// 错误分类器 - 识别和分类不同类型的ADB和UI自动化错误
use std::collections::HashMap;
use regex::Regex;
use tracing::debug;

/// 错误类型枚举
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ErrorType {
    /// UI dump失败
    UiDumpFailed,
    /// 设备未找到
    DeviceNotFound,
    /// 权限被拒绝
    PermissionDenied,
    /// 临时连接丢失
    TemporaryConnectionLoss,
    /// 设备忙碌
    DeviceBusy,
    /// 无效命令
    InvalidCommand,
    /// 服务临时不可用
    ServiceTemporarilyUnavailable,
    /// ADB命令执行失败
    AdbCommandFailed,
    /// 元素未找到
    ElementNotFound,
    /// 未知错误
    Unknown,
}

/// 错误模式定义
#[derive(Debug, Clone)]
pub struct ErrorPattern {
    /// 错误类型
    pub error_type: ErrorType,
    /// 匹配模式（正则表达式）
    pub pattern: Regex,
    /// 模式描述
    pub description: String,
    /// 优先级（数字越小优先级越高）
    pub priority: u8,
}

impl ErrorPattern {
    fn new(error_type: ErrorType, pattern: &str, description: &str, priority: u8) -> Self {
        Self {
            error_type,
            pattern: Regex::new(pattern).unwrap_or_else(|_| {
                // 如果正则表达式无效，使用永远不匹配的模式
                Regex::new(r"(?!)").unwrap()
            }),
            description: description.to_string(),
            priority,
        }
    }
}

/// 错误分类器
pub struct ErrorClassifier {
    patterns: Vec<ErrorPattern>,
    classification_cache: HashMap<String, ErrorType>,
}

impl ErrorClassifier {
    pub fn new() -> Self {
        let mut classifier = Self {
            patterns: Vec::new(),
            classification_cache: HashMap::new(),
        };
        
        classifier.initialize_patterns();
        classifier
    }

    /// 初始化错误匹配模式
    fn initialize_patterns(&mut self) {
        // UI dump失败相关错误
        self.add_pattern(
            ErrorType::UiDumpFailed,
            r"(?i)null root node returned by UiTestAutomationBridge",
            "UiTestAutomationBridge返回null root node",
            1
        );

        self.add_pattern(
            ErrorType::UiDumpFailed,
            r"(?i)No such file or directory.*ui_dump\.xml",
            "UI dump文件不存在",
            2
        );

        // 一些系统/工具的错误输出顺序相反（先文件名，后错误描述）
        self.add_pattern(
            ErrorType::UiDumpFailed,
            r"(?i)ui_dump\.xml.*No such file or directory",
            "UI dump文件不存在（错误信息顺序反转）",
            2
        );

        self.add_pattern(
            ErrorType::UiDumpFailed,
            r"(?i)ERROR.*uiautomator.*dump",
            "uiautomator dump命令执行失败",
            3
        );

        self.add_pattern(
            ErrorType::UiDumpFailed,
            r"(?i)could not get idle state|waitForIdle.*timeout",
            "UI等待idle状态超时",
            4
        );

        // 设备连接相关错误
        self.add_pattern(
            ErrorType::DeviceNotFound,
            r"(?i)device.*not found|no devices/emulators found",
            "设备未找到",
            1
        );

        self.add_pattern(
            ErrorType::DeviceNotFound,
            r"(?i)device offline|device unauthorized",
            "设备离线或未授权",
            2
        );

        self.add_pattern(
            ErrorType::TemporaryConnectionLoss,
            r"(?i)connection refused|connection reset|connection timed out",
            "连接被拒绝/重置/超时",
            1
        );

        self.add_pattern(
            ErrorType::TemporaryConnectionLoss,
            r"(?i)broken pipe|protocol failure",
            "管道破坏或协议失败",
            2
        );

        // 权限相关错误
        self.add_pattern(
            ErrorType::PermissionDenied,
            r"(?i)permission denied|access denied",
            "权限被拒绝",
            1
        );

        self.add_pattern(
            ErrorType::PermissionDenied,
            r"(?i)insufficient permissions|not permitted",
            "权限不足",
            2
        );

        // 设备忙碌
        self.add_pattern(
            ErrorType::DeviceBusy,
            r"(?i)device busy|resource busy|another.*process.*using",
            "设备或资源忙碌",
            1
        );

        self.add_pattern(
            ErrorType::DeviceBusy,
            r"(?i)try again later|operation in progress",
            "操作进行中，请稍后重试",
            2
        );

        // 服务不可用
        self.add_pattern(
            ErrorType::ServiceTemporarilyUnavailable,
            r"(?i)service not available|service unavailable",
            "服务不可用",
            1
        );

        self.add_pattern(
            ErrorType::ServiceTemporarilyUnavailable,
            r"(?i)adb server.*not running|restart.*adb server",
            "ADB服务未运行",
            2
        );

        // 无效命令
        self.add_pattern(
            ErrorType::InvalidCommand,
            r"(?i)command not found|unknown command|invalid.*command",
            "命令无效或未找到",
            1
        );

        self.add_pattern(
            ErrorType::InvalidCommand,
            r"(?i)syntax error|malformed.*command",
            "命令语法错误",
            2
        );

        // ADB命令执行失败
        self.add_pattern(
            ErrorType::AdbCommandFailed,
            r"(?i)adb.*failed|command.*failed|execution.*failed",
            "ADB命令执行失败",
            1
        );

        self.add_pattern(
            ErrorType::AdbCommandFailed,
            r"(?i)shell.*failed|input.*failed|tap.*failed",
            "ADB shell命令执行失败",
            2
        );

        // 元素未找到
        self.add_pattern(
            ErrorType::ElementNotFound,
            r"(?i)element not found|no.*element|element.*not.*exist",
            "UI元素未找到",
            1
        );

        self.add_pattern(
            ErrorType::ElementNotFound,
            r"(?i)bounds.*not.*found|coordinate.*invalid",
            "元素坐标或边界无效",
            2
        );

        // 按优先级排序
        self.patterns.sort_by_key(|p| (p.error_type.clone() as u8, p.priority));
    }

    /// 添加错误匹配模式
    fn add_pattern(&mut self, error_type: ErrorType, pattern: &str, description: &str, priority: u8) {
        if let Some(error_pattern) = self.try_create_pattern(error_type, pattern, description, priority) {
            self.patterns.push(error_pattern);
        }
    }

    fn try_create_pattern(&self, error_type: ErrorType, pattern: &str, description: &str, priority: u8) -> Option<ErrorPattern> {
        match Regex::new(pattern) {
            Ok(regex) => Some(ErrorPattern {
                error_type,
                pattern: regex,
                description: description.to_string(),
                priority,
            }),
            Err(e) => {
                debug!("⚠️  无法创建正则表达式模式 '{}': {}", pattern, e);
                None
            }
        }
    }

    /// 分类错误
    pub fn classify_error(&mut self, error_message: &str) -> ErrorType {
        // 检查缓存
        if let Some(cached_type) = self.classification_cache.get(error_message) {
            return cached_type.clone();
        }

        // 遍历所有模式进行匹配
        for pattern in &self.patterns {
            if pattern.pattern.is_match(error_message) {
                debug!("🎯 错误匹配成功: {} -> {:?} ({})", 
                    error_message, pattern.error_type, pattern.description);
                
                // 缓存结果
                self.classification_cache.insert(
                    error_message.to_string(), 
                    pattern.error_type.clone()
                );
                
                return pattern.error_type.clone();
            }
        }

        debug!("🤷 未知错误类型: {}", error_message);
        
        // 缓存未知错误
        self.classification_cache.insert(
            error_message.to_string(), 
            ErrorType::Unknown
        );
        
        ErrorType::Unknown
    }

    /// 获取错误类型的描述信息
    pub fn get_error_description(&self, error_type: &ErrorType) -> String {
        match error_type {
            ErrorType::UiDumpFailed => "UI结构dump操作失败，可能是界面未准备就绪或系统繁忙".to_string(),
            ErrorType::DeviceNotFound => "目标设备未找到，请检查设备连接和ADB状态".to_string(),
            ErrorType::PermissionDenied => "操作权限被拒绝，请检查ADB授权和应用权限".to_string(),
            ErrorType::TemporaryConnectionLoss => "临时连接丢失，通常可以通过重试解决".to_string(),
            ErrorType::DeviceBusy => "设备当前忙碌，稍后重试可能会成功".to_string(),
            ErrorType::InvalidCommand => "命令格式无效，请检查命令语法".to_string(),
            ErrorType::ServiceTemporarilyUnavailable => "服务暂时不可用，可能需要重启相关服务".to_string(),
            ErrorType::AdbCommandFailed => "ADB命令执行失败，检查设备状态和命令正确性".to_string(),
            ErrorType::ElementNotFound => "UI元素未找到，可能界面已变化或元素定位信息过期".to_string(),
            ErrorType::Unknown => "未知错误类型，需要人工分析".to_string(),
        }
    }

    /// 获取错误严重程度
    pub fn get_error_severity(&self, error_type: &ErrorType) -> ErrorSeverity {
        match error_type {
            ErrorType::UiDumpFailed 
            | ErrorType::DeviceBusy 
            | ErrorType::TemporaryConnectionLoss 
            | ErrorType::AdbCommandFailed => {
                ErrorSeverity::Recoverable
            },
            ErrorType::ServiceTemporarilyUnavailable => ErrorSeverity::Warning,
            ErrorType::DeviceNotFound 
            | ErrorType::PermissionDenied 
            | ErrorType::InvalidCommand 
            | ErrorType::ElementNotFound => {
                ErrorSeverity::Critical
            },
            ErrorType::Unknown => ErrorSeverity::Unknown,
        }
    }

    /// 清理缓存（可选，用于长时间运行的服务）
    pub fn clear_cache(&mut self) {
        self.classification_cache.clear();
    }

    /// 获取缓存统计信息
    pub fn get_cache_stats(&self) -> (usize, usize) {
        (self.classification_cache.len(), self.patterns.len())
    }

    /// 获取错误分类统计信息
    pub fn get_statistics(&self) -> ErrorClassificationStats {
        ErrorClassificationStats {
            total_patterns: self.patterns.len(),
            cache_size: self.classification_cache.len(),
            cache_hit_rate: 0.0, // 简化实现
        }
    }

    /// 重置统计信息
    pub fn reset_statistics(&mut self) {
        self.classification_cache.clear();
    }
}

/// 错误分类统计信息
#[derive(Debug)]
pub struct ErrorClassificationStats {
    pub total_patterns: usize,
    pub cache_size: usize,
    pub cache_hit_rate: f64,
}

impl ErrorClassificationStats {
    pub fn generate_report(&self) -> String {
        format!(
            "错误分类器统计:\n\
            - 总模式数: {}\n\
            - 缓存条目数: {}\n\
            - 缓存命中率: {:.1}%",
            self.total_patterns,
            self.cache_size,
            self.cache_hit_rate * 100.0
        )
    }
}

/// 错误严重程度
#[derive(Debug, Clone, PartialEq)]
pub enum ErrorSeverity {
    /// 可恢复的错误
    Recoverable,
    /// 警告级别
    Warning,
    /// 严重错误
    Critical,
    /// 未知严重程度
    Unknown,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ui_dump_error_classification() {
        let mut classifier = ErrorClassifier::new();
        
        let error_msg = "ERROR: null root node returned by UiTestAutomationBridge.";
        assert_eq!(classifier.classify_error(error_msg), ErrorType::UiDumpFailed);
        
        let error_msg2 = "cat: /sdcard/ui_dump.xml: No such file or directory";
        assert_eq!(classifier.classify_error(error_msg2), ErrorType::UiDumpFailed);
    }

    #[test]
    fn test_device_connection_error_classification() {
        let mut classifier = ErrorClassifier::new();
        
        let error_msg = "adb: device not found";
        assert_eq!(classifier.classify_error(error_msg), ErrorType::DeviceNotFound);
        
        let error_msg2 = "connection refused";
        assert_eq!(classifier.classify_error(error_msg2), ErrorType::TemporaryConnectionLoss);
    }

    #[test]
    fn test_error_caching() {
        let mut classifier = ErrorClassifier::new();
        
        let error_msg = "ERROR: null root node returned by UiTestAutomationBridge.";
        
        // 第一次分类
        let result1 = classifier.classify_error(error_msg);
        // 第二次应该从缓存获取
        let result2 = classifier.classify_error(error_msg);
        
        assert_eq!(result1, result2);
        assert_eq!(result1, ErrorType::UiDumpFailed);
    }
}