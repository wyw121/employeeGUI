use std::fs;
use std::path::Path;

use rusqlite::Connection;

use super::models::{ContactNumberList, ImportNumbersResult};
use super::parser::extract_numbers_from_text;
use super::repo::{fetch_numbers, get_contacts_db_path, init_db, insert_numbers, list_numbers};

#[tauri::command]
pub async fn import_contact_numbers_from_file(file_path: String) -> Result<ImportNumbersResult, String> {
    if !Path::new(&file_path).exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    let content = fs::read_to_string(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let numbers = extract_numbers_from_text(&content);

    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;

    let (inserted, duplicates, errors) = insert_numbers(&conn, &numbers, &file_path);
    Ok(ImportNumbersResult {
        success: true,
        total_files: 1,
        total_numbers: numbers.len() as i64,
        inserted,
        duplicates,
        errors,
    })
}

#[tauri::command]
pub async fn import_contact_numbers_from_folder(folder_path: String) -> Result<ImportNumbersResult, String> {
    let folder = Path::new(&folder_path);
    if !folder.exists() || !folder.is_dir() {
        return Err(format!("文件夹不存在或不是目录: {}", folder_path));
    }

    let mut total_files: i64 = 0;
    let mut total_numbers: i64 = 0;
    let mut total_inserted: i64 = 0;
    let mut total_duplicates: i64 = 0;
    let mut all_errors: Vec<String> = Vec::new();

    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;

    for entry in fs::read_dir(folder).map_err(|e| format!("读取目录失败: {}", e))? {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy().to_lowercase() == "txt" {
                    total_files += 1;
                    match fs::read_to_string(&path) {
                        Ok(content) => {
                            let numbers = extract_numbers_from_text(&content);
                            let (inserted, duplicates, mut errors) = insert_numbers(&conn, &numbers, &path.to_string_lossy());
                            total_numbers += numbers.len() as i64;
                            total_inserted += inserted;
                            total_duplicates += duplicates;
                            all_errors.append(&mut errors);
                        }
                        Err(e) => all_errors.push(format!("读取文件失败 {}: {}", path.to_string_lossy(), e)),
                    }
                }
            }
        }
    }

    Ok(ImportNumbersResult {
        success: true,
        total_files,
        total_numbers,
        inserted: total_inserted,
        duplicates: total_duplicates,
        errors: all_errors,
    })
}

#[tauri::command]
pub async fn list_contact_numbers(limit: Option<i64>, offset: Option<i64>, search: Option<String>) -> Result<ContactNumberList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    list_numbers(&conn, limit, offset, search).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_contact_numbers(count: i64) -> Result<Vec<super::models::ContactNumberDto>, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;

    fetch_numbers(&conn, count).map_err(|e| e.to_string())
}
