use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::time::Duration;
use tauri::command;
use tokio::time::sleep;
use tracing::{error, info, warn};
use regex::Regex;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// ==================== 智能操作类型 ====================

/// 增强的操作类型，支持智能识别和验证
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SmartActionType {
    // 基础操作
    Tap,
    Swipe,
    Input,
    Wait,
    
    // 智能操作
    SmartTap,           // 智能点击，支持动态坐标识别
    SmartFindElement,   // 智能元素查找
    RecognizePage,      // 页面状态识别
    VerifyAction,       // 操作结果验证
    SmartLoop,          // 智能循环
    ConditionalAction,  // 条件操作
    WaitForPageState,   // 等待页面状态
    ExtractElement,     // 提取UI元素信息
    SmartNavigation,    // 智能导航
    
    // 复合操作
    CompleteWorkflow,   // 完整工作流程
}

// ==================== 页面状态系统 ====================

/// 通用页面状态枚举
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PageState {
    Unknown,
    Home,
    AppMainPage,
    Loading,
    Dialog,
    Settings,
    ListPage,
    DetailPage,
    Custom(String),     // 自定义页面状态
}

/// 页面识别结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageRecognitionResult {
    pub current_state: PageState,
    pub confidence: f32,
    pub key_elements: Vec<String>,
    pub ui_elements: Vec<SmartUIElement>,
    pub message: String,
    pub timestamp: String,
}

// ==================== UI元素系统 ====================

/// 智能UI元素
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartUIElement {
    pub element_type: UIElementType,
    pub text: String,
    pub bounds: (i32, i32, i32, i32), // (left, top, right, bottom)
    pub center: (i32, i32),           // 中心点坐标
    pub clickable: bool,
    pub visible: bool,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
    pub content_desc: Option<String>,
    pub package: Option<String>,
}

/// UI元素类型
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UIElementType {
    Button,
    TextView,
    EditText,
    ImageView,
    ListView,
    ScrollView,
    LinearLayout,
    RelativeLayout,
    FrameLayout,
    Unknown,
}

// ==================== 查找条件系统 ====================

/// 元素查找条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementFindCondition {
    pub text_contains: Option<String>,
    pub text_equals: Option<String>,
    pub text_regex: Option<String>,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
    pub content_desc: Option<String>,
    pub clickable: Option<bool>,
    pub visible: Option<bool>,
    pub bounds_filter: Option<BoundsFilter>,
    pub element_type: Option<UIElementType>,
}

/// 坐标范围过滤器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundsFilter {
    pub min_x: Option<i32>,
    pub max_x: Option<i32>,
    pub min_y: Option<i32>,
    pub max_y: Option<i32>,
    pub min_width: Option<i32>,
    pub max_width: Option<i32>,
    pub min_height: Option<i32>,
    pub max_height: Option<i32>,
}

// ==================== 验证条件系统 ====================

/// 操作验证条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationCondition {
    pub verify_type: VerificationType,
    pub expected_result: String,
    pub timeout_ms: u64,
    pub retry_count: u32,
    pub retry_interval_ms: u64,
}

/// 验证类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VerificationType {
    TextChange,          // 文本变化验证
    PageStateChange,     // 页面状态变化
    ElementExists,       // 元素存在性验证
    ElementDisappears,   // 元素消失验证
    ElementTextEquals,   // 元素文本等于
    ElementTextContains, // 元素文本包含
    Custom(String),      // 自定义验证逻辑
}

// ==================== 智能脚本步骤 ====================

/// 增强的脚本步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartScriptStep {
    pub id: String,
    pub step_type: SmartActionType,
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
    pub enabled: bool,
    pub order: i32,
    
    // 智能功能
    pub find_condition: Option<ElementFindCondition>,
    pub verification: Option<VerificationCondition>,
    pub retry_config: Option<RetryConfig>,
    pub fallback_actions: Vec<SmartScriptStep>,
    pub pre_conditions: Vec<PageState>,
    pub post_conditions: Vec<PageState>,
}

/// 重试配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub retry_interval_ms: u64,
    pub retry_on_failure: bool,
    pub retry_on_verification_fail: bool,
    pub exponential_backoff: bool,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_interval_ms: 1000,
            retry_on_failure: true,
            retry_on_verification_fail: true,
            exponential_backoff: false,
        }
    }
}

// ==================== 执行结果系统 ====================

