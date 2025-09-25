use std::sync::Arc;

use anyhow::Result;

use crate::services::adb_session_manager::get_device_session;
use crate::services::execution::ExecutionEnvironment;

/// `UiBridge` 聚合了与设备 UI 交互相关的公共能力，
/// 例如快照捕获、UI dump 与点击操作的重试封装。
///
/// 该结构体设计为轻量状态容器，可在应用层复用，
/// 避免在 `SmartScriptExecutor` 中重复实现 UI 操作逻辑。
#[derive(Clone)]
pub struct UiBridge {
    device_id: String,
    exec_env: Arc<ExecutionEnvironment>,
}

impl UiBridge {
    pub fn new(device_id: String, exec_env: Arc<ExecutionEnvironment>) -> Self {
        Self { device_id, exec_env }
    }

    pub fn device_id(&self) -> &str {
        &self.device_id
    }

    pub fn execution_environment(&self) -> Arc<ExecutionEnvironment> {
        Arc::clone(&self.exec_env)
    }

    /// 统一获取 UI 快照（XML + 可选截图）。
    /// 当前实现：委托给 `ExecutionEnvironment::capture_snapshot`。
    pub async fn capture_snapshot(&self) -> anyhow::Result<Option<String>> {
        let snapshot = self.exec_env.capture_snapshot().await?;
        Ok(snapshot.raw_xml)
    }

    /// 带重试机制的 UI dump 执行。
    /// 首先尝试通过快照提供器获取 XML，失败后回退到传统 dump。
    pub async fn execute_ui_dump_with_retry(&self, logs: &mut Vec<String>) -> Result<String> {
        logs.push("📱 开始获取设备UI结构（优先使用快照提供器）...".to_string());

        match self.capture_snapshot().await {
            Ok(Some(xml)) if !xml.is_empty() => {
                logs.push(format!("✅ 快照获取成功（snapshot_provider），长度: {} 字符", xml.len()));
                return Ok(xml);
            }
            Ok(Some(_)) | Ok(None) => {
                logs.push("⚠️ 快照结果为空或无XML，回退旧 UI dump 逻辑".to_string());
            }
            Err(e) => {
                logs.push(format!("⚠️ 快照捕获失败: {}，回退旧 UI dump 逻辑", e));
            }
        }

        let device_id = self.device_id.clone();
        let result = self
            .exec_env
            .run_with_retry(move |attempt| {
                let device_id = device_id.clone();
                async move {
                    if attempt > 0 {
                        if let Ok(session) = get_device_session(&device_id).await {
                            let _ = session.execute_command("rm -f /sdcard/ui_dump.xml").await;
                        }
                    }

                    let session = get_device_session(&device_id).await?;
                    let dump = session
                        .execute_command(
                            "uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml",
                        )
                        .await?;

                    if dump.is_empty()
                        || dump.contains("ERROR:")
                        || dump.contains("null root node")
                    {
                        Err(anyhow::anyhow!("UI dump 内容异常"))
                    } else {
                        Ok(dump)
                    }
                }
            })
            .await;

        match result {
            Ok(dump) => {
                logs.push(format!("✅ UI结构获取成功（回退路径），长度: {} 字符", dump.len()));
                Ok(dump)
            }
            Err(e) => {
                logs.push(format!("❌ UI结构获取失败: {}", e));
                Err(e)
            }
        }
    }

    /// 带重试机制的点击执行。
    pub async fn execute_click_with_retry(
        &self,
        x: i32,
        y: i32,
        logs: &mut Vec<String>,
    ) -> Result<String> {
        logs.push("👆 开始执行点击操作（带重试机制）...".to_string());

        let max_retries = 2;
        let mut last_error: Option<anyhow::Error> = None;

        for attempt in 1..=max_retries {
            if attempt > 1 {
                logs.push(format!("🔄 重试点击操作 - 第 {}/{} 次尝试", attempt, max_retries));
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            }

            match self.try_click_xy(x, y).await {
                Ok(output) => {
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                    logs.push("⏱️  点击后延迟200ms完成".to_string());
                    return Ok(output);
                }
                Err(e) => {
                    logs.push(format!("❌ 点击失败: {} (尝试 {}/{})", e, attempt, max_retries));
                    last_error = Some(e);
                }
            }
        }

        logs.push(format!("❌ 点击操作最终失败，已重试 {} 次", max_retries));
        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("点击操作失败")))
    }

    async fn try_click_xy(&self, x: i32, y: i32) -> Result<String> {
        let session = get_device_session(&self.device_id).await?;
        session.tap(x, y).await?;
        Ok("OK".to_string())
    }
}
