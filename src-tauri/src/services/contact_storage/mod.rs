pub mod models;
pub mod parser;
pub mod repo;
pub mod commands;

pub use commands::{
    import_contact_numbers_from_file,
    import_contact_numbers_from_folder,
    list_contact_numbers,
    fetch_contact_numbers,
    fetch_unclassified_contact_numbers,
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
    // 统计与行业设置
    get_contact_number_stats_cmd,
    set_contact_numbers_industry_by_id_range,
    // VCF批次会话映射相关
    create_vcf_batch_with_numbers_cmd,
    list_numbers_for_vcf_batch_cmd,
    tag_numbers_industry_by_vcf_batch_cmd,
};
