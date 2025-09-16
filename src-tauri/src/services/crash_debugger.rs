use anyhow::Result;
use std::fs::OpenOptions;
use std::io::Write;
use std::panic;
use std::process::Command;
use tracing::{error, info};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// 崩溃调试工具 - 捕获和记录详细的崩溃信息
pub struct CrashDebugger {
    log_file_path: String,
}

impl CrashDebugger {
    pub fn new() -> Self {
        let log_file_path = "crash_debug.log".to_string();
        Self { log_file_path }
    }

    /// 设置全局panic钩子，捕获所有panic信息
    pub fn setup_crash_handler(&self) {
        let log_file_path = self.log_file_path.clone();

        panic::set_hook(Box::new(move |panic_info| {
            let mut crash_report = String::new();
            crash_report.push_str("=== CRASH REPORT ===\n");
            crash_report.push_str(&format!(
                "Time: {}\n",
                chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
            ));

            // 获取panic消息
            if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
                crash_report.push_str(&format!("Panic message: {}\n", s));
            } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
                crash_report.push_str(&format!("Panic message: {}\n", s));
            } else {
                crash_report.push_str("Panic message: <non-string panic>\n");
            }

            // 获取panic位置
            if let Some(location) = panic_info.location() {
                crash_report.push_str(&format!(
                    "Location: {}:{}\n",
                    location.file(),
                    location.line()
                ));
            } else {
                crash_report.push_str("Location: <unknown>\n");
            }

            // 获取线程信息
            crash_report.push_str(&format!("Thread: {:?}\n", std::thread::current().id()));

            // 获取堆栈跟踪
            crash_report.push_str("Stack trace:\n");
            let backtrace = std::backtrace::Backtrace::capture();
            crash_report.push_str(&format!("{}\n", backtrace));

            crash_report.push_str("==================\n\n");

            // 写入文件
            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_file_path)
            {
                let _ = file.write_all(crash_report.as_bytes());
                let _ = file.flush();
            }

            // 同时输出到控制台
            error!("🔥 CRASH DETECTED - Details written to {}", log_file_path);
            error!("🔥 Panic info: {:?}", panic_info);

            // 强制刷新日志
            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open("immediate_crash.log")
            {
                let immediate_info = format!("IMMEDIATE CRASH: {:?}\n", panic_info);
                let _ = file.write_all(immediate_info.as_bytes());
                let _ = file.flush();
            }
        }));
    }

    /// 记录操作步骤，用于追踪崩溃前的操作
    pub fn log_step(&self, step: &str) {
        let log_entry = format!(
            "[{}] STEP: {}\n",
            chrono::Utc::now().format("%H:%M:%S"),
            step
        );

        info!("📝 {}", step);

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file_path)
        {
            let _ = file.write_all(log_entry.as_bytes());
            let _ = file.flush();
        }
    }

    /// 记录错误信息
    pub fn log_error(&self, context: &str, error: &str) {
        let log_entry = format!(
            "[{}] ERROR in {}: {}\n",
            chrono::Utc::now().format("%H:%M:%S"),
            context,
            error
        );

        error!("❌ {} - {}", context, error);

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file_path)
        {
            let _ = file.write_all(log_entry.as_bytes());
            let _ = file.flush();
        }
    }

    /// 记录环境信息
    pub fn log_environment_info(&self) {
        let mut env_info = String::new();
        env_info.push_str("=== ENVIRONMENT INFO ===\n");
        env_info.push_str(&format!("OS: {}\n", std::env::consts::OS));
        env_info.push_str(&format!("Arch: {}\n", std::env::consts::ARCH));
        env_info.push_str(&format!("Current dir: {:?}\n", std::env::current_dir()));
        env_info.push_str(&format!("Exe path: {:?}\n", std::env::current_exe()));
        env_info.push_str("=========================\n\n");

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file_path)
        {
            let _ = file.write_all(env_info.as_bytes());
            let _ = file.flush();
        }
    }
}

/// 安全的VCF导入测试命令，包含详细的崩溃调试
#[tauri::command]
#[allow(non_snake_case)]
pub async fn debug_vcf_import_with_crash_detection(
    deviceId: String,
    contactsFilePath: String,
) -> Result<String, String> {
    let debugger = CrashDebugger::new();
    debugger.setup_crash_handler();
    debugger.log_environment_info();

    debugger.log_step("开始调试VCF导入流程");
    debugger.log_step(&format!("设备ID: {}", deviceId));
    debugger.log_step(&format!("文件路径: {}", contactsFilePath));

    // 详细的参数验证
    if deviceId.is_empty() {
        debugger.log_error("参数验证", "设备ID为空");
        return Err("设备ID不能为空".to_string());
    }
    debugger.log_step("设备ID验证通过");

    if contactsFilePath.is_empty() {
        debugger.log_error("参数验证", "文件路径为空");
        return Err("文件路径不能为空".to_string());
    }
    debugger.log_step("文件路径验证通过");

    // 检查文件是否存在
    if !std::path::Path::new(&contactsFilePath).exists() {
        debugger.log_error("文件检查", &format!("文件不存在: {}", contactsFilePath));
        return Err(format!("文件不存在: {}", contactsFilePath));
    }
    debugger.log_step("文件存在性验证通过");

    // 尝试读取文件内容
    debugger.log_step("开始读取文件内容");
    match std::fs::read_to_string(&contactsFilePath) {
        Ok(content) => {
            debugger.log_step(&format!("文件读取成功，大小: {} 字节", content.len()));
            if content.len() > 100 {
                debugger.log_step(&format!("文件预览: {}...", &content[..100]));
            } else {
                debugger.log_step(&format!("文件内容: {}", content));
            }
        }
        Err(e) => {
            debugger.log_error("文件读取", &e.to_string());
            return Err(format!("文件读取失败: {}", e));
        }
    }

    // 测试设备连接
    debugger.log_step("开始测试设备连接");
    
    let mut cmd = Command::new("adb");
    cmd.args(["devices"]);
    
    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    match cmd.output() {
        Ok(output) => {
            let devices_output = String::from_utf8_lossy(&output.stdout);
            debugger.log_step(&format!("ADB设备列表: {}", devices_output));

            if !devices_output.contains(&deviceId) {
                debugger.log_error(
                    "设备连接",
                    &format!("设备 {} 未在ADB设备列表中找到", deviceId),
                );
                return Err(format!("设备 {} 未连接或不可访问", deviceId));
            }
            debugger.log_step("设备连接验证通过");
        }
        Err(e) => {
            debugger.log_error("ADB命令", &e.to_string());
            return Err(format!("ADB命令执行失败: {}", e));
        }
    }

    debugger.log_step("所有前置检查完成，准备调用实际导入功能");

    // 在这里我们可以安全地调用实际的导入功能
    // 但首先让我们只是完成基础验证
    debugger.log_step("调试测试完成，没有发生崩溃");

    Ok("调试测试成功完成，所有验证通过".to_string())
}
