use chrono::Utc;
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;

#[derive(Debug, Serialize)]
pub struct ImportNumbersResult {
    pub success: bool,
    pub total_files: usize,
    pub total_numbers: usize,
    pub inserted: usize,
    pub duplicates: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ContactNumberDto {
    pub id: i64,
    pub phone: String,
    pub name: String,
    pub source_file: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ContactNumberList {
    pub total: i64,
    pub items: Vec<ContactNumberDto>,
}

/// 简单的手机号码校验：11位数字且以1开头（与 contact_service.rs 保持一致约束）
fn is_phone_number(text: &str) -> bool {
    text.len() == 11 && text.starts_with('1') && text.chars().all(|c| c.is_ascii_digit())
}

fn ensure_data_dir() -> PathBuf {
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let app_data_dir = current_dir.join("data");
    let _ = std::fs::create_dir_all(&app_data_dir);
    app_data_dir
}

fn open_db() -> SqliteResult<Connection> {
    let db_path = ensure_data_dir().join("contacts.db");
    let conn = Connection::open(&db_path)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contact_numbers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL UNIQUE,
            name TEXT,
            source_file TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(conn)
}

fn insert_numbers(conn: &mut Connection, entries: Vec<(String, Option<String>, Option<String>)>) -> (usize, usize) {
    // returns (inserted, duplicates)
    let mut inserted = 0usize;
    let mut duplicates = 0usize;
    let now = Utc::now().to_rfc3339();

    let tx = conn.transaction().unwrap();
    for (phone, name_opt, source_opt) in entries {
        let res = tx.execute(
            "INSERT OR IGNORE INTO contact_numbers (phone, name, source_file, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![phone, name_opt.unwrap_or_default(), source_opt.unwrap_or_default(), now],
        );
        match res {
            Ok(1) => inserted += 1,
            Ok(0) => duplicates += 1,
            Ok(_) => {}
            Err(_) => {
                // 忽略单条错误，保证整体导入进行；统计为重复以外的失败归入 duplicates 便于简化统计
                duplicates += 1;
            }
        }
    }
    let _ = tx.commit();
    (inserted, duplicates)
}

fn extract_numbers_from_text(content: &str, default_name_prefix: &str) -> Vec<(String, Option<String>)> {
    let mut list = Vec::new();
    for (idx, line) in content.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        // 支持常见分隔：逗号/管道/制表符/空格
        let mut parts: Vec<&str> = Vec::new();
        for sep in [',', '|', '\t'] {
            if line.contains(sep) {
                parts = line.split(sep).map(|s| s.trim()).collect();
                break;
            }
        }
        if parts.is_empty() {
            parts = line.split_whitespace().collect();
        }
        if parts.is_empty() { continue; }

        // 策略：优先在各字段中寻找手机号；若仅一列且是手机号，则使用默认姓名
        let mut name: Option<String> = None;
        let mut phone: Option<String> = None;
        for p in &parts {
            if is_phone_number(p) { phone = Some((*p).to_string()); }
        }
        if phone.is_none() {
            continue; // 该行不含有效号码
        }
        if parts.len() >= 2 {
            // 假定第一列可能为姓名
            if !is_phone_number(parts[0]) {
                name = Some(parts[0].to_string());
            }
        } else {
            name = Some(format!("联系人{}", idx + 1));
        }
        list.push((phone.unwrap(), name));
    }
    list
}

fn read_text_file(path: &Path) -> std::io::Result<String> {
    fs::read_to_string(path)
}

#[command]
pub async fn import_contact_numbers_from_file(file_path: String) -> Result<ImportNumbersResult, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }
    if path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()) != Some("txt".to_string()) {
        return Err("仅支持TXT文件".to_string());
    }

    let content = read_text_file(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let pairs = extract_numbers_from_text(&content, "联系人");

    let mut conn = open_db().map_err(|e| format!("打开数据库失败: {}", e))?;
    let entries: Vec<(String, Option<String>, Option<String>)> = pairs
        .into_iter()
        .map(|(phone, name)| (phone, name, Some(path.to_string_lossy().to_string())))
        .collect();
    let (inserted, duplicates) = insert_numbers(&mut conn, entries);

    Ok(ImportNumbersResult {
        success: true,
        total_files: 1,
        total_numbers: inserted + duplicates,
        inserted,
        duplicates,
        errors: vec![],
    })
}

