// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod screenshot_service;
mod services;
mod utils;
mod xml_judgment_service;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use screenshot_service::*;
use services::adb_device_tracker::*;
use services::adb_service::AdbService;
use services::auth_service::*;
use services::contact_automation::*;
use services::contact_service::*;
use services::crash_debugger::*;
use services::employee_service::{Employee, EmployeeService};
use services::log_bridge::{AdbCommandLog, LogEntry, LOG_COLLECTOR};
use services::navigation_bar_detector::{detect_navigation_bar, click_navigation_button, get_navigation_configs};
use services::safe_adb_manager::*;
use services::script_executor::*;
use services::smart_app_service::*;
use services::smart_script_executor::*;
use services::smart_vcf_opener::*;
use services::ui_reader_service::*;
use services::xiaohongshu_service::{XiaohongshuService, *};
use services::xiaohongshu_long_connection_service::{XiaohongshuLongConnectionService, *};
use std::sync::Mutex;
use tauri::State;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use xml_judgment_service::*;

// Tauri命令：获取所有员工
#[tauri::command]
async fn get_employees(
    service: State<'_, Mutex<EmployeeService>>,
) -> Result<Vec<Employee>, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service.get_all().map_err(|e| e.to_string())
}

// Tauri命令：添加员工
#[tauri::command]
async fn add_employee(
    employee: Employee,
    service: State<'_, Mutex<EmployeeService>>,
) -> Result<Employee, String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.create(employee).map_err(|e| e.to_string())
}

// Tauri命令：更新员工
#[tauri::command]
async fn update_employee(
    employee: Employee,
    service: State<'_, Mutex<EmployeeService>>,
) -> Result<Employee, String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.update(employee).map_err(|e| e.to_string())
}

// Tauri命令：删除员工
#[tauri::command]
async fn delete_employee(
    id: i32,
    service: State<'_, Mutex<EmployeeService>>,
) -> Result<(), String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.delete(id).map_err(|e| e.to_string())
}

// ADB相关命令

// 执行ADB命令
#[tauri::command]
async fn execute_adb_command(
    adb_path: String,
    args: Vec<String>,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service
        .execute_command(&adb_path, &args)
        .map_err(|e| e.to_string())
}

// 检查文件是否存在
#[tauri::command]
async fn check_file_exists(
    path: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<bool, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    Ok(service.check_file_exists(&path))
}

// 检测雷电模拟器ADB路径
#[tauri::command]
async fn detect_ldplayer_adb(
    service: State<'_, Mutex<AdbService>>,
) -> Result<Option<String>, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    Ok(service.detect_ldplayer_adb())
}

// 智能检测最佳ADB路径 (环境感知)
#[tauri::command]
async fn detect_smart_adb_path(service: State<'_, Mutex<AdbService>>) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;

    // 使用智能检测逻辑
    if let Some(detected_path) = service.detect_ldplayer_adb() {
        Ok(detected_path)
    } else {
        // 尝试检测系统PATH中的ADB
        match service.execute_command("adb.exe", &["version".to_string()]) {
            Ok(_) => Ok("adb.exe".to_string()), // 系统PATH中有ADB
            Err(_) => {
                // 最后回退到项目绝对路径
                let current_dir = std::env::current_dir()
                    .map_err(|e| format!("Failed to get current directory: {}", e))?;

                println!("当前工作目录: {:?}", current_dir);

                // 在开发模式下，当前目录应该是工作空间根目录
                let adb_path = current_dir.join("platform-tools").join("adb.exe");

                println!("尝试ADB路径: {:?}", adb_path);

                // 检查文件是否存在
                if adb_path.exists() {
                    let abs_path = adb_path.to_string_lossy().to_string();
                    println!("找到ADB路径: {}", abs_path);
                    Ok(abs_path)
                } else {
                    // 如果在工作空间根目录找不到，尝试上一级目录（处理在src-tauri目录运行的情况）
                    let parent_adb_path = current_dir
                        .parent()
                        .ok_or("No parent directory")?
                        .join("platform-tools")
                        .join("adb.exe");

                    println!("尝试父级目录ADB路径: {:?}", parent_adb_path);

                    if parent_adb_path.exists() {
                        let abs_path = parent_adb_path.to_string_lossy().to_string();
                        println!("找到父级ADB路径: {}", abs_path);
                        Ok(abs_path)
                    } else {
                        println!("未找到任何可用的ADB路径");
                        Err("未找到可用的ADB路径".to_string())
                    }
                }
            }
        }
    }
}

