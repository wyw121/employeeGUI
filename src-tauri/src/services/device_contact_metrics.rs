use tauri::command;
use tracing::{info, warn};

use crate::utils::adb_utils::execute_adb_command;

/// 执行 adb content query 并统计返回的行数（以 "Row " 开头的行）
fn count_rows_from_output(output: &str) -> i32 {
    output
        .lines()
        .filter(|line| line.trim_start().starts_with("Row "))
        .count() as i32
}

/// 尝试通过不同 URI 获取联系人数量
async fn try_query_contact_count(device_id: &str) -> Result<i32, String> {
    // 方案1：ContactsContract.Contacts 可见联系人
    let args1 = [
        "-s",
        device_id,
        "shell",
        "content",
        "query",
        "--uri",
        "content://com.android.contacts/contacts",
        "--projection",
        "_id",
    ];

    match execute_adb_command(&args1) {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let count = count_rows_from_output(&stdout);
                // 某些设备可能返回空，但命令成功；继续尝试 raw_contacts
                if count > 0 {
                    return Ok(count);
                }
            }
        }
        Err(e) => {
            warn!("Contacts query failed: {}", e);
        }
    }

    // 方案2：raw_contacts（过滤 deleted=0）
    let args2 = [
        "-s",
        device_id,
        "shell",
        "content",
        "query",
        "--uri",
        "content://com.android.contacts/raw_contacts",
        "--projection",
        "_id,deleted",
        "--where",
        "deleted=0",
    ];

    match execute_adb_command(&args2) {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let mut count = count_rows_from_output(&stdout);
                // 某些 ROM 仍会把 header 行或无关行算进去；这里保底非负
                if count < 0 { count = 0; }
                return Ok(count);
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("content query 失败: {}", stderr));
            }
        }
        Err(e) => Err(format!("执行ADB命令失败: {}", e)),
    }
}

/// 获取设备内联系人数量
#[command]
pub async fn get_device_contact_count(device_id: String) -> Result<i32, String> {
    info!("📇 查询设备联系人数量: {}", device_id);
    match try_query_contact_count(&device_id).await {
        Ok(count) => Ok(count),
        Err(e) => Err(e),
    }
}
