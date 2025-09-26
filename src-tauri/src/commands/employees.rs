use tauri::State;
use std::sync::Mutex;
use crate::services::employee_service::{Employee, EmployeeService};

#[tauri::command]
pub async fn get_employees(service: State<'_, Mutex<EmployeeService>>) -> Result<Vec<Employee>, String> {
    let service = service.lock().map_err(|e| e.to_string())?;
    service.get_all().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_employee(employee: Employee, service: State<'_, Mutex<EmployeeService>>) -> Result<Employee, String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.create(employee).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_employee(employee: Employee, service: State<'_, Mutex<EmployeeService>>) -> Result<Employee, String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.update(employee).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_employee(id: i32, service: State<'_, Mutex<EmployeeService>>) -> Result<(), String> {
    let mut service = service.lock().map_err(|e| e.to_string())?;
    service.delete(id).map_err(|e| e.to_string())
}