// 获取ADB设备列表
#[tauri::command]
async fn get_adb_devices(
    adb_path: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service.get_devices(&adb_path).map_err(|e| e.to_string())
}

// 获取ADB版本
#[tauri::command]
async fn get_adb_version() -> Result<String, String> {
    use std::process::Command;

    let adb_path = "platform-tools/adb.exe";
    let mut cmd = Command::new(adb_path);
    cmd.arg("version");

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                let version_output = String::from_utf8_lossy(&output.stdout);
                // 提取版本号（通常在第一行）
                let first_line = version_output.lines().next().unwrap_or("Unknown");
                Ok(first_line.to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("ADB版本获取失败: {}", error))
            }
        }
        Err(e) => Err(format!("无法执行ADB命令: {}", e)),
    }
}

// 简化的ADB服务器启动命令
#[tauri::command]
async fn start_adb_server_simple() -> Result<String, String> {
    use std::process::Command;

    let adb_path = "platform-tools/adb.exe";
    let mut cmd = Command::new(adb_path);
    cmd.arg("start-server");

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                Ok("ADB服务器启动成功".to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("ADB服务器启动失败: {}", error))
            }
        }
        Err(e) => Err(format!("无法执行ADB命令: {}", e)),
    }
}

// 简化的ADB服务器停止命令
#[tauri::command]
async fn kill_adb_server_simple() -> Result<String, String> {
    use std::process::Command;

    let adb_path = "platform-tools/adb.exe";
    let mut cmd = Command::new(adb_path);
    cmd.arg("kill-server");

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                Ok("ADB服务器停止成功".to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("ADB服务器停止失败: {}", error))
            }
        }
        Err(e) => Err(format!("无法执行ADB命令: {}", e)),
    }
}

// 执行通用ADB命令
#[tauri::command]
async fn execute_adb_command_simple(command: String) -> Result<String, String> {
    use std::process::Command;

    let adb_path = "platform-tools/adb.exe";
    let args: Vec<&str> = command.split_whitespace().collect();

    let mut cmd = Command::new(adb_path);
    cmd.args(&args);

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                let result = String::from_utf8_lossy(&output.stdout);
                Ok(result.to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("ADB命令执行失败: {}", error))
            }
        }
        Err(e) => Err(format!("无法执行ADB命令: {}", e)),
    }
}

// 连接ADB设备
#[tauri::command]
async fn connect_adb_device(
    adb_path: String,
    address: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service
        .connect_device(&adb_path, &address)
        .map_err(|e| e.to_string())
}

// 断开ADB设备
#[tauri::command]
async fn disconnect_adb_device(
    adb_path: String,
    address: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service
        .disconnect_device(&adb_path, &address)
        .map_err(|e| e.to_string())
}

// 启动ADB服务器
#[tauri::command]
async fn start_adb_server(
    adb_path: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service.start_server(&adb_path).map_err(|e| e.to_string())
}

// 停止ADB服务器
#[tauri::command]
async fn kill_adb_server(
    adb_path: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service.kill_server(&adb_path).map_err(|e| e.to_string())
}

