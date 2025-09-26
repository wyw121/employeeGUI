use std::process::Output;
use crate::utils::adb_utils::execute_adb_command;

/// Service providing device XML acquisition & simple high-level queries.
pub struct XmlJudgmentService;

// Wrapper that normalizes adb execution result
async fn execute_adb_with_result(args: &[&str]) -> Result<Output, String> {
    match execute_adb_command(args) {
        Ok(output) => {
            if output.status.success() { Ok(output) } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("ADB命令执行失败: {}", stderr))
            }
        }
        Err(e) => Err(format!("ADB命令执行错误: {}", e))
    }
}

impl XmlJudgmentService {
    /// Dump & fetch current UI XML from device.
    pub async fn get_ui_xml(device_id: &str) -> Result<String, String> {
        if let Err(e) = execute_adb_with_result(&["-s", device_id, "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"]).await {
            tracing::error!("❌ uiautomator dump 失败: {}", e);
            return Err(format!("UI dump 失败: {}", e));
        }
        // wait a bit for file write
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        if let Ok(ls_result) = execute_adb_with_result(&["-s", device_id, "shell", "ls", "-la", "/sdcard/ui_dump.xml"]).await {
            tracing::info!("📂 文件状态: {}", String::from_utf8_lossy(&ls_result.stdout));
        }

        let cat_result = execute_adb_with_result(&["-s", device_id, "shell", "cat", "/sdcard/ui_dump.xml"]).await?;
        let xml_content = String::from_utf8_lossy(&cat_result.stdout);
        tracing::info!("📄 XML内容长度: {} bytes", xml_content.len());
        let _ = execute_adb_command(&["-s", device_id, "shell", "rm", "/sdcard/ui_dump.xml"]);
        Ok(xml_content.to_string())
    }

    /// Simple page indicator check (all indicators must be contained).
    pub async fn check_page_state(device_id: &str, expected_indicators: &[&str]) -> Result<bool, String> {
        let xml_content = Self::get_ui_xml(device_id).await?;
        for indicator in expected_indicators {
            if !xml_content.contains(indicator) { return Ok(false); }
        }
        Ok(true)
    }

}
