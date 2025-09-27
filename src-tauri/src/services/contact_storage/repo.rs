use chrono::Local;
use rusqlite::{params, Connection, Result as SqlResult};

use super::models::{ContactNumberDto, ContactNumberList};
use super::models::{VcfBatchDto, VcfBatchList, ImportSessionDto, ImportSessionList};
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
    // 尝试为消费策略添加列（如果已存在则忽略错误）
    let _ = conn.execute("ALTER TABLE contact_numbers ADD COLUMN used INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE contact_numbers ADD COLUMN used_at TEXT", []);
    let _ = conn.execute("ALTER TABLE contact_numbers ADD COLUMN used_batch TEXT", []);
    // 新增：行业分类（可为空）
    let _ = conn.execute("ALTER TABLE contact_numbers ADD COLUMN industry TEXT", []);

    // 追踪：批次与导入会话
    conn.execute(
        "CREATE TABLE IF NOT EXISTS vcf_batches (
            batch_id TEXT PRIMARY KEY,
            created_at TEXT,
            vcf_file_path TEXT,
            source_start_id INTEGER,
            source_end_id INTEGER
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS import_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT,
            device_id TEXT,
            status TEXT,
            imported_count INTEGER,
            failed_count INTEGER,
            started_at TEXT,
            finished_at TEXT,
            error_message TEXT
        )",
        [],
    )?;
    // 维护批次与号码的映射表（生成VCF时显式记录包含哪些号码）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS vcf_batch_numbers (
            batch_id TEXT,
            number_id INTEGER,
            PRIMARY KEY (batch_id, number_id)
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

/// 获取未分类号码，支持仅选择未消费的（按ID升序）
pub fn fetch_unclassified_numbers(conn: &Connection, count: i64, only_unconsumed: bool) -> SqlResult<Vec<ContactNumberDto>> {
    let mut items: Vec<ContactNumberDto> = Vec::new();
    let (sql, params_slice): (&str, Vec<&dyn rusqlite::ToSql>) = if only_unconsumed {
        (
            "SELECT id, phone, name, source_file, created_at FROM contact_numbers \
             WHERE (industry IS NULL OR TRIM(industry) = '') AND (used IS NULL OR used = 0) \
             ORDER BY id ASC LIMIT ?1",
            vec![&count],
        )
    } else {
        (
            "SELECT id, phone, name, source_file, created_at FROM contact_numbers \
             WHERE (industry IS NULL OR TRIM(industry) = '') \
             ORDER BY id ASC LIMIT ?1",
            vec![&count],
        )
    };
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(rusqlite::params_from_iter(params_slice))?;
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

/// 按ID区间获取号码（闭区间）
pub fn fetch_numbers_by_id_range(conn: &Connection, start_id: i64, end_id: i64) -> SqlResult<Vec<ContactNumberDto>> {
    let mut stmt = conn.prepare(
        "SELECT id, phone, name, source_file, created_at FROM contact_numbers WHERE id >= ?1 AND id <= ?2 ORDER BY id ASC",
    )?;
    let mut rows = stmt.query(params![start_id, end_id])?;
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

/// 仅获取未使用的号码（按ID区间）
pub fn fetch_numbers_by_id_range_unconsumed(conn: &Connection, start_id: i64, end_id: i64) -> SqlResult<Vec<ContactNumberDto>> {
    let mut stmt = conn.prepare(
        "SELECT id, phone, name, source_file, created_at FROM contact_numbers WHERE id >= ?1 AND id <= ?2 AND (used IS NULL OR used = 0) ORDER BY id ASC",
    )?;
    let mut rows = stmt.query(params![start_id, end_id])?;
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

/// 标记某个ID区间为已使用
pub fn mark_numbers_used_by_id_range(conn: &Connection, start_id: i64, end_id: i64, batch_id: &str) -> SqlResult<i64> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let affected = conn.execute(
        "UPDATE contact_numbers SET used = 1, used_at = ?1, used_batch = ?2 WHERE id >= ?3 AND id <= ?4",
        params![now, batch_id, start_id, end_id],
    )?;
    Ok(affected as i64)
}

// ---------- 批次与会话：仓储函数 ----------

pub fn create_vcf_batch(conn: &Connection, batch_id: &str, vcf_file_path: &str, source_start_id: Option<i64>, source_end_id: Option<i64>) -> SqlResult<()> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT OR REPLACE INTO vcf_batches (batch_id, created_at, vcf_file_path, source_start_id, source_end_id) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![batch_id, now, vcf_file_path, source_start_id, source_end_id],
    )?;
    Ok(())
}

