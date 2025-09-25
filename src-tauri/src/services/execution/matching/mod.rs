//! matching/mod.rs - 智能脚本匹配协作模块聚合

mod unified;
mod legacy_regex;
pub mod enhanced_unified;
mod strategies;
mod xml_parser;
pub mod hierarchy_matcher; // 🆕 增强层级匹配器

pub use unified::{run_unified_match, LegacyUiActions};
pub use enhanced_unified::run_enhanced_unified_match;
pub use hierarchy_matcher::{HierarchyMatcher, HierarchyMatchConfig}; // 🆕 导出层级匹配器
pub use legacy_regex::{
    run_traditional_find,
    find_element_in_ui,
    find_all_follow_buttons,
    extract_bounds_from_line,
};
pub use xml_parser::{XmlUiParser, XmlElement};

// 导出策略处理器相关类型
pub use strategies::{
    create_strategy_processor,
    extract_matching_context,
    MatchingContext,
    StrategyResult,
    ProcessingError,
};
