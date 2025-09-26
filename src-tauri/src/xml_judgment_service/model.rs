use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct XmlElement {
    pub tag: String,
    pub attributes: HashMap<String, String>,
    pub text: Option<String>,
    pub children: Vec<XmlElement>,
    pub bounds: Option<(i32, i32, i32, i32)>, // (left, top, right, bottom)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct XmlCondition {
    pub condition_type: String, // "exists", "text_contains", "attribute_equals", etc.
    pub selector: String,       // simplified selector / field value
    pub value: Option<String>,  // Expected value for comparison
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct XmlJudgmentResult {
    pub success: bool,
    pub matched: bool,
    pub elements: Vec<XmlElement>,
    pub error: Option<String>,
}

// -------- Matching DTOs (script binding) --------
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchCriteriaDTO {
    pub strategy: String,           // 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard' | 'smart_hierarchy'
    pub fields: Vec<String>,        // selected fields
    pub values: HashMap<String, String>, // field -> value
    #[serde(default)]
    pub excludes: HashMap<String, Vec<String>>, // field -> forbidden tokens
    #[serde(default)]
    pub includes: HashMap<String, Vec<String>>, // field -> required tokens
    #[serde(default)]
    pub match_mode: HashMap<String, String>, // field -> equals|contains|regex
    #[serde(default)]
    pub regex_includes: HashMap<String, Vec<String>>,
    #[serde(default)]
    pub regex_excludes: HashMap<String, Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MatchPreviewDTO {
    pub text: Option<String>,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
    pub package: Option<String>,
    pub bounds: Option<String>,
    pub xpath: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchResultDTO {
    pub ok: bool,
    pub message: String,
    pub total: Option<usize>,
    pub matchedIndex: Option<usize>,
    pub preview: Option<MatchPreviewDTO>,
}
