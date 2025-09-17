// Universal UI Finder - 通用UI自动化定位模块
// 支持任意Android应用的UI元素智能查找和用户交互

pub mod core;
pub mod config;
pub mod logger;
pub mod detector;
pub mod executor;

pub use core::*;
pub use config::*;
pub use logger::*;
pub use detector::*;
pub use executor::*;

use tokio::time::Duration;

/// 通用UI查找器 - 主入口
/// 
/// 这是一个完全通用的模块，可以适配任何Android应用
/// 具备智能日志记录和用户交互功能
/// 
/// # 特性
/// - 🎯 智能UI元素定位 (支持文本、坐标、属性等多维度匹配)
/// - 📊 详细的用户友好日志 (实时反馈查找过程)
/// - 🔧 交互式错误处理 (失败时引导用户手动干预)
/// - 🚀 预操作支持 (自动处理侧边栏展开等前置步骤)
/// - 🔄 多应用适配 (配置驱动，无需修改代码)
/// 
/// # 使用示例
/// ```rust
/// let finder = UniversalUIFinder::new("adb", None)?;
/// 
/// // 查找任意应用的任意按钮
/// let result = finder.find_and_click(FindRequest {
///     app_name: "小红书".to_string(),
///     target_text: "关注好友".to_string(),
///     position_hint: Some("左侧边栏".to_string()),
///     pre_actions: Some(vec!["右滑展开".to_string()]),
///     user_guidance: true, // 启用用户交互
/// }).await?;
/// ```
pub struct UniversalUIFinder {
    core: UIFinderCore,
    logger: InteractiveLogger,
    detector: AppDetector,
    executor: ActionExecutor,
    config_manager: AppConfigManager,
}

impl UniversalUIFinder {
    /// 创建新的通用UI查找器实例
    pub fn new(adb_path: &str, device_id: Option<String>) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            core: UIFinderCore::new(adb_path, device_id.clone())?,
            logger: InteractiveLogger::new(true), // 默认启用详细日志
            detector: AppDetector::new(adb_path, device_id.clone())?,
            executor: ActionExecutor::new(adb_path, device_id)?,
            config_manager: AppConfigManager::new(),
        })
    }
    
    /// 主要的查找并点击方法 - 适配所有应用和直接ADB模式
    pub async fn find_and_click(&mut self, request: FindRequest) -> Result<ClickResult, FindError> {
        self.logger.start_session(&request);
        
        // 第一步：应用检测与启动 (可选)
        if let Some(app_name) = &request.app_name {
            // 指定程序模式：执行应用检测和准备步骤
            let _app_status = self.detector.detect_and_prepare_app(&request, &mut self.logger).await?;
        } else {
            // 直接ADB模式：跳过应用检测，记录日志
            if self.logger.enabled {
                println!("🔧 直接ADB模式：跳过应用检测步骤");
                println!("   ⚡ 假设当前界面已准备就绪");
            }
        }
        
        // 第二步：UI元素查找与交互式处理
        let element = self.core.find_element_with_guidance(&request, &mut self.logger).await?;
        
        // 第三步：执行点击操作
        let result = self.executor.execute_click(&element, &request, &mut self.logger).await?;
        
        self.logger.complete_session(&result);
        Ok(result)
    }
    
    /// 便捷方法：通过应用名和按钮文本快速查找点击
    pub async fn quick_click(&mut self, app_name: &str, button_text: &str) 
        -> Result<ClickResult, FindError> {
        
        let request = self.config_manager
            .create_find_request(app_name, button_text, None)
            .map_err(|e| FindError::ExecutionFailed(e))?;
            
        self.find_and_click(request).await
    }
    
    /// 智能推断并点击 (带位置提示)
    pub async fn smart_click(&mut self, app_name: &str, button_text: &str, position_hint: &str) 
        -> Result<ClickResult, FindError> {
        
        let request = self.config_manager
            .create_find_request(app_name, button_text, Some(position_hint))
            .map_err(|e| FindError::ExecutionFailed(e))?;
            
        self.find_and_click(request).await
    }
    
    /// 🆕 直接ADB点击 (跳过应用检测)
    pub async fn direct_click(&mut self, button_text: &str, position_hint: Option<&str>) 
        -> Result<ClickResult, FindError> {
        
        let request = FindRequest {
            app_name: None, // 关键：不指定应用名，跳过应用检测
            target_text: button_text.to_string(),
            position_hint: position_hint.map(|s| s.to_string()),
            pre_actions: None, // 直接ADB模式通常不需要预操作
            user_guidance: true, // 保持用户交互
            timeout: Some(30),
            retry_count: Some(3),
        };
        
        self.find_and_click(request).await
    }
    
    /// 🆕 直接ADB点击 (带预操作)
    pub async fn direct_click_with_actions(&mut self, button_text: &str, position_hint: Option<&str>, pre_actions: Vec<String>) 
        -> Result<ClickResult, FindError> {
        
        let request = FindRequest {
            app_name: None, // 跳过应用检测
            target_text: button_text.to_string(),
            position_hint: position_hint.map(|s| s.to_string()),
            pre_actions: Some(pre_actions),
            user_guidance: true,
            timeout: Some(30),
            retry_count: Some(3),
        };
        
        self.find_and_click(request).await
    }
    
    /// 批量操作：依次点击多个按钮
    pub async fn batch_click(&mut self, operations: Vec<BatchOperation>) 
        -> Result<Vec<ClickResult>, FindError> {
        
        let mut results = Vec::new();
        let total_operations = operations.len();
        
        for operation in operations {
            println!("🔄 执行批量操作 {}/{}", results.len() + 1, total_operations);
            
            let result = self.smart_click(
                &operation.app_name,
                &operation.button_text,
                &operation.position_hint.unwrap_or_default()
            ).await?;
            
            results.push(result);
            
            // 操作间隔
            if let Some(delay) = operation.delay_after {
                tokio::time::sleep(Duration::from_millis(delay)).await;
            }
        }
        
        Ok(results)
    }
    
    /// 获取支持的应用列表
    pub fn get_supported_apps(&self) -> Vec<String> {
        self.config_manager.get_supported_apps()
    }
    
    /// 添加自定义应用配置
    pub fn add_custom_app(&mut self, app_name: String, config: AppConfig) {
        self.config_manager.add_app_config(app_name, config);
    }
    
    /// 设置日志级别
    pub fn set_logging(&mut self, enabled: bool, detailed: bool) {
        self.logger.set_enabled(enabled);
        self.logger.set_detailed(detailed);
    }
    
    /// 仅查找元素，不执行点击
    pub async fn find_element_only(&mut self, request: FindRequest) -> Result<UniversalUIElement, FindError> {
        // 如果指定了应用名，执行应用检测；否则跳过
        if let Some(_app_name) = &request.app_name {
            let _app_status = self.detector.detect_and_prepare_app(&request, &mut self.logger).await?;
        }
        
        self.core.find_element_with_guidance(&request, &mut self.logger).await
    }
}

