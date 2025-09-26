//! Modularized XML judgment & matching service
//!
//! This module was split from the original monolithic `xml_judgment_service.rs` (~897 lines)
//! into smaller focused submodules. Public API (Tauri commands) is preserved:
//! - get_device_ui_xml
//! - find_xml_ui_elements
//! - wait_for_ui_element
//! - check_device_page_state
//! - match_element_by_criteria
//!
//! Internal structure:
//! - model.rs: data structures (XmlElement, XmlCondition, XmlJudgmentResult, MatchCriteriaDTO etc.)
//! - fetch.rs: device XML acquisition (uiautomator dump + read)
//! - parser.rs: lightweight XML parsing helpers
//! - match_logic.rs: core filtering & matching, select_best_match, hierarchy integration
//! - commands.rs: Tauri command wrappers re-exporting service functions
//!
//! Further improvement TODOs (not breaking API):
//! 1. Replace ad‑hoc parsing with `quick-xml` for robustness.
//! 2. Move hierarchy related helpers behind a trait for testability.
//! 3. Provide caching layer to avoid repeated dumps within short intervals.
//! 4. Add unit tests for regex includes / excludes edge cases.

mod model;
mod fetch;
mod parser;
mod match_logic;
mod commands;
mod queries;

pub use model::*;
pub use fetch::XmlJudgmentService;
pub use commands::*; // Re-export Tauri commands
pub use queries::{find_elements, wait_for_element};
