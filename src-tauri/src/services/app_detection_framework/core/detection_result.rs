use serde::{Deserialize, Serialize};
use std::time::Duration;

/// 应用启动状态枚举
/// 定义应用在启动过程中可能的各种状态
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum AppLaunchState {
    /// 未启动状态
    NotStarted,
    /// 正在启动中
    Starting,
    /// 启动画面/闪屏
    SplashScreen,
    /// 正在加载中
    Loading,
    /// 权限弹窗
    PermissionDialog,
    /// 需要用户登录
    LoginRequired,
    /// 网络连接检查
    NetworkCheck,
    /// 应用更新检查
    UpdateCheck,
    /// 广告页面
    Advertisement,
    /// 引导页面
    Tutorial,
    /// 完全就绪状态
    Ready,
    /// 错误状态
    Error(String),
}

impl AppLaunchState {
    /// 判断是否为终态（成功或失败）
    pub fn is_terminal(&self) -> bool {
        matches!(self, AppLaunchState::Ready | AppLaunchState::Error(_))
    }
    
    /// 判断是否为错误状态
    pub fn is_error(&self) -> bool {
        matches!(self, AppLaunchState::Error(_))
    }
    
    /// 判断是否为成功状态
    pub fn is_ready(&self) -> bool {
        matches!(self, AppLaunchState::Ready)
    }
    
    /// 获取状态的中文描述
    pub fn description(&self) -> String {
        match self {
            AppLaunchState::NotStarted => "未启动".to_string(),
            AppLaunchState::Starting => "启动中".to_string(),
            AppLaunchState::SplashScreen => "启动画面".to_string(),
            AppLaunchState::Loading => "加载中".to_string(),
            AppLaunchState::PermissionDialog => "权限弹窗".to_string(),
            AppLaunchState::LoginRequired => "需要登录".to_string(),
            AppLaunchState::NetworkCheck => "网络检查".to_string(),
            AppLaunchState::UpdateCheck => "更新检查".to_string(),
            AppLaunchState::Advertisement => "广告页面".to_string(),
            AppLaunchState::Tutorial => "引导页面".to_string(),
            AppLaunchState::Ready => "已就绪".to_string(),
            AppLaunchState::Error(msg) => format!("错误: {}", msg),
        }
    }
    
    /// 获取状态的英文名称
    pub fn name(&self) -> String {
        match self {
            AppLaunchState::NotStarted => "NotStarted".to_string(),
            AppLaunchState::Starting => "Starting".to_string(),
            AppLaunchState::SplashScreen => "SplashScreen".to_string(),
            AppLaunchState::Loading => "Loading".to_string(),
            AppLaunchState::PermissionDialog => "PermissionDialog".to_string(),
            AppLaunchState::LoginRequired => "LoginRequired".to_string(),
            AppLaunchState::NetworkCheck => "NetworkCheck".to_string(),
            AppLaunchState::UpdateCheck => "UpdateCheck".to_string(),
            AppLaunchState::Advertisement => "Advertisement".to_string(),
            AppLaunchState::Tutorial => "Tutorial".to_string(),
            AppLaunchState::Ready => "Ready".to_string(),
            AppLaunchState::Error(_) => "Error".to_string(),
        }
    }
}

/// 检测结果结构体
/// 包含完整的检测过程信息和结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionResult {
    /// 最终状态
    pub state: AppLaunchState,
    
    /// 应用是否功能性可用
    pub is_functional: bool,
    
    /// 结果描述信息
    pub message: String,
    
    /// 已检测的元素数量
    pub checked_elements: usize,
    
    /// 总检测次数
    pub total_checks: usize,
    
    /// 总耗时
    pub elapsed_time: Duration,
    
    /// 状态变化历史
    pub state_history: Vec<AppLaunchState>,
}

impl DetectionResult {
    /// 创建成功结果
    pub fn success(message: String, checks: usize, elapsed: Duration) -> Self {
        Self {
            state: AppLaunchState::Ready,
            is_functional: true,
            message,
            checked_elements: checks,
            total_checks: checks,
            elapsed_time: elapsed,
            state_history: vec![AppLaunchState::Ready],
        }
    }
    
    /// 创建失败结果
    pub fn failure(state: AppLaunchState, message: String, checks: usize, elapsed: Duration) -> Self {
        Self {
            state: state.clone(),
            is_functional: false,
            message,
            checked_elements: checks,
            total_checks: checks,
            elapsed_time: elapsed,
            state_history: vec![state],
        }
    }
    
    /// 创建错误结果
    pub fn error(error_msg: String, checks: usize, elapsed: Duration) -> Self {
        Self {
            state: AppLaunchState::Error(error_msg.clone()),
            is_functional: false,
            message: format!("检测过程出错: {}", error_msg),
            checked_elements: checks,
            total_checks: checks,
            elapsed_time: elapsed,
            state_history: vec![AppLaunchState::Error(error_msg)],
        }
    }
    
    /// 获取成功率
    pub fn success_rate(&self) -> f64 {
        if self.total_checks == 0 {
            return 0.0;
        }
        
        let ready_count = self.state_history.iter()
            .filter(|state| state.is_ready())
            .count();
            
        ready_count as f64 / self.total_checks as f64
    }
    
    /// 获取状态变化摘要
    pub fn state_summary(&self) -> String {
        if self.state_history.is_empty() {
            return "无状态记录".to_string();
        }
        
        let unique_states: Vec<String> = self.state_history.iter()
            .map(|state| state.name())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
            
        unique_states.join(" → ")
    }
}

/// 检测统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionStats {
    /// 总检测次数
    pub total_detections: usize,
    
    /// 成功次数
    pub successful_detections: usize,
    
    /// 平均检测时间
    pub average_detection_time: Duration,
    
    /// 最快检测时间
    pub fastest_detection: Duration,
    
    /// 最慢检测时间
    pub slowest_detection: Duration,
    
    /// 各状态出现次数统计
    pub state_counts: std::collections::HashMap<String, usize>,
}

impl DetectionStats {
    pub fn new() -> Self {
        Self {
            total_detections: 0,
            successful_detections: 0,
            average_detection_time: Duration::from_secs(0),
            fastest_detection: Duration::from_secs(999),
            slowest_detection: Duration::from_secs(0),
            state_counts: std::collections::HashMap::new(),
        }
    }
    
    /// 添加检测结果到统计中
    pub fn add_result(&mut self, result: &DetectionResult) {
        self.total_detections += 1;
        
        if result.is_functional {
            self.successful_detections += 1;
        }
        
        // 更新时间统计
        if result.elapsed_time < self.fastest_detection {
            self.fastest_detection = result.elapsed_time;
        }
        if result.elapsed_time > self.slowest_detection {
            self.slowest_detection = result.elapsed_time;
        }
        
        // 重新计算平均时间
        self.average_detection_time = Duration::from_millis(
            ((self.average_detection_time.as_millis() * (self.total_detections - 1) as u128 + 
             result.elapsed_time.as_millis()) / self.total_detections as u128) as u64
        );
        
        // 更新状态计数
        let state_name = result.state.name();
        *self.state_counts.entry(state_name).or_insert(0) += 1;
    }
    
    /// 获取成功率
    pub fn success_rate(&self) -> f64 {
        if self.total_detections == 0 {
            0.0
        } else {
            self.successful_detections as f64 / self.total_detections as f64
        }
    }
}

impl Default for DetectionStats {
    fn default() -> Self {
        Self::new()
    }
}