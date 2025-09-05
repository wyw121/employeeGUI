use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContactDocument {
    pub id: String,
    pub filename: String,
    pub filepath: String,
    pub upload_time: String,
    pub total_contacts: usize,
    pub processed_contacts: usize,
    pub status: String,
    pub format: String,
    pub contacts: Vec<Contact>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResult {
    pub success: bool,
    pub document: Option<ContactDocument>,
    pub error: Option<String>,
}

/// 解析联系人文件
#[command]
pub async fn parse_contact_file(file_name: String, content: String) -> Result<ParseResult, String> {
    println!("正在解析联系人文件: {}", file_name);

    // 检查文件内容是否为空
    if content.trim().is_empty() {
        return Ok(ParseResult {
            success: false,
            document: None,
            error: Some("文件内容为空".to_string()),
        });
    }

    // 解析文件内容
    let contacts = match parse_contacts_from_text(&content) {
        Ok(contacts) => contacts,
        Err(e) => {
            return Ok(ParseResult {
                success: false,
                document: None,
                error: Some(e),
            });
        }
    };

    // 创建文档对象
    let document = ContactDocument {
        id: uuid::Uuid::new_v4().to_string(),
        filename: file_name.clone(),
        filepath: format!("C:\\Documents\\{}", file_name),
        upload_time: chrono::Utc::now().to_rfc3339(),
        total_contacts: contacts.len(),
        processed_contacts: contacts.len(),
        status: "completed".to_string(),
        format: get_file_format(&file_name),
        contacts,
    };

    println!("成功解析 {} 个联系人", document.total_contacts);

    Ok(ParseResult {
        success: true,
        document: Some(document),
        error: None,
    })
}

/// 从文本内容解析联系人
fn parse_contacts_from_text(content: &str) -> Result<Vec<Contact>, String> {
    let mut contacts = Vec::new();

    for (line_no, line) in content.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // 解析每行数据
        let contact = parse_contact_line(line, line_no + 1)?;
        if let Some(contact) = contact {
            contacts.push(contact);
        }
    }

    if contacts.is_empty() {
        return Err("文件中没有找到有效的联系人数据".to_string());
    }

    Ok(contacts)
}

/// 解析单行联系人数据
fn parse_contact_line(line: &str, line_no: usize) -> Result<Option<Contact>, String> {
    // 支持多种分隔符：逗号、管道符、制表符
    let separators = [',', '|', '\t'];
    let mut parts = Vec::new();

    // 尝试不同的分隔符
    for &sep in &separators {
        if line.contains(sep) {
            parts = line.split(sep).map(|s| s.trim()).collect();
            break;
        }
    }

    // 如果没有找到分隔符，尝试空格分隔
    if parts.is_empty() {
        let space_parts: Vec<&str> = line.split_whitespace().collect();
        if !space_parts.is_empty() {
            parts = space_parts;
        }
    }

    if parts.is_empty() {
        return Ok(None);
    }

    let contact_id = uuid::Uuid::new_v4().to_string();

    match parts.len() {
        1 => {
            // 只有一个字段
            let value = parts[0];
            if is_phone_number(value) {
                Ok(Some(Contact {
                    id: contact_id,
                    name: format!("联系人{}", line_no),
                    phone: Some(value.to_string()),
                    email: None,
                    notes: None,
                }))
            } else {
                Ok(Some(Contact {
                    id: contact_id,
                    name: value.to_string(),
                    phone: None,
                    email: None,
                    notes: None,
                }))
            }
        }
        2 => {
            // 两个字段：姓名和电话/邮箱
            let name = parts[0];
            let second_field = parts[1];

            if is_phone_number(second_field) {
                Ok(Some(Contact {
                    id: contact_id,
                    name: name.to_string(),
                    phone: Some(second_field.to_string()),
                    email: None,
                    notes: None,
                }))
            } else if is_email(second_field) {
                Ok(Some(Contact {
                    id: contact_id,
                    name: name.to_string(),
                    phone: None,
                    email: Some(second_field.to_string()),
                    notes: None,
                }))
            } else {
                Ok(Some(Contact {
                    id: contact_id,
                    name: name.to_string(),
                    phone: None,
                    email: None,
                    notes: Some(second_field.to_string()),
                }))
            }
        }
        3 => {
            // 三个字段：姓名、电话、地区/备注
            Ok(Some(Contact {
                id: contact_id,
                name: parts[0].to_string(),
                phone: if is_phone_number(parts[1]) {
                    Some(parts[1].to_string())
                } else {
                    None
                },
                email: None,
                notes: Some(parts[2].to_string()),
            }))
        }
        4 => {
            // 四个字段：姓名、电话、地区、备注/职业
            Ok(Some(Contact {
                id: contact_id,
                name: parts[0].to_string(),
                phone: if is_phone_number(parts[1]) {
                    Some(parts[1].to_string())
                } else {
                    None
                },
                email: None,
                notes: Some(format!("{} - {}", parts[2], parts[3])),
            }))
        }
        5 => {
            // 五个字段：姓名、电话、地区、备注、邮箱
            Ok(Some(Contact {
                id: contact_id,
                name: parts[0].to_string(),
                phone: if is_phone_number(parts[1]) {
                    Some(parts[1].to_string())
                } else {
                    None
                },
                email: if is_email(parts[4]) {
                    Some(parts[4].to_string())
                } else {
                    None
                },
                notes: Some(format!("{} - {}", parts[2], parts[3])),
            }))
        }
        _ => {
            // 更多字段，将额外字段作为备注
            let notes = parts[2..].join(" ");
            Ok(Some(Contact {
                id: contact_id,
                name: parts[0].to_string(),
                phone: if is_phone_number(parts[1]) {
                    Some(parts[1].to_string())
                } else {
                    None
                },
                email: None,
                notes: Some(notes),
            }))
        }
    }
}

/// 判断是否为手机号码
fn is_phone_number(text: &str) -> bool {
    // 简单的手机号码验证：11位数字，以1开头
    text.len() == 11 && text.starts_with('1') && text.chars().all(|c| c.is_ascii_digit())
}

/// 判断是否为邮箱地址
fn is_email(text: &str) -> bool {
    text.contains('@') && text.contains('.')
}

/// 获取联系人文件信息（不解析内容）
#[command]
pub async fn get_contact_file_info(file_path: String) -> Result<serde_json::Value, String> {
    if !Path::new(&file_path).exists() {
        return Err("文件不存在".to_string());
    }

    let filename = Path::new(&file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown")
        .to_string();

    let file_size = fs::metadata(&file_path)
        .map_err(|e| format!("获取文件信息失败: {}", e))?
        .len();

    Ok(serde_json::json!({
        "filename": filename,
        "filepath": file_path,
        "size": file_size,
        "exists": true
    }))
}

/// 根据文件名获取文件格式
fn get_file_format(filename: &str) -> String {
    let ext = filename.split('.').last().unwrap_or("txt").to_lowercase();
    match ext.as_str() {
        "csv" => "csv".to_string(),
        "txt" => "txt".to_string(),
        "xlsx" | "xls" => "excel".to_string(),
        "vcf" => "vcf".to_string(),
        "json" => "json".to_string(),
        _ => "txt".to_string(),
    }
}