pub fn list_vcf_batches(conn: &Connection, limit: i64, offset: i64) -> SqlResult<VcfBatchList> {
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM vcf_batches", [], |row| row.get(0))?;
    let mut items: Vec<VcfBatchDto> = Vec::new();
    let mut stmt = conn.prepare("SELECT batch_id, created_at, vcf_file_path, source_start_id, source_end_id FROM vcf_batches ORDER BY created_at DESC LIMIT ?1 OFFSET ?2")?;
    let mut rows = stmt.query(params![limit, offset])?;
    while let Some(row) = rows.next()? {
        items.push(VcfBatchDto {
            batch_id: row.get(0)?,
            created_at: row.get(1)?,
            vcf_file_path: row.get(2)?,
            source_start_id: row.get(3)?,
            source_end_id: row.get(4)?,
        });
    }
    Ok(VcfBatchList { total, items })
}

pub fn get_vcf_batch(conn: &Connection, batch_id: &str) -> SqlResult<Option<VcfBatchDto>> {
    let mut stmt = conn.prepare("SELECT batch_id, created_at, vcf_file_path, source_start_id, source_end_id FROM vcf_batches WHERE batch_id = ?1")?;
    let mut rows = stmt.query(params![batch_id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(VcfBatchDto {
            batch_id: row.get(0)?,
            created_at: row.get(1)?,
            vcf_file_path: row.get(2)?,
            source_start_id: row.get(3)?,
            source_end_id: row.get(4)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn create_import_session(conn: &Connection, batch_id: &str, device_id: &str) -> SqlResult<i64> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO import_sessions (batch_id, device_id, status, imported_count, failed_count, started_at) VALUES (?1, ?2, 'pending', 0, 0, ?3)",
        params![batch_id, device_id, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn finish_import_session(conn: &Connection, session_id: i64, status: &str, imported_count: i64, failed_count: i64, error_message: Option<&str>) -> SqlResult<()> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE import_sessions SET status = ?1, imported_count = ?2, failed_count = ?3, finished_at = ?4, error_message = ?5 WHERE id = ?6",
        params![status, imported_count, failed_count, now, error_message, session_id],
    )?;
    Ok(())
}

pub fn list_import_sessions(conn: &Connection, device_id: Option<&str>, batch_id: Option<&str>, limit: i64, offset: i64) -> SqlResult<ImportSessionList> {
    // 构建总数查询（根据过滤条件拼接占位符编号）
    let total: i64 = match (device_id, batch_id) {
        (Some(d), Some(b)) => {
            let sql = "SELECT COUNT(*) FROM import_sessions WHERE device_id = ?1 AND batch_id = ?2";
            conn.query_row(sql, params![d, b], |row| row.get(0))?
        }
        (Some(d), None) => {
            let sql = "SELECT COUNT(*) FROM import_sessions WHERE device_id = ?1";
            conn.query_row(sql, params![d], |row| row.get(0))?
        }
        (None, Some(b)) => {
            let sql = "SELECT COUNT(*) FROM import_sessions WHERE batch_id = ?1";
            conn.query_row(sql, params![b], |row| row.get(0))?
        }
        (None, None) => {
            let sql = "SELECT COUNT(*) FROM import_sessions";
            conn.query_row(sql, [], |row| row.get(0))?
        }
    };

    // 列表查询（按分支分别 prepare/query，保证占位符编号与参数匹配且生命周期安全）
    let mut items: Vec<ImportSessionDto> = Vec::new();
    match (device_id, batch_id) {
        (Some(d), Some(b)) => {
            let sql = "SELECT id, batch_id, device_id, status, imported_count, failed_count, started_at, finished_at, error_message \
                       FROM import_sessions WHERE device_id = ?1 AND batch_id = ?2 ORDER BY id DESC LIMIT ?3 OFFSET ?4";
            let mut stmt = conn.prepare(sql)?;
            let mut rows = stmt.query(params![d, b, limit, offset])?;
            while let Some(row) = rows.next()? {
                items.push(ImportSessionDto {
                    id: row.get(0)?,
                    batch_id: row.get(1)?,
                    device_id: row.get(2)?,
                    status: row.get(3)?,
                    imported_count: row.get(4)?,
                    failed_count: row.get(5)?,
                    started_at: row.get(6)?,
                    finished_at: row.get(7)?,
                    error_message: row.get(8)?,
                });
            }
        }
        (Some(d), None) => {
            let sql = "SELECT id, batch_id, device_id, status, imported_count, failed_count, started_at, finished_at, error_message \
                       FROM import_sessions WHERE device_id = ?1 ORDER BY id DESC LIMIT ?2 OFFSET ?3";
            let mut stmt = conn.prepare(sql)?;
            let mut rows = stmt.query(params![d, limit, offset])?;
            while let Some(row) = rows.next()? {
                items.push(ImportSessionDto {
                    id: row.get(0)?,
                    batch_id: row.get(1)?,
                    device_id: row.get(2)?,
                    status: row.get(3)?,
                    imported_count: row.get(4)?,
                    failed_count: row.get(5)?,
                    started_at: row.get(6)?,
                    finished_at: row.get(7)?,
                    error_message: row.get(8)?,
                });
            }
        }
        (None, Some(b)) => {
            let sql = "SELECT id, batch_id, device_id, status, imported_count, failed_count, started_at, finished_at, error_message \
                       FROM import_sessions WHERE batch_id = ?1 ORDER BY id DESC LIMIT ?2 OFFSET ?3";
            let mut stmt = conn.prepare(sql)?;
            let mut rows = stmt.query(params![b, limit, offset])?;
            while let Some(row) = rows.next()? {
                items.push(ImportSessionDto {
                    id: row.get(0)?,
                    batch_id: row.get(1)?,
                    device_id: row.get(2)?,
                    status: row.get(3)?,
                    imported_count: row.get(4)?,
                    failed_count: row.get(5)?,
                    started_at: row.get(6)?,
                    finished_at: row.get(7)?,
                    error_message: row.get(8)?,
                });
            }
        }
        (None, None) => {
            let sql = "SELECT id, batch_id, device_id, status, imported_count, failed_count, started_at, finished_at, error_message \
                       FROM import_sessions ORDER BY id DESC LIMIT ?1 OFFSET ?2";
            let mut stmt = conn.prepare(sql)?;
            let mut rows = stmt.query(params![limit, offset])?;
            while let Some(row) = rows.next()? {
                items.push(ImportSessionDto {
                    id: row.get(0)?,
                    batch_id: row.get(1)?,
                    device_id: row.get(2)?,
                    status: row.get(3)?,
                    imported_count: row.get(4)?,
                    failed_count: row.get(5)?,
                    started_at: row.get(6)?,
                    finished_at: row.get(7)?,
                    error_message: row.get(8)?,
                });
            }
        }
    }
    Ok(ImportSessionList { total, items })
}

/// 获取指定批次下的号码（区分是否已标记 used）
pub fn list_numbers_by_batch(conn: &Connection, batch_id: &str, only_used: Option<bool>, limit: i64, offset: i64) -> SqlResult<ContactNumberList> {
    let total_sql = match only_used {
        Some(true) => "SELECT COUNT(*) FROM contact_numbers WHERE used_batch = ?1",
        Some(false) => "SELECT COUNT(*) FROM contact_numbers WHERE (used_batch IS NULL OR used_batch != ?1)",
        None => "SELECT COUNT(*) FROM contact_numbers",
    };
    let total: i64 = if only_used.is_none() {
        conn.query_row(total_sql, [], |row| row.get(0))?
    } else {
        conn.query_row(total_sql, params![batch_id], |row| row.get(0))?
    };

    let mut items: Vec<ContactNumberDto> = Vec::new();
    let (sql, params_slice): (&str, Vec<&dyn rusqlite::ToSql>) = match only_used {
        Some(true) => (
            "SELECT id, phone, name, source_file, created_at FROM contact_numbers WHERE used_batch = ?1 ORDER BY id ASC LIMIT ?2 OFFSET ?3",
            vec![&batch_id as &dyn rusqlite::ToSql, &limit, &offset],
        ),
        Some(false) => (
            "SELECT id, phone, name, source_file, created_at FROM contact_numbers WHERE (used_batch IS NULL OR used_batch != ?1) ORDER BY id ASC LIMIT ?2 OFFSET ?3",
            vec![&batch_id as &dyn rusqlite::ToSql, &limit, &offset],
        ),
        None => (
            "SELECT id, phone, name, source_file, created_at FROM contact_numbers ORDER BY id ASC LIMIT ?1 OFFSET ?2",
            vec![&limit, &offset],
        ),
    };

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(rusqlite::params_from_iter(params_slice))?;
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

/// 统计号码池数据：各行业计数、未分类计数、未导入计数、总数
pub struct ContactNumberStatsRaw {
    pub total: i64,
    pub unclassified: i64,
    pub not_imported: i64,
    pub per_industry: Vec<(String, i64)>,
}

pub fn get_contact_number_stats(conn: &Connection) -> SqlResult<ContactNumberStatsRaw> {
    // 总数
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM contact_numbers", [], |row| row.get(0))?;
    // 未分类（NULL 或 空字符串）
    let unclassified: i64 = conn.query_row(
        "SELECT COUNT(*) FROM contact_numbers WHERE industry IS NULL OR TRIM(industry) = ''",
        [],
        |row| row.get(0),
    )?;
    // 未导入（未消费）
    let not_imported: i64 = conn.query_row(
        "SELECT COUNT(*) FROM contact_numbers WHERE used IS NULL OR used = 0",
        [],
        |row| row.get(0),
    )?;
    // 各行业计数（排除空值）
    let mut per_industry: Vec<(String, i64)> = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT industry, COUNT(*) AS cnt FROM contact_numbers WHERE industry IS NOT NULL AND TRIM(industry) != '' GROUP BY industry ORDER BY cnt DESC",
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let ind: String = row.get(0)?;
        let cnt: i64 = row.get(1)?;
        per_industry.push((ind, cnt));
    }
    Ok(ContactNumberStatsRaw { total, unclassified, not_imported, per_industry })
}

/// 设置指定ID区间内号码的行业标签（闭区间）
pub fn set_numbers_industry_by_id_range(conn: &Connection, start_id: i64, end_id: i64, industry: &str) -> SqlResult<i64> {
    let affected = conn.execute(
        "UPDATE contact_numbers SET industry = ?1 WHERE id >= ?2 AND id <= ?3",
        params![industry, start_id, end_id],
    )?;
    Ok(affected as i64)
}

/// 获取未生成 VCF 批次（未关联 used_batch）的号码
pub fn list_numbers_without_batch(conn: &Connection, limit: i64, offset: i64) -> SqlResult<ContactNumberList> {
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM contact_numbers WHERE (used_batch IS NULL OR used_batch = '')",
        [],
        |row| row.get(0),
    )?;
    let mut items: Vec<ContactNumberDto> = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT id, phone, name, source_file, created_at FROM contact_numbers WHERE (used_batch IS NULL OR used_batch = '') ORDER BY id ASC LIMIT ?1 OFFSET ?2",
    )?;
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
    Ok(ContactNumberList { total, items })
}

/// 创建批次并记录号码映射（若批次已存在则覆盖基本信息并增量插入映射）
pub fn create_vcf_batch_with_numbers(conn: &Connection, batch_id: &str, vcf_file_path: &str, source_start_id: Option<i64>, source_end_id: Option<i64>, number_ids: &[i64]) -> SqlResult<usize> {
    // 1) 批次记录（覆盖写入）
    create_vcf_batch(conn, batch_id, vcf_file_path, source_start_id, source_end_id)?;
    // 2) 批量插入映射（忽略重复）
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare("INSERT OR IGNORE INTO vcf_batch_numbers (batch_id, number_id) VALUES (?1, ?2)")?;
        for nid in number_ids {
            let _ = stmt.execute(params![batch_id, nid]);
        }
    }
    tx.commit()?;
    Ok(number_ids.len())
}

/// 按映射表列出某批次包含的号码
pub fn list_numbers_for_vcf_batch(conn: &Connection, batch_id: &str, limit: i64, offset: i64) -> SqlResult<ContactNumberList> {
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM vcf_batch_numbers WHERE batch_id = ?1",
        params![batch_id],
        |row| row.get(0),
    )?;
    let mut items: Vec<ContactNumberDto> = Vec::new();
    let sql = "SELECT c.id, c.phone, c.name, c.source_file, c.created_at\
               FROM contact_numbers c\
               JOIN vcf_batch_numbers m ON c.id = m.number_id\
               WHERE m.batch_id = ?1\
               ORDER BY c.id ASC LIMIT ?2 OFFSET ?3";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![batch_id, limit, offset])?;
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

/// 按批次为其包含的号码打上行业标签
pub fn tag_numbers_industry_by_vcf_batch(conn: &Connection, batch_id: &str, industry: &str) -> SqlResult<i64> {
    let affected = conn.execute(
        "UPDATE contact_numbers SET industry = ?1 WHERE id IN (SELECT number_id FROM vcf_batch_numbers WHERE batch_id = ?2)",
        params![industry, batch_id],
    )?;
    Ok(affected as i64)
}
