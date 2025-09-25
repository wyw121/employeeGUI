//! matching/mod.rs - 智能脚本匹配协作模块聚合

mod unified;
mod legacy_regex;

pub use unified::{run_unified_match, LegacyUiActions};
pub use legacy_regex::{
    run_traditional_find,
    find_element_in_ui,
    find_all_follow_buttons,
    extract_bounds_from_line,
};
