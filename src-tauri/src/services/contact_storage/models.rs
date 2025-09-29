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
    // 可选的业务元数据（可能为NULL）
    pub industry: Option<String>,
    pub used: Option<i64>,
    pub used_at: Option<String>,
    pub used_batch: Option<String>,
    pub status: Option<String>,
    pub imported_device_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContactNumberList {
    pub total: i64,
    pub items: Vec<ContactNumberDto>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndustryCountDto {
    pub industry: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContactNumberStatsDto {
    pub total: i64,
    pub unclassified: i64,
    pub not_imported: i64,
    pub per_industry: Vec<IndustryCountDto>,
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
    pub industry: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportSessionList {
    pub total: i64,
    pub items: Vec<ImportSessionDto>,
}

// 每次导入事件（会话维度的时间序列）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportSessionEventDto {
    pub id: i64,
    pub session_id: i64,
    pub occurred_at: String,
    pub device_id: Option<String>,
    pub status: Option<String>,
    pub imported_count: Option<i64>,
    pub failed_count: Option<i64>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportSessionEventList {
    pub total: i64,
    pub items: Vec<ImportSessionEventDto>,
}

// 分配结果（为设备分配一批号码并生成对应的 VCF 批次与待导入会话）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AllocationResultDto {
    pub device_id: String,
    pub batch_id: String,
    pub vcf_file_path: String,
    pub number_count: i64,
    pub number_ids: Vec<i64>,
    pub session_id: i64, // 新建的 pending 会话ID
}
