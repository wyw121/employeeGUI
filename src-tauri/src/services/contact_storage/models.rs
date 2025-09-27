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

// ----- 批次与导入追踪模型 -----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VcfBatchDto {
    pub batch_id: String,
    pub created_at: String,
    pub vcf_file_path: String,
    pub source_start_id: Option<i64>,
    pub source_end_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VcfBatchList {
    pub total: i64,
    pub items: Vec<VcfBatchDto>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportSessionDto {
    pub id: i64,
    pub batch_id: String,
    pub device_id: String,
    pub status: String, // pending/success/failed
    pub imported_count: i64,
    pub failed_count: i64,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportSessionList {
    pub total: i64,
    pub items: Vec<ImportSessionDto>,
}
