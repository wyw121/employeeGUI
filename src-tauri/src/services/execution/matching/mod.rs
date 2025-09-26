//! matching/mod.rs - 智能脚本匹配协作模块聚合

pub mod enhanced_unified;
mod hierarchy_matcher;
mod legacy_regex;
mod strategies;
mod unified;
mod xml_parser;

pub use enhanced_unified::run_enhanced_unified_match;
pub use legacy_regex::{
    extract_bounds_from_line, find_all_follow_buttons, find_element_in_ui, run_traditional_find,
};
pub use unified::{run_unified_match, LegacyUiActions};
pub use xml_parser::{XmlElement, XmlUiParser};

// 导出策略处理器相关类型
pub use strategies::{
    create_strategy_processor, extract_matching_context, MatchingContext, ProcessingError,
    StrategyResult,
};

// 导出层级匹配器
pub use hierarchy_matcher::{HierarchyMatchConfig, HierarchyMatcher};
