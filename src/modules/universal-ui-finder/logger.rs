// 交互式日志记录器 - 提供用户友好的详细日志和交互式错误处理

use std::io::{self, Write};
use chrono::{DateTime, Local};
use colored::*;

pub struct InteractiveLogger {
    pub enabled: bool,
    pub detailed: bool,
    pub session_start: Option<DateTime<Local>>,
}

impl InteractiveLogger {
    pub fn new(detailed: bool) -> Self {
        Self {
            enabled: true,
            detailed,
            session_start: None,
        }
    }
    
    /// 开始新的查找会话
    pub fn start_session(&mut self, request: &crate::FindRequest) {
        self.session_start = Some(Local::now());
        
        if !self.enabled { return; }
        
        println!("{}", "🚀 开始UI自动化查找任务".bright_blue().bold());
        println!("{}", "=".repeat(50).bright_blue());
        
        // 显示应用信息（如果有）
        if let Some(app_name) = &request.app_name {
            println!("📱 目标应用: {}", app_name.bright_green());
        } else {
            println!("🔧 模式: {}", "直接ADB操作 (跳过应用检测)".bright_cyan());
        }
        
        println!("🎯 目标元素: {}", request.target_text.bright_yellow());
        
        if let Some(pos) = &request.position_hint {
            println!("📍 位置提示: {}", pos.bright_cyan());
        }
        
        if let Some(actions) = &request.pre_actions {
            println!("🔄 预操作步骤: {}", actions.join(" → ").bright_magenta());
        }
        
        println!("⏰ 开始时间: {}", Local::now().format("%H:%M:%S"));
        println!();
    }
    
    /// 记录应用检测步骤
    pub fn log_app_detection(&self, app_name: &str, step: AppDetectionStep) {
        if !self.enabled { return; }
        
        match step {
            AppDetectionStep::Checking => {
                println!("🔍 第1步：检测应用状态...");
                println!("   正在查找应用: {}", app_name.bright_green());
            },
            AppDetectionStep::Found(package) => {
                println!("   ✅ 应用已找到: {}", package.bright_green());
            },
            AppDetectionStep::NotFound => {
                println!("   ❌ 应用未找到或未安装");
                self.prompt_user_action("应用检测", vec![
                    "请确认应用已安装并可访问",
                    "检查应用名称是否正确",
                    "手动启动目标应用"
                ]);
            },
            AppDetectionStep::NotRunning => {
                println!("   ⚠️  应用未在前台运行");
                self.prompt_user_action("应用状态", vec![
                    "请手动打开目标应用",
                    "确保应用在前台显示",
                    "等待应用完全加载"
                ]);
            },
            AppDetectionStep::Ready => {
                println!("   ✅ 应用已准备就绪");
            }
        }
    }
    
    /// 记录UI元素查找步骤
    pub fn log_element_search(&self, target: &str, step: ElementSearchStep) {
        if !self.enabled { return; }
        
        match step {
            ElementSearchStep::Starting => {
                println!("\n🔍 第2步：UI元素查找...");
                println!("   目标元素: {}", target.bright_yellow());
            },
            ElementSearchStep::DumpingUI => {
                println!("   📄 获取UI布局信息...");
            },
            ElementSearchStep::Parsing => {
                println!("   ⚙️  解析XML结构...");
            },
            ElementSearchStep::Filtering(count) => {
                println!("   📊 找到 {} 个候选元素", count.to_string().bright_blue());
            },
            ElementSearchStep::Found(element, confidence) => {
                println!("   ✅ 最佳匹配元素:");
                println!("      文本: {}", element.text.bright_green());
                println!("      位置: ({}, {})", element.bounds.center().0, element.bounds.center().1);
                println!("      置信度: {}%", (confidence * 100.0) as i32);
            },
            ElementSearchStep::NotFound => {
                println!("   ❌ 未找到匹配的UI元素");
                self.prompt_element_not_found(target);
            },
            ElementSearchStep::MultipleFound(count) => {
                println!("   ⚠️  找到 {} 个可能的匹配", count);
                println!("      将选择置信度最高的元素");
            }
        }
    }
    
    /// 记录预操作步骤
    pub fn log_pre_action(&self, action: &str, step: PreActionStep) {
        if !self.enabled { return; }
        
        match step {
            PreActionStep::Starting => {
                println!("\n🔄 执行预操作: {}", action.bright_magenta());
            },
            PreActionStep::Executing => {
                println!("   ⚡ 正在执行: {}", action);
            },
            PreActionStep::Waiting(duration) => {
                println!("   ⏳ 等待UI稳定 ({}ms)...", duration);
            },
            PreActionStep::Completed => {
                println!("   ✅ 预操作完成");
            },
            PreActionStep::Failed(error) => {
                println!("   ❌ 预操作失败: {}", error.bright_red());
            }
        }
    }
    