/// 查找请求配置
#[derive(Debug, Clone)]
pub struct FindRequest {
    /// 目标应用名称 (如 "小红书", "微信", "支付宝")
    /// None 表示跳过应用检测，直接执行ADB操作
    pub app_name: Option<String>,
    
    /// 目标按钮文本 (如 "我", "关注好友", "设置")  
    pub target_text: String,
    
    /// 位置提示 (如 "下方导航栏", "左侧边栏", "顶部工具栏")
    pub position_hint: Option<String>,
    
    /// 预操作步骤 (如 ["右滑展开", "等待动画"])
    pub pre_actions: Option<Vec<String>>,
    
    /// 是否启用用户交互引导
    pub user_guidance: bool,
    
    /// 超时时间 (秒)
    pub timeout: Option<u64>,
    
    /// 重试次数
    pub retry_count: Option<u32>,
}

/// 点击结果
#[derive(Debug)]
pub struct ClickResult {
    pub success: bool,
    pub element_found: bool,
    pub click_executed: bool,
    pub execution_time: std::time::Duration,
    pub found_element: Option<UniversalUIElement>,
    pub user_intervention: bool, // 是否需要用户手动干预
    pub error_message: Option<String>,
}

/// 批量操作配置
#[derive(Debug, Clone)]
pub struct BatchOperation {
    pub app_name: String,
    pub button_text: String,
    pub position_hint: Option<String>,
    pub delay_after: Option<u64>, // 操作后延迟时间(毫秒)
}

/// 查找错误类型
#[derive(Debug)]
pub enum FindError {
    AppNotFound(String),
    AppNotOpened(String), 
    ElementNotFound(String),
    UserSkipped(String),
    ExecutionFailed(String),
    Timeout(String),
}

impl std::fmt::Display for FindError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            FindError::AppNotFound(msg) => write!(f, "应用未找到: {}", msg),
            FindError::AppNotOpened(msg) => write!(f, "应用未打开: {}", msg),
            FindError::ElementNotFound(msg) => write!(f, "UI元素未找到: {}", msg),
            FindError::UserSkipped(msg) => write!(f, "用户跳过: {}", msg),
            FindError::ExecutionFailed(msg) => write!(f, "执行失败: {}", msg),
            FindError::Timeout(msg) => write!(f, "操作超时: {}", msg),
        }
    }
}

impl std::error::Error for FindError {}

// 错误转换实现
impl From<Box<dyn std::error::Error>> for FindError {
    fn from(err: Box<dyn std::error::Error>) -> Self {
        FindError::ExecutionFailed(err.to_string())
    }
}
