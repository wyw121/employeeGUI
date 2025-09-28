use std::fs;
use std::path::Path;

use rusqlite::Connection;

use super::models::{ContactNumberList, ImportNumbersResult};
use super::models::{ContactNumberStatsDto, IndustryCountDto};
use super::models::AllocationResultDto;
use super::parser::extract_numbers_from_text;
use super::repo::{
    fetch_numbers,
    fetch_numbers_by_id_range,
    fetch_numbers_by_id_range_unconsumed,
    fetch_unclassified_numbers,
    mark_numbers_used_by_id_range,
    get_contacts_db_path,
    init_db,
    insert_numbers,
    list_numbers,
    list_numbers_filtered,
    create_vcf_batch,
    list_vcf_batches,
    get_vcf_batch,
    create_import_session,
    finish_import_session,
    list_import_sessions,
    list_numbers_by_batch,
    list_numbers_without_batch,
    list_numbers_without_batch_filtered,
    get_contact_number_stats,
    get_distinct_industries,
    set_numbers_industry_by_id_range,
    create_vcf_batch_with_numbers,
    list_numbers_for_vcf_batch,
    tag_numbers_industry_by_vcf_batch,
    allocate_numbers_to_device,
};

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

/// 为设备分配号码，创建批次与待导入会话
#[tauri::command]
pub async fn allocate_numbers_to_device_cmd(device_id: String, count: i64, industry: Option<String>) -> Result<AllocationResultDto, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    match allocate_numbers_to_device(&conn, &device_id, count, industry.as_deref()) {
        Ok((batch_id, vcf_file_path, number_ids, session_id)) => Ok(AllocationResultDto {
            device_id,
            batch_id,
            vcf_file_path,
            number_count: number_ids.len() as i64,
            number_ids,
            session_id,
        }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn list_contact_numbers(limit: Option<i64>, offset: Option<i64>, search: Option<String>, industry: Option<String>, status: Option<String>) -> Result<ContactNumberList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    // 若提供 industry/status 则走带筛选的路径
    if industry.is_some() || status.is_some() {
        list_numbers_filtered(&conn, limit, offset, search, industry, status).map_err(|e| e.to_string())
    } else {
        list_numbers(&conn, limit, offset, search).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn fetch_contact_numbers(count: i64) -> Result<Vec<super::models::ContactNumberDto>, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;

    fetch_numbers(&conn, count).map_err(|e| e.to_string())
}

/// 获取未分类号码
#[tauri::command]
pub async fn fetch_unclassified_contact_numbers(count: i64, only_unconsumed: Option<bool>) -> Result<Vec<super::models::ContactNumberDto>, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let only = only_unconsumed.unwrap_or(true);
    fetch_unclassified_numbers(&conn, count, only).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_contact_numbers_by_id_range(start_id: i64, end_id: i64) -> Result<Vec<super::models::ContactNumberDto>, String> {
    if end_id < start_id { return Err("end_id must be >= start_id".to_string()); }
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;

    fetch_numbers_by_id_range(&conn, start_id, end_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_contact_numbers_by_id_range_unconsumed(start_id: i64, end_id: i64) -> Result<Vec<super::models::ContactNumberDto>, String> {
    if end_id < start_id { return Err("end_id must be >= start_id".to_string()); }
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    fetch_numbers_by_id_range_unconsumed(&conn, start_id, end_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mark_contact_numbers_used_by_id_range(start_id: i64, end_id: i64, batch_id: String) -> Result<i64, String> {
    if end_id < start_id { return Err("end_id must be >= start_id".to_string()); }
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    mark_numbers_used_by_id_range(&conn, start_id, end_id, &batch_id).map_err(|e| e.to_string())
}

// -------- 新增：批次与导入会话 API --------

#[tauri::command]
pub async fn create_vcf_batch_record(batch_id: String, vcf_file_path: String, source_start_id: Option<i64>, source_end_id: Option<i64>) -> Result<(), String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    create_vcf_batch(&conn, &batch_id, &vcf_file_path, source_start_id, source_end_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_vcf_batch_records(limit: Option<i64>, offset: Option<i64>) -> Result<super::models::VcfBatchList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    list_vcf_batches(&conn, limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_vcf_batch_record(batch_id: String) -> Result<Option<super::models::VcfBatchDto>, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    get_vcf_batch(&conn, &batch_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_import_session_record(batch_id: String, device_id: String) -> Result<i64, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    create_import_session(&conn, &batch_id, &device_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn finish_import_session_record(session_id: i64, status: String, imported_count: i64, failed_count: i64, error_message: Option<String>) -> Result<(), String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    finish_import_session(&conn, session_id, &status, imported_count, failed_count, error_message.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_import_session_records(device_id: Option<String>, batch_id: Option<String>, industry: Option<String>, limit: Option<i64>, offset: Option<i64>) -> Result<super::models::ImportSessionList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    list_import_sessions(&conn, device_id.as_deref(), batch_id.as_deref(), industry.as_deref(), limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_numbers_by_vcf_batch(batch_id: String, only_used: Option<bool>, limit: Option<i64>, offset: Option<i64>) -> Result<ContactNumberList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    list_numbers_by_batch(&conn, &batch_id, only_used, limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_numbers_by_vcf_batch_filtered(batch_id: String, industry: Option<String>, status: Option<String>, limit: Option<i64>, offset: Option<i64>) -> Result<ContactNumberList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    list_numbers_by_batch_filtered(&conn, &batch_id, industry, status, limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_numbers_without_vcf_batch(limit: Option<i64>, offset: Option<i64>, industry: Option<String>, status: Option<String>) -> Result<ContactNumberList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    if industry.is_some() || status.is_some() {
        list_numbers_without_batch_filtered(&conn, limit, offset, industry, status).map_err(|e| e.to_string())
    } else {
        list_numbers_without_batch(&conn, limit, offset).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn get_contact_number_stats_cmd() -> Result<ContactNumberStatsDto, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let raw = get_contact_number_stats(&conn).map_err(|e| e.to_string())?;
    Ok(ContactNumberStatsDto {
        total: raw.total,
        unclassified: raw.unclassified,
        not_imported: raw.not_imported,
        per_industry: raw
            .per_industry
            .into_iter()
            .map(|(industry, count)| IndustryCountDto { industry, count })
            .collect(),
    })
}

#[tauri::command]
pub async fn set_contact_numbers_industry_by_id_range(start_id: i64, end_id: i64, industry: String) -> Result<i64, String> {
    if end_id < start_id { return Err("end_id must be >= start_id".to_string()); }
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    set_numbers_industry_by_id_range(&conn, start_id, end_id, &industry).map_err(|e| e.to_string())
}

/// 创建批次并记录号码映射
#[tauri::command]
pub async fn create_vcf_batch_with_numbers_cmd(batch_id: String, vcf_file_path: String, source_start_id: Option<i64>, source_end_id: Option<i64>, number_ids: Vec<i64>) -> Result<usize, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    create_vcf_batch_with_numbers(&conn, &batch_id, &vcf_file_path, source_start_id, source_end_id, &number_ids).map_err(|e| e.to_string())
}

/// 通过映射表列出某批次包含的号码
#[tauri::command]
pub async fn list_numbers_for_vcf_batch_cmd(batch_id: String, limit: Option<i64>, offset: Option<i64>) -> Result<ContactNumberList, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    list_numbers_for_vcf_batch(&conn, &batch_id, limit, offset).map_err(|e| e.to_string())
}

/// 按批次为其包含的号码打上行业标签
#[tauri::command]
pub async fn tag_numbers_industry_by_vcf_batch_cmd(batch_id: String, industry: String) -> Result<i64, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    tag_numbers_industry_by_vcf_batch(&conn, &batch_id, &industry).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_distinct_industries_cmd() -> Result<Vec<String>, String> {
    let db_path = get_contacts_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    init_db(&conn).map_err(|e| format!("初始化数据库失败: {}", e))?;
    get_distinct_industries(&conn).map_err(|e| e.to_string())
}