    /// 记录点击执行步骤
    pub fn log_click_execution(&self, target: &str, step: ClickExecutionStep) {
        if !self.enabled { return; }
        
        match step {
            ClickExecutionStep::Starting => {
                println!("\n👆 第3步：执行点击操作...");
            },
            ClickExecutionStep::CalculatingPosition(x, y) => {
                println!("   📍 计算点击坐标: ({}, {})", x, y);
            },
            ClickExecutionStep::Clicking => {
                println!("   ⚡ 发送点击命令...");
            },
            ClickExecutionStep::Verifying => {
                println!("   🔍 验证操作结果...");
            },
            ClickExecutionStep::Success => {
                println!("   ✅ 点击操作成功");
            },
            ClickExecutionStep::Failed(error) => {
                println!("   ❌ 点击操作失败: {}", error.bright_red());
            }
        }
    }
    
    /// 完成会话并显示总结
    pub fn complete_session(&self, result: &crate::ClickResult) {
        if !self.enabled { return; }
        
        println!("\n{}", "📊 任务执行结果".bright_blue().bold());
        println!("{}", "=".repeat(30).bright_blue());
        
        let status_icon = if result.success { "✅" } else { "❌" };
        let status_text = if result.success { "成功".bright_green() } else { "失败".bright_red() };
        
        println!("{} 执行状态: {}", status_icon, status_text);
        println!("🎯 元素定位: {}", if result.element_found { "✅ 成功".bright_green() } else { "❌ 失败".bright_red() });
        println!("👆 点击执行: {}", if result.click_executed { "✅ 成功".bright_green() } else { "❌ 失败".bright_red() });
        println!("⏱️  执行时间: {}ms", result.execution_time.as_millis());
        
        if result.user_intervention {
            println!("👤 用户干预: {} (需要手动操作)", "是".bright_yellow());
        }
        
        if let Some(error) = &result.error_message {
            println!("💬 错误信息: {}", error.bright_red());
        }
        
        if let Some(start_time) = self.session_start {
            let total_time = Local::now().signed_duration_since(start_time);
            println!("🕐 总耗时: {}秒", total_time.num_seconds());
        }
        
        println!();
    }
    
    /// 提示用户操作
    fn prompt_user_action(&self, context: &str, suggestions: Vec<&str>) {
        if !self.enabled { return; }
        
        println!("   💡 {}建议:", context.bright_yellow());
        for (i, suggestion) in suggestions.iter().enumerate() {
            println!("      {}. {}", i + 1, suggestion);
        }
        
        print!("   ❓ 请完成上述操作后按 Enter 继续，或输入 'skip' 跳过: ");
        io::stdout().flush().unwrap();
        
        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();
        
        if input.trim().to_lowercase() == "skip" {
            println!("   ⏭️  用户选择跳过此步骤");
        } else {
            println!("   ▶️  继续执行...");
        }
    }
    
    /// 元素未找到时的专门提示
    fn prompt_element_not_found(&self, target: &str) {
        if !self.enabled { return; }
        
        println!("   💡 {}未找到建议:", "UI元素".bright_yellow());
        println!("      1. 检查目标文本是否准确: '{}'", target);
        println!("      2. 确认元素当前是否可见");
        println!("      3. 尝试滑动或展开相关界面");
        println!("      4. 检查应用版本是否有界面变化");
        println!("      5. 考虑使用更宽泛的搜索条件");
        
        print!("   ❓ 请调整界面后按 Enter 重试，或输入 'skip' 跳过: ");
        io::stdout().flush().unwrap();
        
        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();
        
        if input.trim().to_lowercase() == "skip" {
            println!("   ⏭️  用户选择跳过UI查找");
        } else {
            println!("   🔄 准备重新查找...");
        }
    }
    
    /// 设置日志级别
    pub fn set_detailed(&mut self, detailed: bool) {
        self.detailed = detailed;
    }
    
    /// 启用/禁用日志
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
}

/// 应用检测步骤枚举
#[derive(Debug)]
pub enum AppDetectionStep {
    Checking,
    Found(String), // package name
    NotFound,
    NotRunning,
    Ready,
}

/// 元素搜索步骤枚举
#[derive(Debug)]
pub enum ElementSearchStep {
    Starting,
    DumpingUI,
    Parsing,
    Filtering(usize), // count
    Found(crate::UIElement, f32), // element, confidence
    NotFound,
    MultipleFound(usize), // count
}

/// 预操作步骤枚举
#[derive(Debug)]
pub enum PreActionStep {
    Starting,
    Executing,
    Waiting(u64), // duration ms
    Completed,
    Failed(String), // error message
}

/// 点击执行步骤枚举
#[derive(Debug)]
pub enum ClickExecutionStep {
    Starting,
    CalculatingPosition(i32, i32), // x, y
    Clicking,
    Verifying,
    Success,
    Failed(String), // error message
}