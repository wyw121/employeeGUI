// 操作执行器 - 负责实际的点击操作和结果验证

use std::process::Command;
use std::time::{Duration, Instant};
use crate::{FindRequest, ClickResult, UIElement, FindError};
use crate::logger::{InteractiveLogger, ClickExecutionStep};

pub struct ActionExecutor {
    adb_path: String,
    device_id: Option<String>,
}

impl ActionExecutor {
    pub fn new(adb_path: &str, device_id: Option<String>) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            adb_path: adb_path.to_string(),
            device_id,
        })
    }
    
    /// 执行点击操作
    pub async fn execute_click(&self, element: &UIElement, request: &FindRequest, logger: &mut InteractiveLogger) 
        -> Result<ClickResult, FindError> {
        
        let start_time = Instant::now();
        logger.log_click_execution(&request.target_text, ClickExecutionStep::Starting);
        
        // 计算点击坐标
        let (x, y) = element.bounds.center();
        logger.log_click_execution(&request.target_text, ClickExecutionStep::CalculatingPosition(x, y));
        
        // 执行点击命令
        logger.log_click_execution(&request.target_text, ClickExecutionStep::Clicking);
        let click_success = self.perform_click(x, y).is_ok();
        
        if !click_success {
            let error_msg = "点击命令执行失败".to_string();
            logger.log_click_execution(&request.target_text, ClickExecutionStep::Failed(error_msg.clone()));
            
            return Ok(ClickResult {
                success: false,
                element_found: true,
                click_executed: false,
                execution_time: start_time.elapsed(),
                found_element: Some(element.clone()),
                user_intervention: false,
                error_message: Some(error_msg),
            });
        }
        
        // 等待操作生效
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        // 验证操作结果
        logger.log_click_execution(&request.target_text, ClickExecutionStep::Verifying);
        let verification_result = self.verify_click_result(request).await;
        
        let final_success = click_success && verification_result.is_ok();
        
        if final_success {
            logger.log_click_execution(&request.target_text, ClickExecutionStep::Success);
        } else if let Err(error) = verification_result {
            logger.log_click_execution(&request.target_text, ClickExecutionStep::Failed(error.clone()));
        }
        
        Ok(ClickResult {
            success: final_success,
            element_found: true,
            click_executed: click_success,
            execution_time: start_time.elapsed(),
            found_element: Some(element.clone()),
            user_intervention: false,
            error_message: if final_success { None } else { Some("操作验证失败".to_string()) },
        })
    }
    
    /// 执行点击命令
    fn perform_click(&self, x: i32, y: i32) -> Result<(), FindError> {
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "input", "tap", &x.to_string(), &y.to_string()]);
        
        let output = cmd.output().map_err(|e| {
            FindError::ExecutionFailed(format!("点击命令创建失败: {}", e))
        })?;
        
        if !output.status.success() {
            return Err(FindError::ExecutionFailed(format!(
                "点击执行失败: {}", 
                String::from_utf8_lossy(&output.stderr)
            )));
        }
        
        Ok(())
    }
    
    /// 验证点击结果
    async fn verify_click_result(&self, request: &FindRequest) -> Result<bool, String> {
        // 等待界面变化
        tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
        
        // 获取点击后的UI状态
        match self.get_current_ui_dump() {
            Ok(xml_content) => {
                // 根据不同按钮类型验证结果
                let verification_passed = self.verify_by_button_type(&request.target_text, &xml_content);
                
                if verification_passed {
                    Ok(true)
                } else {
                    // 简单验证：检查UI是否发生变化
                    Ok(self.detect_ui_change(&xml_content))
                }
            },
            Err(e) => Err(format!("获取验证UI失败: {}", e))
        }
    }
    
    /// 根据按钮类型验证结果
    fn verify_by_button_type(&self, button_text: &str, xml_content: &str) -> bool {
        match button_text {
            "我" => {
                // 验证是否进入个人页面
                xml_content.contains("个人主页") || 
                xml_content.contains("编辑资料") ||
                xml_content.contains("设置") ||
                xml_content.contains("粉丝") ||
                xml_content.contains("关注")
            },
            "关注好友" => {
                // 验证是否打开了关注/好友相关页面
                xml_content.contains("好友列表") ||
                xml_content.contains("关注列表") ||
                xml_content.contains("推荐好友") ||
                xml_content.contains("通讯录好友")
            },
            "设置" => {
                // 验证是否进入设置页面
                xml_content.contains("账号设置") ||
                xml_content.contains("隐私设置") ||
                xml_content.contains("通知设置") ||
                xml_content.contains("关于我们")
            },
            "搜索" => {
                // 验证是否出现搜索界面
                xml_content.contains("搜索框") ||
                xml_content.contains("热门搜索") ||
                xml_content.contains("搜索历史") ||
                xml_content.contains("取消")
            },
            "发现" => {
                // 验证是否进入发现页面
                xml_content.contains("推荐") ||
                xml_content.contains("热门") ||
                xml_content.contains("附近") ||
                xml_content.contains("话题")
            },
            _ => false // 未知按钮类型，使用通用验证
        }
    }
    
    /// 检测UI是否发生变化 (通用验证方法)
    fn detect_ui_change(&self, xml_content: &str) -> bool {
        // 检查是否有新的界面元素出现
        let change_indicators = [
            "返回", "back", "关闭", "取消", 
            "标题", "title", "页面", "page",
            "列表", "list", "内容", "content"
        ];
        
        change_indicators.iter().any(|&indicator| {
            xml_content.to_lowercase().contains(indicator)
        })
    }
    
    /// 获取当前UI dump
    fn get_current_ui_dump(&self) -> Result<String, Box<dyn std::error::Error>> {
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["exec-out", "uiautomator", "dump", "/dev/stdout"]);
        
        let output = cmd.output()?;
        if !output.status.success() {
            return Err(format!("UI dump失败: {}", String::from_utf8_lossy(&output.stderr)).into());
        }
        
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }
    
    /// 执行长按操作 (扩展功能)
    pub async fn execute_long_press(&self, element: &UIElement, duration_ms: u64) -> Result<bool, FindError> {
        let (x, y) = element.bounds.center();
        
        // 使用ADB的长按命令
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "input", "swipe", &x.to_string(), &y.to_string(), 
                  &x.to_string(), &y.to_string(), &duration_ms.to_string()]);
        
        let output = cmd.output().map_err(|e| {
            FindError::ExecutionFailed(format!("长按命令执行失败: {}", e))
        })?;
        
        Ok(output.status.success())
    }
    
    /// 执行双击操作 (扩展功能)
    pub async fn execute_double_click(&self, element: &UIElement) -> Result<bool, FindError> {
        let (x, y) = element.bounds.center();
        
        // 执行两次快速点击
        for _ in 0..2 {
            self.perform_click(x, y)?;
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
        
        Ok(true)
    }
    
    /// 在指定区域内执行滑动 (扩展功能)
    pub async fn execute_swipe_in_element(&self, element: &UIElement, direction: SwipeDirection) 
        -> Result<bool, FindError> {
        
        let bounds = &element.bounds;
        let (start_x, start_y, end_x, end_y) = match direction {
            SwipeDirection::Up => {
                (bounds.left + bounds.width() / 2, bounds.bottom - 20,
                 bounds.left + bounds.width() / 2, bounds.top + 20)
            },
            SwipeDirection::Down => {
                (bounds.left + bounds.width() / 2, bounds.top + 20,
                 bounds.left + bounds.width() / 2, bounds.bottom - 20)
            },
            SwipeDirection::Left => {
                (bounds.right - 20, bounds.top + bounds.height() / 2,
                 bounds.left + 20, bounds.top + bounds.height() / 2)
            },
            SwipeDirection::Right => {
                (bounds.left + 20, bounds.top + bounds.height() / 2,
                 bounds.right - 20, bounds.top + bounds.height() / 2)
            },
        };
        
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "input", "swipe", 
                  &start_x.to_string(), &start_y.to_string(),
                  &end_x.to_string(), &end_y.to_string(), "300"]);
        
        let output = cmd.output().map_err(|e| {
            FindError::ExecutionFailed(format!("滑动命令执行失败: {}", e))
        })?;
        
        Ok(output.status.success())
    }
}

/// 滑动方向枚举
#[derive(Debug, Clone)]
pub enum SwipeDirection {
    Up,
    Down, 
    Left,
    Right,
}