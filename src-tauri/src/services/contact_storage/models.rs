use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportNumbersResult {
    pub success: bool,
    pub total_files: i64,
    pub total_numbers: i64,
    pub inserted: i64,
    pub duplicates: i64,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContactNumberDto {
    pub id: i64,
    pub phone: String,
    pub name: String,
    pub source_file: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContactNumberList {
    pub total: i64,
    pub items: Vec<ContactNumberDto>,
}