/// 智能执行结果
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartExecutionResult {
    pub success: bool,
    pub total_steps: u32,
    pub executed_steps: u32,
    pub failed_steps: u32,
    pub skipped_steps: u32,
    pub duration_ms: u64,
    pub logs: Vec<SmartExecutionLog>,
    pub final_page_state: Option<PageState>,
    pub extracted_data: HashMap<String, serde_json::Value>,
    pub message: String,
}

/// 智能执行日志
#[derive(Debug, Serialize, Deserialize)]
pub struct SmartExecutionLog {
    pub step_id: String,
    pub step_name: String,
    pub status: ExecutionStatus,
    pub message: String,
    pub timestamp: String,
    pub duration_ms: u64,
    pub retry_count: u32,
    pub page_state_before: Option<PageState>,
    pub page_state_after: Option<PageState>,
    pub found_elements: Vec<SmartUIElement>,
    pub verification_result: Option<VerificationResult>,
    pub extracted_data: Option<serde_json::Value>,
}

/// 执行状态
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionStatus {
    Pending,
    Running,
    Success,
    Failed,
    Skipped,
    Retrying,
    VerificationFailed,
}

/// 验证结果
#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationResult {
    pub success: bool,
    pub expected: String,
    pub actual: String,
    pub message: String,
}

// ==================== 智能脚本执行器 ====================

/// 智能脚本执行器主类
pub struct SmartScriptExecutor {
    pub device_id: String,
    pub adb_path: String,
    pub config: ExecutorConfig,
}

/// 执行器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutorConfig {
    pub default_timeout_ms: u64,
    pub default_retry_count: u32,
    pub page_recognition_enabled: bool,
    pub auto_verification_enabled: bool,
    pub smart_recovery_enabled: bool,
    pub detailed_logging: bool,
}

impl Default for ExecutorConfig {
    fn default() -> Self {
        Self {
            default_timeout_ms: 10000,
            default_retry_count: 3,
            page_recognition_enabled: true,
            auto_verification_enabled: true,
            smart_recovery_enabled: true,
            detailed_logging: true,
        }
    }
}

impl SmartScriptExecutor {
    /// 创建智能脚本执行器
    pub fn new(device_id: String) -> Self {
        let adb_path = crate::utils::adb_utils::get_adb_path();
        
        Self {
            device_id,
            adb_path,
            config: ExecutorConfig::default(),
        }
    }

    /// 创建带自定义配置的执行器
    pub fn new_with_config(device_id: String, config: ExecutorConfig) -> Self {
        let adb_path = crate::utils::adb_utils::get_adb_path();
        
        Self {
            device_id,
            adb_path,
            config,
        }
    }

