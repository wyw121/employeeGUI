pub mod models;
pub mod parser;
pub mod repo;
pub mod commands;

pub use commands::{
    import_contact_numbers_from_file,
    import_contact_numbers_from_folder,
    list_contact_numbers,
    fetch_contact_numbers,
    fetch_contact_numbers_by_id_range,
    fetch_contact_numbers_by_id_range_unconsumed,
    mark_contact_numbers_used_by_id_range,
    // 新增的批次和导入会话相关函数
    create_vcf_batch_record,
    list_vcf_batch_records,
    get_vcf_batch_record,
    create_import_session_record,
    finish_import_session_record,
    list_import_session_records,
    list_numbers_by_vcf_batch,
    list_numbers_without_vcf_batch,
};
