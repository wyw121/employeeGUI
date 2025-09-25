//! contact/mod.rs - 联系人自动化适配层聚合

mod automation_adapter;

pub use automation_adapter::{
    run_generate_vcf_step,
    run_import_contacts_step,
};
