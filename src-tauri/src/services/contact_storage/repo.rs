use chrono::Local;
use rusqlite::{params, Connection, Result as SqlResult};

use super::models::{ContactNumberDto, ContactNumberList};

pub fn get_contacts_db_path() -> String {
    // 使用 SQLite 文件位于 data/contacts.db（相对项目根目录）
    // 若已有其他路径，请在此统一修改
    "data/contacts.db".to_string()
}

pub fn init_db(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contact_numbers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE,
            name TEXT,
            source_file TEXT,
            created_at TEXT
        )",
        [],
    )?;
    Ok(())
}

pub fn insert_numbers(conn: &Connection, numbers: &[(String, String)], source_file: &str) -> (i64, i64, Vec<String>) {
    let mut inserted: i64 = 0;
    let mut duplicates: i64 = 0;
    let mut errors: Vec<String> = Vec::new();
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for (phone, name) in numbers {
        let res = conn.execute(
            "INSERT OR IGNORE INTO contact_numbers (phone, name, source_file, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![phone, name, source_file, now],
        );
        match res {
            Ok(affected) => {
                if affected > 0 { inserted += 1; } else { duplicates += 1; }
            }
            Err(e) => errors.push(format!("{}: {}", phone, e)),
        }
    }

    (inserted, duplicates, errors)
}

pub fn list_numbers(conn: &Connection, limit: i64, offset: i64, search: Option<String>) -> SqlResult<ContactNumberList> {
    let mut where_clause = String::new();
    let mut params_vec: Vec<(String, String)> = Vec::new();

    if let Some(s) = search {
        if !s.trim().is_empty() {
            where_clause = " WHERE phone LIKE :kw OR name LIKE :kw".to_string();
            params_vec.push( (":kw".to_string(), format!("%{}%", s)) );
        }
    }

    let total_sql = format!("SELECT COUNT(*) FROM contact_numbers{}", where_clause);
    let mut stmt_total = conn.prepare(&total_sql)?;
    let total: i64 = if params_vec.is_empty() {
        stmt_total.query_row([], |row| row.get(0))?
    } else {
        let mut total_val: i64 = 0;
        let mut q = stmt_total.query_named(params_vec.iter().map(|(k,v)| (k.as_str(), v.as_str())))?;
        if let Some(row) = q.next()? {
            total_val = row.get(0)?;
        }
        total_val
    };

    let list_sql = format!(
        "SELECT id, phone, name, source_file, created_at FROM contact_numbers{} ORDER BY id DESC LIMIT ?1 OFFSET ?2",
        where_clause
    );
    let mut stmt = conn.prepare(&list_sql)?;
    let mut rows = stmt.query(params![limit, offset])?;

    let mut items: Vec<ContactNumberDto> = Vec::new();
    while let Some(row) = rows.next()? {
        items.push(ContactNumberDto {
            id: row.get(0)?,
            phone: row.get(1)?,
            name: row.get(2)?,
            source_file: row.get(3)?,
            created_at: row.get(4)?,
        });
    }

    Ok(ContactNumberList { total, items })
}

pub fn fetch_numbers(conn: &Connection, count: i64) -> SqlResult<Vec<ContactNumberDto>> {
    let mut stmt = conn.prepare(
        "SELECT id, phone, name, source_file, created_at FROM contact_numbers ORDER BY id ASC LIMIT ?1",
    )?;
    let mut rows = stmt.query(params![count])?;
    let mut items: Vec<ContactNumberDto> = Vec::new();
    while let Some(row) = rows.next()? {
        items.push(ContactNumberDto {
            id: row.get(0)?,
            phone: row.get(1)?,
            name: row.get(2)?,
            source_file: row.get(3)?,
            created_at: row.get(4)?,
        });
    }
    Ok(items)
}