// 获取设备属性
#[tauri::command]
async fn get_device_properties(
    adb_path: String,
    device_id: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service
        .get_device_properties(&adb_path, &device_id)
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct XiaohongshuFollowRequest {
    device: String,
    max_follows: Option<usize>,
    contacts: Vec<ContactInfo>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct ContactInfo {
    name: String,
    phone: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct XiaohongshuFollowResult {
    success: bool,
    followed_count: usize,
    total_contacts: usize,
    message: String,
    details: Vec<FollowDetail>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct FollowDetail {
    contact_name: String,
    contact_phone: String,
    follow_status: String, // "pending", "success", "failed", "skipped"
    message: String,
    timestamp: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct DeviceInfo {
    id: String,
    name: String,
    status: String,
}

// 新增：小红书关注命令
#[tauri::command]
async fn xiaohongshu_follow_contacts(
    request: XiaohongshuFollowRequest,
) -> Result<XiaohongshuFollowResult, String> {
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    println!(
        "收到小红书关注请求: device={}, max_follows={:?}, contacts_count={}",
        request.device,
        request.max_follows,
        request.contacts.len()
    );

    let max_follows = request.max_follows.unwrap_or(5);
    let contacts_to_follow = request
        .contacts
        .into_iter()
        .take(max_follows)
        .collect::<Vec<_>>();

    // 调用 xiaohongshu-follow-test 程序
    let current_dir = std::env::current_dir().map_err(|e| format!("获取当前目录失败: {}", e))?;

    println!("当前工作目录: {:?}", current_dir);

    // 尝试多个可能的路径
    let possible_paths = vec![
        current_dir.join("xiaohongshu-follow-test"),
        current_dir
            .parent()
            .unwrap_or(&current_dir)
            .join("xiaohongshu-follow-test"),
        std::path::PathBuf::from("D:\\repositories\\employeeGUI\\xiaohongshu-follow-test"),
    ];

    let mut xiaohongshu_test_path = None;
    for path in possible_paths {
        println!("检查路径: {:?}", path);
        if path.exists() && path.is_dir() {
            println!("找到有效路径: {:?}", path);
            xiaohongshu_test_path = Some(path);
            break;
        }
    }

    let xiaohongshu_test_path =
        xiaohongshu_test_path.ok_or_else(|| "找不到 xiaohongshu-follow-test 目录".to_string())?;

    println!("使用执行路径: {:?}", xiaohongshu_test_path);

    let output = {
        let mut cmd = Command::new("cargo");
        cmd.arg("run")
            .arg("--")
            .arg("follow-from-gui")
            .arg("--device")
            .arg(&request.device)
            .arg("--max-follows")
            .arg(max_follows.to_string());

        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        cmd.arg("--contacts-json")
            .arg(&serde_json::to_string(&contacts_to_follow).unwrap_or_default())
            .current_dir(&xiaohongshu_test_path)
            .output()
            .map_err(|e| format!("执行小红书关注命令失败: {}", e))?
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    println!("关注命令输出: {}", stdout);
    if !stderr.is_empty() {
        println!("关注命令错误: {}", stderr);
    }

    let success = output.status.success();
    let followed_count = if success {
        // 从输出中解析关注数量
        stdout
            .lines()
            .find(|line| line.contains("已成功关注"))
            .and_then(|line| {
                line.split_whitespace()
                    .find(|word| word.parse::<usize>().is_ok())
                    .and_then(|word| word.parse().ok())
            })
            .unwrap_or(0)
    } else {
        0
    };

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        .to_string();

    let details: Vec<FollowDetail> = contacts_to_follow
        .iter()
        .enumerate()
        .map(|(i, contact)| FollowDetail {
            contact_name: contact.name.clone(),
            contact_phone: contact.phone.clone(),
            follow_status: if success && i < followed_count {
                "success".to_string()
            } else if success {
                "skipped".to_string()
            } else {
                "failed".to_string()
            },
            message: if success && i < followed_count {
                "关注成功".to_string()
            } else if success {
                "已跳过".to_string()
            } else {
                "关注失败".to_string()
            },
            timestamp: timestamp.clone(),
        })
        .collect();

    let result = XiaohongshuFollowResult {
        success,
        followed_count,
        total_contacts: contacts_to_follow.len(),
        message: if success {
            format!("成功关注 {} 个好友", followed_count)
        } else {
            format!("关注失败: {}", stderr)
        },
        details,
    };

    Ok(result)
}

// 获取ADB设备列表（用于小红书功能）
#[tauri::command]
async fn get_xiaohongshu_devices() -> Result<Vec<DeviceInfo>, String> {
    use std::process::Command;

    let output = {
        let mut cmd = Command::new("adb");
        cmd.arg("devices");

        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        cmd.output()
            .map_err(|e| format!("执行adb devices失败: {}", e))?
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut devices = Vec::new();

    for line in stdout.lines().skip(1) {
        // 跳过标题行
        if line.trim().is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let device_id = parts[0].to_string();
            let status = match parts[1] {
                "device" => "online",
                "offline" => "offline",
                _ => "unknown",
            };

            devices.push(DeviceInfo {
                id: device_id.clone(),
                name: format!("Android设备 {}", device_id),
                status: status.to_string(),
            });
        }
    }

    Ok(devices)
}

// 写入文件
#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("写入文件失败: {}", e))
}

// 删除文件
#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    match std::fs::remove_file(&path) {
        Ok(_) => Ok(()),
        Err(e) => {
            // 如果文件不存在，不算错误
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(())
            } else {
                Err(format!("删除文件失败: {}", e))
            }
        }
    }
}

// ====== 日志桥接相关命令 ======

// 获取所有日志
#[tauri::command]
async fn get_logs() -> Result<Vec<LogEntry>, String> {
    Ok(LOG_COLLECTOR.get_logs())
}

// 获取ADB命令日志
#[tauri::command]
async fn get_adb_command_logs() -> Result<Vec<AdbCommandLog>, String> {
    Ok(LOG_COLLECTOR.get_adb_command_logs())
}

// 获取过滤后的日志
#[tauri::command]
async fn get_filtered_logs(
    level_filter: Option<Vec<String>>,
    category_filter: Option<Vec<String>>,
    source_filter: Option<Vec<String>>,
    start_time: Option<String>,
    end_time: Option<String>,
) -> Result<Vec<LogEntry>, String> {
    Ok(LOG_COLLECTOR.get_filtered_logs(
        level_filter,
        category_filter,
        source_filter,
        start_time,
        end_time,
    ))
}

// 清空日志
#[tauri::command]
async fn clear_logs() -> Result<(), String> {
    LOG_COLLECTOR.clear_logs();
    Ok(())
}

// 添加自定义日志条目
#[tauri::command]
async fn add_log_entry(
    level: String,
    category: String,
    source: String,
    message: String,
    details: Option<String>,
    device_id: Option<String>,
) -> Result<(), String> {
    LOG_COLLECTOR.add_log(
        &level,
        &category,
        &source,
        &message,
        details.as_deref(),
        device_id.as_deref(),
    );
    Ok(())
}

fn main() {
    // 初始化日志系统
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,employee_gui=debug,xiaohongshu_automator=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("🚀 启动EmployeeGUI应用程序");
    info!("📊 日志级别: DEBUG (开发模式)");

    let employee_service = EmployeeService::new().expect("Failed to initialize employee service");
    let adb_service = AdbService::new();
    let xiaohongshu_service = XiaohongshuService::new();
    let xiaohongshu_long_connection_service = XiaohongshuLongConnectionService::new();
    let smart_app_service = SmartAppManagerState::new();
    
    // 初始化实时设备跟踪器 (替代旧的轮询系统)
    initialize_device_tracker()
        .expect("Failed to initialize device tracker");

    info!("✅ 所有服务初始化完成 (仅实时跟踪，无轮询)");

    tauri::Builder::default()
        .setup(|_app| {
            // 设置日志收集器的app handle以便实时发送日志到前端
            // 注意：这里需要通过不安全的方式来设置，因为LOG_COLLECTOR是静态的
            // 在实际应用中，我们会在启动后通过命令来初始化
            Ok(())
        })
        .manage(Mutex::new(employee_service))
        .manage(Mutex::new(adb_service))
        .manage(tokio::sync::Mutex::new(xiaohongshu_service))
        .manage(tokio::sync::Mutex::new(xiaohongshu_long_connection_service))
        .manage(smart_app_service)
        .invoke_handler(tauri::generate_handler![
            get_employees,
            add_employee,
            update_employee,
            delete_employee,
            execute_adb_command,
            check_file_exists,
            detect_ldplayer_adb,
            detect_smart_adb_path,
            get_adb_devices,
            get_adb_version,
            connect_adb_device,
            disconnect_adb_device,
            start_adb_server,
            kill_adb_server,
            get_device_properties,  // 添加设备属性获取命令
            // 基于host:track-devices的实时设备跟踪
            start_device_tracking,    // 启动实时设备跟踪
            stop_device_tracking,     // 停止设备跟踪  
            get_tracked_devices,      // 获取当前跟踪的设备
            start_adb_server_simple,
            kill_adb_server_simple,
            execute_adb_command_simple,
            write_file,
            delete_file,
            // 日志桥接命令
            get_logs,
            get_adb_command_logs,
            get_filtered_logs,
            clear_logs,
            add_log_entry,
            employee_login,
            verify_token,
            get_current_user,
            employee_logout,
            refresh_token,
            change_password,
            parse_contact_file,
            get_contact_file_info,
            // 新增的VCF导入和小红书自动关注功能
            generate_vcf_file,
            import_vcf_contacts,
            import_vcf_contacts_async_safe,     // 新增异步安全版本
            import_vcf_contacts_optimized,      // 现有优化版本
            import_vcf_contacts_python_version, // Python移植版本
            import_vcf_contacts_with_intent_fallback, // 新增Intent方法
            verify_vcf_import,
            debug_vcf_import_with_crash_detection, // 详细崩溃调试命令
            // 雷电模拟器专用VCF打开功能
            open_vcf_file_ldplayer,       // 打开已存在的VCF文件
            import_and_open_vcf_ldplayer, // 完整的传输+打开流程
            // UI状态读取功能
            read_device_ui_state, // 实时读取设备UI状态
            // 智能VCF打开器
            smart_vcf_opener, // 基于UI状态的智能VCF打开
            check_xiaohongshu_app_status,
            navigate_to_xiaohongshu_contacts,
            xiaohongshu_auto_follow,
            xiaohongshu_follow_contacts,
            get_xiaohongshu_devices,
            import_and_follow_xiaohongshu,
            import_and_follow_xiaohongshu_enhanced, // 增强版VCF导入+自动关注
            // 新的小红书服务模块化命令
            initialize_xiaohongshu_service,
            check_xiaohongshu_status,
            navigate_to_contacts_page,
            auto_follow_contacts,
            get_xiaohongshu_service_status,
            execute_complete_xiaohongshu_workflow,
            // 小红书长连接服务命令
            initialize_xiaohongshu_long_connection_service,
            check_xiaohongshu_app_status_long_connection,
            launch_xiaohongshu_app_long_connection,
            navigate_to_discover_friends_long_connection,
            execute_auto_follow_long_connection,
            execute_complete_workflow_long_connection,
            cleanup_xiaohongshu_long_connection_service,
            // 安全ADB管理功能
            get_adb_devices_safe, // 使用安全ADB检测设备
            safe_adb_push,        // 使用安全ADB传输文件
            // 脚本执行器功能
            execute_automation_script,  // 执行自动化脚本
            validate_device_connection, // 验证设备连接
            // 智能脚本执行器功能
            execute_single_step_test,        // 执行单步测试
            // 截图服务功能
            capture_device_screenshot,    // 捕获设备截图
            get_device_screen_resolution, // 获取设备分辨率
            // XML判断服务功能
            get_device_ui_xml,       // 获取UI XML结构
            find_xml_ui_elements,    // 查找XML UI元素
            wait_for_ui_element,     // 等待元素出现
            check_device_page_state, // 检查页面状态
            // 智能应用管理功能
            get_device_apps,         // 获取设备应用列表
            search_device_apps,      // 搜索设备应用
            launch_device_app,       // 启动应用
            get_cached_device_apps,  // 获取缓存的应用列表
            get_popular_apps,        // 获取常用应用列表
            // 导航栏检测功能
            detect_navigation_bar,   // 检测导航栏
            click_navigation_button, // 点击导航按钮
            get_navigation_configs   // 获取预设配置
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
