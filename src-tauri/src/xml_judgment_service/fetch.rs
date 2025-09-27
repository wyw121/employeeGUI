use std::process::Output;
use crate::utils::adb_utils::execute_adb_command;
use crate::services::adb_session_manager::get_device_session;

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
        // 优先使用长连接会话获取（更快、更稳定）
        if let Ok(session) = get_device_session(device_id).await {
            // 1) 首选 /sdcard/ui_dump.xml 路径
            let _ = session.execute_command("rm -f /sdcard/ui_dump.xml").await; // 忽略错误
            if let Ok(xml) = session
                .execute_command("uiautomator dump /sdcard/ui_dump.xml && cat /sdcard/ui_dump.xml")
                .await
            {
                if xml.trim().starts_with("<?xml") || xml.contains("<hierarchy") {
                    tracing::info!("📄(session) XML内容长度: {} chars (sdcard)", xml.len());
                    let _ = session.execute_command("rm -f /sdcard/ui_dump.xml").await;
                    return Ok(xml);
                }
            }

            // 2) 兜底使用 /data/local/tmp/ui.xml（部分设备对 /sdcard 写权限受限）
            let _ = session.execute_command("rm -f /data/local/tmp/ui.xml").await; // 忽略错误
            if let Ok(xml) = session
                .execute_command("uiautomator dump /data/local/tmp/ui.xml && cat /data/local/tmp/ui.xml")
                .await
            {
                if xml.trim().starts_with("<?xml") || xml.contains("<hierarchy") {
                    tracing::info!("📄(session) XML内容长度: {} chars (tmp)", xml.len());
                    let _ = session.execute_command("rm -f /data/local/tmp/ui.xml").await;
                    return Ok(xml);
                }
            }
            tracing::warn!("⚠️ 会话路径获取XML失败，回退到一次性adb路径");
        }

        // 回退到一次性adb命令（旧实现）
        // 1) 首选 dump 到 /sdcard/ui_dump.xml，如果失败则尝试 tmp 路径
        let dump_sdcard = execute_adb_with_result(&["-s", device_id, "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"]).await;
        if dump_sdcard.is_err() {
            let e = dump_sdcard.err().unwrap();
            tracing::error!("❌ uiautomator dump (/sdcard) 失败: {}", e);
            // 直接尝试 tmp 路径
            if let Err(e2) = execute_adb_with_result(&["-s", device_id, "shell", "uiautomator", "dump", "/data/local/tmp/ui.xml"]).await {
                return Err(format!("UI dump 失败: {}; tmp也失败: {}", e, e2));
            } else {
                // 读取 tmp 文件
                let cat_tmp = execute_adb_with_result(&["-s", device_id, "shell", "cat", "/data/local/tmp/ui.xml"]).await?;
                let xml_content = String::from_utf8_lossy(&cat_tmp.stdout);
                tracing::info!("📄 XML内容长度: {} bytes (tmp)", xml_content.len());
                let _ = execute_adb_command(&["-s", device_id, "shell", "rm", "/data/local/tmp/ui.xml"]);
                return Ok(xml_content.to_string());
            }
        }

        // 2) dump 到 sdcard 成功，等待写入并读取；若读取失败则回退到 tmp 路径
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await; // 等待文件写入稳定
        if let Ok(ls_result) = execute_adb_with_result(&["-s", device_id, "shell", "ls", "-la", "/sdcard/ui_dump.xml"]).await {
            tracing::info!("📂 文件状态: {}", String::from_utf8_lossy(&ls_result.stdout));
        }

        match execute_adb_with_result(&["-s", device_id, "shell", "cat", "/sdcard/ui_dump.xml"]).await {
            Ok(cat_result) => {
                let xml_content = String::from_utf8_lossy(&cat_result.stdout);
                tracing::info!("📄 XML内容长度: {} bytes (/sdcard)", xml_content.len());
                let _ = execute_adb_command(&["-s", device_id, "shell", "rm", "/sdcard/ui_dump.xml"]);
                return Ok(xml_content.to_string());
            }
            Err(e_cat) => {
                tracing::warn!("⚠️ 读取 /sdcard/ui_dump.xml 失败: {}，尝试 /data/local/tmp/ui.xml", e_cat);
                // 回退：dump 到 tmp 并读取
                if let Err(e_dump_tmp) = execute_adb_with_result(&["-s", device_id, "shell", "uiautomator", "dump", "/data/local/tmp/ui.xml"]).await {
                    // 尝试直接读取可能存在的 /sdcard/window_dump.xml 作为兜底
                    if let Ok(cat_win) = execute_adb_with_result(&["-s", device_id, "shell", "cat", "/sdcard/window_dump.xml"]).await {
                        let xml_content = String::from_utf8_lossy(&cat_win.stdout);
                        tracing::info!("📄 XML内容长度: {} bytes (window_dump 兜底)", xml_content.len());
                        return Ok(xml_content.to_string());
                    }
                    return Err(format!("读取XML失败: sdcard cat失败且 tmp dump 失败: {}", e_dump_tmp));
                }
                let cat_tmp = execute_adb_with_result(&["-s", device_id, "shell", "cat", "/data/local/tmp/ui.xml"]).await?;
                let xml_content = String::from_utf8_lossy(&cat_tmp.stdout);
                tracing::info!("📄 XML内容长度: {} bytes (tmp after fallback)", xml_content.len());
                let _ = execute_adb_command(&["-s", device_id, "shell", "rm", "/data/local/tmp/ui.xml"]);
                return Ok(xml_content.to_string());
            }
        }
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
