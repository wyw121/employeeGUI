use chrono::Local;
use rusqlite::{params, Connection, Result as SqlResult};

use super::models::{ContactNumberDto, ContactNumberList};
use std::fs;
use std::path::Path;

pub fn get_contacts_db_path() -> String {
    // 确保 data 目录存在
    let data_dir = Path::new("data");
    if !data_dir.exists() {
        let _ = fs::create_dir_all(data_dir);
    }
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
    let mut kw: Option<String> = None;

    if let Some(s) = search {
        let s = s.trim().to_string();
        if !s.is_empty() {
            kw = Some(format!("%{}%", s));
        }
    }

    let total: i64 = if let Some(ref k) = kw {
        let total_sql = "SELECT COUNT(*) FROM contact_numbers WHERE phone LIKE ?1 OR name LIKE ?1";
        conn.query_row(total_sql, params![k], |row| row.get(0))?
    } else {
        let total_sql = "SELECT COUNT(*) FROM contact_numbers";
        conn.query_row(total_sql, [], |row| row.get(0))?
    };

    let mut items: Vec<ContactNumberDto> = Vec::new();
    
    if let Some(ref k) = kw {
        let list_sql = "SELECT id, phone, name, source_file, created_at FROM contact_numbers WHERE (phone LIKE ?1 OR name LIKE ?1) ORDER BY id DESC LIMIT ?2 OFFSET ?3";
        let mut stmt = conn.prepare(list_sql)?;
        let mut rows = stmt.query(params![k, limit, offset])?;
        
        while let Some(row) = rows.next()? {
            items.push(ContactNumberDto {
                id: row.get(0)?,
                phone: row.get(1)?,
                name: row.get(2)?,
                source_file: row.get(3)?,
                created_at: row.get(4)?,
            });
        }
    } else {
        let list_sql = "SELECT id, phone, name, source_file, created_at FROM contact_numbers ORDER BY id DESC LIMIT ?1 OFFSET ?2";
        let mut stmt = conn.prepare(list_sql)?;
        let mut rows = stmt.query(params![limit, offset])?;
        
        while let Some(row) = rows.next()? {
            items.push(ContactNumberDto {
                id: row.get(0)?,
                phone: row.get(1)?,
                name: row.get(2)?,
                source_file: row.get(3)?,
                created_at: row.get(4)?,
            });
        }
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
