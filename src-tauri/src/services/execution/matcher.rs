//! matcher.rs - 初版 MatcherService 草案
//! 根据 ExecStep 的 matching_strategy 路由到对应匹配实现（后续再细化策略/缓存/索引）

use crate::services::execution::model::ExecStep;
use anyhow::Result;
use tracing::{info, warn};

// 未来真实依赖（当前保留注释避免循环 / 编译失败）
// use crate::services::smart_element_finder_service::smart_element_finder;

#[derive(Debug, Clone)]
pub struct MatchResult {
    pub success: bool,
    pub matched_count: usize,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Default, Clone)]
pub struct MatcherService;

impl MatcherService {
    pub fn new() -> Self { Self }

    pub async fn match_step(&self, step: &ExecStep) -> Result<MatchResult> {
        let strategy = step.matching_strategy.as_deref().unwrap_or("standard");
        match strategy {
            "absolute" => self.match_absolute(step).await,
            "strict" => self.match_standard_like(step).await,
            "relaxed" => self.match_standard_like(step).await,
            "positionless" => self.match_standard_like(step).await,
            "standard" => self.match_standard_like(step).await,
            other => {
                // 未知策略回退
                self.match_standard_like(step).await.map(|mut r| { r.details.get_or_insert(serde_json::json!({"fallback": other})); r })
            }
        }
    }

    async fn match_absolute(&self, step: &ExecStep) -> Result<MatchResult> {
        // 占位：未来使用 bounds/index 等位置信息
        Ok(MatchResult { success: true, matched_count: 1, details: Some(serde_json::json!({"strategy":"absolute"})) })
    }

    async fn match_standard_like(&self, step: &ExecStep) -> Result<MatchResult> {
        // (1) 先做本地占位（返回字段数量）
        let fields = step.selected_fields.clone().unwrap_or_default();

        // (2) 预留真实 finder 调用逻辑（示例伪代码）
        // if let Some(device_id) = &step.device_id { // TODO: ExecStep 增加 device_id 或通过 ExecutionContext 注入
        //     match smart_element_finder(device_id, criteria_json).await { ... }
        // }

        // (3) 基本返回 & 结构化 details
        Ok(MatchResult {
            success: true,
            matched_count: fields.len().max(1),
            details: Some(serde_json::json!({
                "strategy": step.matching_strategy,
                "fields": fields,
                "source": "placeholder-local",
            }))
        })
    }
}
