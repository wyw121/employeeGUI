mod basic;
mod smart;

use anyhow::Result;

use crate::services::contact::{run_generate_vcf_step, run_import_contacts_step};
use crate::services::execution::model::{SmartActionType, SmartScriptStep};
use crate::services::smart_script_executor::SmartScriptExecutor;
use crate::infra::adb::keyevent_helper::{keyevent_code_injector_first, keyevent_symbolic_injector_first};

pub struct SmartActionDispatcher<'a> {
    executor: &'a SmartScriptExecutor,
}

impl<'a> SmartActionDispatcher<'a> {
    pub fn new(executor: &'a SmartScriptExecutor) -> Self {
        Self { executor }
    }

    pub async fn execute(&self, step: &SmartScriptStep, logs: &mut Vec<String>) -> Result<String> {
        match step.step_type {
            SmartActionType::Tap => basic::handle_tap(self.executor, step, logs).await,
            SmartActionType::Wait => basic::handle_wait(step, logs).await,
            SmartActionType::Input => basic::handle_input(self.executor, step, logs).await,
            SmartActionType::Swipe => basic::handle_swipe(self.executor, step, logs).await,
            SmartActionType::SmartTap => smart::handle_smart_tap(self.executor, step, logs).await,
            SmartActionType::SmartFindElement => smart::handle_unified_match(self.executor, step, logs).await,
            SmartActionType::BatchMatch => smart::handle_batch_match(self.executor, step, logs).await,
            SmartActionType::RecognizePage => smart::handle_recognize_page(self.executor, step, logs).await,
            SmartActionType::VerifyAction => {
                logs.push("✅ 验证操作".to_string());
                Ok("验证操作模拟".to_string())
            }
            SmartActionType::WaitForPageState => {
                logs.push("⏳ 等待页面状态".to_string());
                Ok("等待页面状态模拟".to_string())
            }
            SmartActionType::ExtractElement => {
                logs.push("🧵 提取元素".to_string());
                Ok("提取元素模拟".to_string())
            }
            SmartActionType::SmartNavigation => {
                logs.push("🧭 智能导航".to_string());
                Ok("智能导航模拟".to_string())
            }
            SmartActionType::LoopStart => {
                logs.push("🔄 循环开始标记".to_string());
                Ok("循环开始已标记".to_string())
            }
            SmartActionType::LoopEnd => {
                logs.push("🏁 循环结束标记".to_string());
                Ok("循环结束已标记".to_string())
            }
            SmartActionType::ContactGenerateVcf => run_generate_vcf_step(step, logs).await,
            SmartActionType::ContactImportToDevice => run_import_contacts_step(step, logs).await,
            SmartActionType::KeyEvent => {
                // 期望参数形态：{ code?: number, symbolic?: string }
                let params = &step.parameters;
                let device_id = &self.executor.device_id;
                if let Some(code) = params.get("code").and_then(|v| v.as_i64()) {
                    keyevent_code_injector_first(&self.executor.adb_path, device_id, code as i32).await?;
                    logs.push(format!("🔑 发送系统按键（数值）: {}", code));
                    Ok(format!("KeyEvent {} 已发送", code))
                } else if let Some(sym) = params.get("symbolic").and_then(|v| v.as_str()) {
                    keyevent_symbolic_injector_first(&self.executor.adb_path, device_id, sym).await?;
                    logs.push(format!("🔑 发送系统按键（符号）: {}", sym));
                    Ok(format!("KeyEvent {} 已发送", sym))
                } else {
                    anyhow::bail!("KeyEvent 缺少 code 或 symbolic 参数")
                }
            }
        }
    }
}
