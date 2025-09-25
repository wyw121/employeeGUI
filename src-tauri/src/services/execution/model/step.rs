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
    /// 匹配策略（仅 kind = Match 时有效；来源于旧 parameters.matching.strategy 或推断）
    pub matching_strategy: Option<String>,
    /// 已选字段（标准匹配相关，可为空）
    pub selected_fields: Option<Vec<String>>,
    /// 字段值映射（未来可结构化; 当前透传）
    pub field_values: Option<serde_json::Value>,
    /// 设备标识（用于匹配/执行上下文路由；迁移期可选）
    pub device_id: Option<String>,
}

impl ExecStep {
    pub fn new(meta: ExecStepMeta, kind: ExecStepKind, raw_params: serde_json::Value) -> Self {
        Self { meta, kind, raw_params, matching_strategy: None, selected_fields: None, field_values: None, device_id: None }
    }
}
