//! XML Judgment module (renamed from xml_judgment_service to avoid file/dir clash)
//! Mirrors the previous modularized layout.

pub mod model;
pub mod fetch;
pub mod parser;
pub mod match_logic;
pub mod commands;

pub use model::*;
pub use fetch::XmlJudgmentService;
pub use commands::*; // Tauri commands re-export