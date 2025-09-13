// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod services;

use services::adb_service::AdbService;
use services::auth_service::*;
use services::contact_automation::*;
use services::contact_service::*;
use services::crash_debugger::*;
use services::crash_test::*;
use services::employee_service::{Employee, EmployeeService};
use services::permission_test::*;
use services::safe_adb_manager::*;
use services::smart_vcf_opener::*;
use services::ui_reader_service::*;
use std::sync::Mutex;
use tauri::State;

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

// 获取ADB设备列表
#[tauri::command]
async fn get_adb_devices(
    adb_path: String,
    service: State<'_, Mutex<AdbService>>,
) -> Result<String, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service.get_devices(&adb_path).map_err(|e| e.to_string())
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
async fn xiaohongshu_follow_contacts(request: XiaohongshuFollowRequest) -> Result<XiaohongshuFollowResult, String> {
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    println!("收到小红书关注请求: device={}, max_follows={:?}, contacts_count={}", 
             request.device, request.max_follows, request.contacts.len());

    let max_follows = request.max_follows.unwrap_or(5);
    let contacts_to_follow = request.contacts.into_iter().take(max_follows).collect::<Vec<_>>();
    
    // 调用 xiaohongshu-follow-test 程序
    let xiaohongshu_test_path = std::env::current_dir()
        .map_err(|e| format!("获取当前目录失败: {}", e))?
        .join("xiaohongshu-follow-test");
    
    println!("执行路径: {:?}", xiaohongshu_test_path);
    
    let output = Command::new("cargo")
        .arg("run")
        .arg("--")
        .arg("follow")
        .arg("--device")
        .arg(&request.device)
        .arg("--max-follows")
        .arg(max_follows.to_string())
        .current_dir(&xiaohongshu_test_path)
        .output()
        .map_err(|e| format!("执行小红书关注命令失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    println!("关注命令输出: {}", stdout);
    if !stderr.is_empty() {
        println!("关注命令错误: {}", stderr);
    }

    let success = output.status.success();
    let followed_count = if success {
        // 从输出中解析关注数量
        stdout.lines()
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

    let details: Vec<FollowDetail> = contacts_to_follow.iter().enumerate().map(|(i, contact)| {
        FollowDetail {
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
        }
    }).collect();

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

    let output = Command::new("adb")
        .arg("devices")
        .output()
        .map_err(|e| format!("执行adb devices失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut devices = Vec::new();

    for line in stdout.lines().skip(1) { // 跳过标题行
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

fn main() {
    let employee_service = EmployeeService::new().expect("Failed to initialize employee service");
    let adb_service = AdbService::new();

    tauri::Builder::default()
        .manage(Mutex::new(employee_service))
        .manage(Mutex::new(adb_service))
        .invoke_handler(tauri::generate_handler![
            get_employees,
            add_employee,
            update_employee,
            delete_employee,
            execute_adb_command,
            check_file_exists,
            detect_ldplayer_adb,
            get_adb_devices,
            connect_adb_device,
            disconnect_adb_device,
            start_adb_server,
            kill_adb_server,
            write_file,
            delete_file,
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
            test_vcf_import_crash_fix,             // 崩溃测试修复命令
            debug_vcf_import_with_crash_detection, // 详细崩溃调试命令
            // 雷电模拟器专用VCF打开功能
            open_vcf_file_ldplayer,       // 打开已存在的VCF文件
            import_and_open_vcf_ldplayer, // 完整的传输+打开流程
            // UI状态读取功能
            read_device_ui_state, // 实时读取设备UI状态
            find_ui_elements,     // 查找特定UI元素
            // 智能VCF打开器
            smart_vcf_opener, // 基于UI状态的智能VCF打开
            check_xiaohongshu_app_status,
            navigate_to_xiaohongshu_contacts,
            xiaohongshu_auto_follow,
            xiaohongshu_follow_contacts,
            get_xiaohongshu_devices,
            import_and_follow_xiaohongshu,
            // 权限处理测试功能
            test_permission_handling,
            test_vcf_import_with_permission,
            test_vcf_import_with_detailed_logs,
            // 安全ADB管理功能
            get_adb_devices_safe, // 使用安全ADB检测设备
            safe_adb_push         // 使用安全ADB传输文件
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
