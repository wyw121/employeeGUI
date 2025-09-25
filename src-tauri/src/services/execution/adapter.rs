//! adapter.rs - 旧 SmartScriptStep -> 新 ExecStep 适配器
//! 设计目标：保持迁移期间低侵入，可渐进替换
//! 后续：当所有上游调用均改用 ExecStep 后，可删除该适配器与旧结构

use serde_json::{json, Value};
use crate::services::execution::model::{SmartScriptStep, SmartActionType};
use crate::services::execution::model::{ExecStep, ExecStepKind, ExecStepMeta, ExecStepId};

/// 将 SmartActionType 映射为通用 ExecStepKind
pub fn map_action_kind(action: &SmartActionType) -> ExecStepKind {
    use SmartActionType::*;
    match action {
        Tap | Input | Wait | Swipe | SmartTap => ExecStepKind::Action,
        SmartFindElement | BatchMatch | ExtractElement => ExecStepKind::Match,
        RecognizePage | VerifyAction | WaitForPageState => ExecStepKind::Match, // 归为匹配/判定类
        SmartNavigation => ExecStepKind::Action,
        LoopStart | LoopEnd => ExecStepKind::ControlFlow,
        ContactGenerateVcf | ContactImportToDevice => ExecStepKind::Action,
    }
}

/// 单个步骤适配
pub fn adapt_step(old: &SmartScriptStep, original_file: Option<&str>, original_line: Option<u32>) -> ExecStep {
    let meta = ExecStepMeta {
        id: ExecStepId::new(old.id.clone()),
        name: old.name.clone(),
        description: if old.description.is_empty() { None } else { Some(old.description.clone()) },
        original_file: original_file.map(|s| s.to_string()),
        original_line,
    };
    let kind = map_action_kind(&old.step_type);

    // 迁移期保留原始参数完整透传
    let raw_params = json!({
        "parameters": old.parameters,
        "enabled": old.enabled,
        "order": old.order,
        "legacy_step_type": format!("{:?}", old.step_type),
    });

    let mut exec = ExecStep::new(meta, kind, raw_params);

    // 匹配类信息抽取（宽松解析，避免 panic）
    if let Some(match_meta) = extract_matching_meta(&old.parameters) {
        if exec.matching_strategy.is_none() { exec.matching_strategy = match_meta.strategy; }
        if exec.selected_fields.is_none() { exec.selected_fields = match_meta.fields; }
        if exec.field_values.is_none() { exec.field_values = match_meta.values; }
    }

    exec
}

struct MatchingMeta {
    strategy: Option<String>,
    fields: Option<Vec<String>>,
    values: Option<Value>,
}

fn extract_matching_meta(params: &Value) -> Option<MatchingMeta> {
    let obj = params.as_object()?;
    let matching = obj.get("matching");
    // 可能是扁平结构： { "strategy": "standard", "fields": [...], "values": {...} }
    let (strategy, fields, values) = if let Some(m) = matching {
        if let Some(mo) = m.as_object() {
            (mo.get("strategy"), mo.get("fields"), mo.get("values"))
        } else { (None, None, None) }
    } else {
        (obj.get("strategy"), obj.get("fields"), obj.get("values"))
    };

    if strategy.is_none() && fields.is_none() && values.is_none() { return None; }

    let strategy_str = strategy.and_then(|s| s.as_str()).map(|s| s.to_string());
    let fields_vec = fields.and_then(|f| f.as_array().map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>()))
        .filter(|v| !v.is_empty());
    let values_clone = values.cloned();

    Some(MatchingMeta { strategy: strategy_str, fields: fields_vec, values: values_clone })
}

/// 批量适配（便于脚本或批量迁移）
pub fn adapt_steps(old_steps: &[SmartScriptStep], original_file: Option<&str>) -> Vec<ExecStep> {
    old_steps.iter().enumerate().map(|(idx, s)| adapt_step(s, original_file, Some(idx as u32 + 1))).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_step(step_type: SmartActionType) -> SmartScriptStep {
        SmartScriptStep {
            id: "s1".into(),
            step_type,
            name: "测试步骤".into(),
            description: "desc".into(),
            parameters: serde_json::json!({"k":"v"}),
            enabled: true,
            order: 1,
        }
    }

    #[test]
    fn test_basic_mapping() {
        let s = make_step(SmartActionType::Tap);
        let e = adapt_step(&s, Some("smart_script_executor.rs"), Some(42));
        assert_eq!(e.meta.name, "测试步骤");
        assert_eq!(matches!(e.kind, ExecStepKind::Action), true);
        assert!(e.meta.original_file.is_some());
        assert_eq!(e.meta.original_line, Some(42));
        assert!(e.matching_strategy.is_none());
    }

    #[test]
    fn test_batch() {
        let list = vec![make_step(SmartActionType::Tap), make_step(SmartActionType::LoopStart)];
        let adapted = adapt_steps(&list, Some("smart_script_executor.rs"));
        assert_eq!(adapted.len(), 2);
        assert!(matches!(adapted[0].kind, ExecStepKind::Action));
        assert!(matches!(adapted[1].kind, ExecStepKind::ControlFlow));
    }

    #[test]
    fn test_matching_extraction() {
        let mut s = make_step(SmartActionType::SmartFindElement);
        s.parameters = serde_json::json!({
            "matching": {
                "strategy": "standard",
                "fields": ["resource_id", "text"],
                "values": {"resource_id": "btn_follow", "text": "关注"}
            }
        });
        let e = adapt_step(&s, None, None);
        assert_eq!(e.matching_strategy.as_deref(), Some("standard"));
        assert!(e.selected_fields.as_ref().unwrap().contains(&"resource_id".to_string()));
        assert!(e.field_values.is_some());
    }
}
