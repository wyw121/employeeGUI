// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod services;

use services::employee_service::{Employee, EmployeeService};
use tauri::State;
use std::sync::Mutex;

// Tauri命令：获取所有员工
#[tauri::command]
async fn get_employees(service: State<'_, Mutex<EmployeeService>>) -> Result<Vec<Employee>, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service.get_all().map_err(|e| e.to_string())
}

// Tauri命令：添加员工
#[tauri::command]
async fn add_employee(employee: Employee, service: State<'_, Mutex<EmployeeService>>) -> Result<Employee, String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.create(employee).map_err(|e| e.to_string())
}

// Tauri命令：更新员工
#[tauri::command]
async fn update_employee(employee: Employee, service: State<'_, Mutex<EmployeeService>>) -> Result<Employee, String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.update(employee).map_err(|e| e.to_string())
}

// Tauri命令：删除员工
#[tauri::command]
async fn delete_employee(id: i32, service: State<'_, Mutex<EmployeeService>>) -> Result<(), String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.delete(id).map_err(|e| e.to_string())
}

fn main() {
    let employee_service = EmployeeService::new().expect("Failed to initialize employee service");

    tauri::Builder::default()
        .manage(Mutex::new(employee_service))
        .invoke_handler(tauri::generate_handler![
            get_employees,
            add_employee,
            update_employee,
            delete_employee
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
