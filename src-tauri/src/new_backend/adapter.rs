use crate::services::execution::model::SmartScriptStep;
use super::mapping::LegacyStep;

#[allow(dead_code)]
pub fn adapt_legacy_steps(steps: &[SmartScriptStep]) -> Vec<LegacyStep> {
    steps.iter().map(|s| LegacyStep {
        step_type: format!("{:?}", s.step_type).to_lowercase(),
        parameters: s.parameters.clone(),
    }).collect()
}
