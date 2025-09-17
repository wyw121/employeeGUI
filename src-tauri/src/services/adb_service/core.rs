use serde::{Deserialize, Serialize};

/// ADB命令执行结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AdbCommandResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

/// ADB服务核心结构
#[derive(Clone)]
pub struct AdbService;

impl AdbService {
    /// 创建新的ADB服务实例
    pub fn new() -> Self {
        AdbService
    }
}

impl Default for AdbService {
    fn default() -> Self {
        Self::new()
    }
}