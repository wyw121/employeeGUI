//! step.rs - 执行步骤领域模型骨架
//! 目标：承载后续从 smart_script_executor 拆出的动作/控制流/匹配等语义化步骤定义

use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ExecStepKind {
    Action,
    ControlFlow,
    Match,
    Utility,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecStepId(pub String);

impl ExecStepId {
    pub fn new<S: Into<String>>(s: S) -> Self { Self(s.into()) }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecStepMeta {
    pub id: ExecStepId,
    pub name: String,
    pub description: Option<String>,
    pub original_file: Option<String>,
    pub original_line: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecStep {
    pub meta: ExecStepMeta,
    pub kind: ExecStepKind,
    /// 原始 JSON 参数（迁移期间保持宽松，后续再结构化）
    pub raw_params: serde_json::Value,
}

impl ExecStep {
    pub fn new(meta: ExecStepMeta, kind: ExecStepKind, raw_params: serde_json::Value) -> Self {
        Self { meta, kind, raw_params }
    }
}
