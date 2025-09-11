// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod services;

use services::adb_service::AdbService;
use services::auth_service::*;
use services::contact_automation::*;
use services::contact_service::*;
use services::employee_service::{Employee, EmployeeService};
use services::permission_test::*;
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
            verify_vcf_import,
            check_xiaohongshu_app_status,
            navigate_to_xiaohongshu_contacts,
            xiaohongshu_auto_follow,
            import_and_follow_xiaohongshu,
            // 权限处理测试功能
            test_permission_handling,
            test_vcf_import_with_permission
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