#[command]
pub async fn import_contact_numbers_from_folder(folder_path: String) -> Result<ImportNumbersResult, String> {
    let dir = PathBuf::from(&folder_path);
    if !dir.exists() || !dir.is_dir() {
        return Err(format!("无效的文件夹: {}", folder_path));
    }

    let mut total_files = 0usize;
    let mut total_numbers = 0usize;
    let mut inserted_all = 0usize;
    let mut duplicates_all = 0usize;
    let mut errors: Vec<String> = Vec::new();

    let mut conn = open_db().map_err(|e| format!("打开数据库失败: {}", e))?;

    for entry in fs::read_dir(&dir).map_err(|e| format!("读取目录失败: {}", e))? {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()) == Some("txt".to_string()) {
                total_files += 1;
                match read_text_file(&path) {
                    Ok(content) => {
                        let pairs = extract_numbers_from_text(&content, "联系人");
                        total_numbers += pairs.len();
                        let entries: Vec<(String, Option<String>, Option<String>)> = pairs
                            .into_iter()
                            .map(|(phone, name)| (phone, name, Some(path.to_string_lossy().to_string())))
                            .collect();
                        let (ins, dup) = insert_numbers(&mut conn, entries);
                        inserted_all += ins;
                        duplicates_all += dup;
                    }
                    Err(e) => {
                        errors.push(format!("读取文件失败 {}: {}", path.display(), e));
                    }
                }
            }
        }
    }

    Ok(ImportNumbersResult {
        success: errors.is_empty(),
        total_files,
        total_numbers,
        inserted: inserted_all,
        duplicates: duplicates_all,
        errors,
    })
}

#[command]
pub async fn list_contact_numbers(limit: Option<i64>, offset: Option<i64>, search: Option<String>) -> Result<ContactNumberList, String> {
    let conn = open_db().map_err(|e| format!("打开数据库失败: {}", e))?;
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    let mut where_clause = String::new();
    let mut params_vec: Vec<(String, String)> = Vec::new();
    if let Some(q) = search {
        if !q.trim().is_empty() {
            where_clause.push_str(" WHERE phone LIKE ?1 OR name LIKE ?1 ");
            params_vec.push(("q".to_string(), format!("%{}%", q.trim())));
        }
    }

    let total_sql = format!("SELECT COUNT(*) FROM contact_numbers{}", where_clause);
    let total: i64 = if params_vec.is_empty() {
        conn.query_row(&total_sql, [], |row| row.get(0)).unwrap_or(0)
    } else {
        let qv = params_vec[0].1.clone();
        conn.query_row(&total_sql, [qv], |row| row.get(0)).unwrap_or(0)
    };

    let list_sql = format!("SELECT id, phone, name, source_file, created_at FROM contact_numbers{} ORDER BY id DESC LIMIT ? OFFSET ?", where_clause);
    let mut stmt = if params_vec.is_empty() {
        conn.prepare(&list_sql).map_err(|e| e.to_string())?
    } else {
        conn.prepare(&list_sql).map_err(|e| e.to_string())?
    };

    let mut items: Vec<ContactNumberDto> = Vec::new();
    if params_vec.is_empty() {
        let rows = stmt.query_map((limit, offset), |row| {
            Ok(ContactNumberDto {
                id: row.get(0)?,
                phone: row.get(1)?,
                name: row.get::<_, String>(2).unwrap_or_default(),
                source_file: row.get::<_, String>(3).unwrap_or_default(),
                created_at: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;
        for r in rows { items.push(r.map_err(|e| e.to_string())?); }
    } else {
        let qv = params_vec[0].1.clone();
        let rows = stmt.query_map((qv, limit, offset), |row| {
            Ok(ContactNumberDto {
                id: row.get(0)?,
                phone: row.get(1)?,
                name: row.get::<_, String>(2).unwrap_or_default(),
                source_file: row.get::<_, String>(3).unwrap_or_default(),
                created_at: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;
        for r in rows { items.push(r.map_err(|e| e.to_string())?); }
    }

    Ok(ContactNumberList { total, items })
}

#[command]
pub async fn fetch_contact_numbers(count: i64) -> Result<Vec<ContactNumberDto>, String> {
    let conn = open_db().map_err(|e| format!("打开数据库失败: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, phone, name, source_file, created_at FROM contact_numbers ORDER BY id ASC LIMIT ?1")
        .map_err(|e| e.to_string())?;
    let mut items: Vec<ContactNumberDto> = Vec::new();
    let rows = stmt
        .query_map([count], |row| {
            Ok(ContactNumberDto {
                id: row.get(0)?,
                phone: row.get(1)?,
                name: row.get::<_, String>(2).unwrap_or_default(),
                source_file: row.get::<_, String>(3).unwrap_or_default(),
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    for r in rows { items.push(r.map_err(|e| e.to_string())?); }
    Ok(items)
}