    /// 执行智能脚本
    pub async fn execute_smart_script(&self, steps: Vec<SmartScriptStep>) -> Result<SmartExecutionResult> {
        let start_time = std::time::Instant::now();
        let mut logs = Vec::new();
        let mut executed_steps = 0;
        let mut failed_steps = 0;
        let mut skipped_steps = 0;
        let mut extracted_data = HashMap::new();
        
        info!("🚀 开始执行智能脚本，总共 {} 个步骤", steps.len());

        // 过滤并排序启用的步骤
        let mut enabled_steps: Vec<_> = steps.into_iter()
            .filter(|step| step.enabled)
            .collect();
        enabled_steps.sort_by_key(|step| step.order);

        // 简化执行逻辑 - 执行每个步骤
        for (index, step) in enabled_steps.iter().enumerate() {
            let step_start = std::time::Instant::now();
            info!("📋 执行步骤 {}/{}: {} ({})", index + 1, enabled_steps.len(), step.name, step.step_type.to_string());

            // 简单执行步骤
            match self.execute_basic_step(step).await {
                Ok(_) => {
                    executed_steps += 1;
                    
                    let log = SmartExecutionLog {
                        step_id: step.id.clone(),
                        step_name: step.name.clone(),
                        status: ExecutionStatus::Success,
                        message: "执行成功".to_string(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        duration_ms: step_start.elapsed().as_millis() as u64,
                        retry_count: 0,
                        page_state_before: None,
                        page_state_after: None,
                        found_elements: vec![],
                        verification_result: None,
                        extracted_data: None,
                    };
                    logs.push(log);
                }
                Err(e) => {
                    failed_steps += 1;
                    error!("❌ 步骤执行失败: {}", e);
                    
                    let log = SmartExecutionLog {
                        step_id: step.id.clone(),
                        step_name: step.name.clone(),
                        status: ExecutionStatus::Failed,
                        message: format!("执行失败: {}", e),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        duration_ms: step_start.elapsed().as_millis() as u64,
                        retry_count: 0,
                        page_state_before: None,
                        page_state_after: None,
                        found_elements: vec![],
                        verification_result: None,
                        extracted_data: None,
                    };
                    logs.push(log);
                }
            }
        }

        let total_duration = start_time.elapsed().as_millis() as u64;
        let success = failed_steps == 0 && executed_steps > 0;

        let result = SmartExecutionResult {
            success,
            total_steps: enabled_steps.len() as u32,
            executed_steps,
            failed_steps,
            skipped_steps,
            duration_ms: total_duration,
            logs,
            final_page_state: None,
            extracted_data,
            message: if success {
                format!("智能脚本执行成功！共执行 {} 个步骤，耗时 {}ms", executed_steps, total_duration)
            } else {
                format!("智能脚本执行完成，{} 个成功，{} 个失败，{} 个跳过", executed_steps, failed_steps, skipped_steps)
            },
        };

        info!("✅ 智能脚本执行完成: {}", result.message);
        Ok(result)
    }

    /// 执行基础步骤 (简化版本)
    async fn execute_basic_step(&self, step: &SmartScriptStep) -> Result<()> {
        match step.step_type {
            SmartActionType::Tap => {
                let params = &step.parameters;
                let x = params["x"].as_i64().context("缺少x坐标")? as i32;
                let y = params["y"].as_i64().context("缺少y坐标")? as i32;
                
                info!("� 点击: ({}, {})", x, y);
                self.adb_tap(x, y).await?;
                
                let wait_after = params.get("wait_after").and_then(|v| v.as_u64()).unwrap_or(1000);
                tokio::time::sleep(tokio::time::Duration::from_millis(wait_after)).await;
            }
            SmartActionType::Wait => {
                let params = &step.parameters;
                let duration = params["duration"].as_u64().context("缺少等待时长")?;
                
                info!("⏱️ 等待: {}ms", duration);
                tokio::time::sleep(tokio::time::Duration::from_millis(duration)).await;
            }
            _ => {
                return Err(anyhow::anyhow!("暂不支持的操作类型: {:?}", step.step_type));
            }
        }
        
        Ok(())
    }

    /// ADB点击
    async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "tap",
            &x.to_string(), &y.to_string()
        ]).await?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("点击命令执行失败: {}", error_msg));
        }

        Ok(())
    }

    /// 执行ADB命令
    async fn execute_adb_command(&self, args: &[&str]) -> Result<std::process::Output> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        
        let output = cmd.output()
            .context(format!("执行ADB命令失败 - ADB路径: {}, 参数: {:?}", self.adb_path, args))?;
        
        Ok(output)
    }

    // 这里会在后续版本中添加更多智能功能...
}

// ==================== 辅助函数 ====================

impl SmartActionType {
    pub fn to_string(&self) -> String {
        match self {
            Self::Tap => "基础点击".to_string(),
            Self::SmartTap => "智能点击".to_string(),
            Self::SmartFindElement => "智能查找元素".to_string(),
            Self::RecognizePage => "页面识别".to_string(),
            Self::VerifyAction => "操作验证".to_string(),
            Self::SmartLoop => "智能循环".to_string(),
            Self::ConditionalAction => "条件操作".to_string(),
            Self::WaitForPageState => "等待页面状态".to_string(),
            Self::ExtractElement => "提取元素信息".to_string(),
            Self::SmartNavigation => "智能导航".to_string(),
            Self::CompleteWorkflow => "完整工作流程".to_string(),
            _ => format!("{:?}", self),
        }
    }
}

// Tauri命令导出
#[command]
pub async fn execute_smart_automation_script(
    device_id: String,
    steps: Vec<SmartScriptStep>,
    config: Option<ExecutorConfig>,
) -> Result<SmartExecutionResult, String> {
    info!("🎯 收到智能脚本执行请求，设备: {}, 步骤数: {}", device_id, steps.len());

    let executor = if let Some(cfg) = config {
        SmartScriptExecutor::new_with_config(device_id, cfg)
    } else {
        SmartScriptExecutor::new(device_id)
    };
    
    match executor.execute_smart_script(steps).await {
        Ok(result) => {
            info!("✅ 智能脚本执行完成: {}", result.message);
            Ok(result)
        }
        Err(e) => {
            error!("❌ 智能脚本执行失败: {}", e);
            Err(format!("智能脚本执行失败: {}", e))
        }
    }
}