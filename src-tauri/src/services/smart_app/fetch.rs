use anyhow::Result;
use crate::services::adb_session_manager::get_device_session;
use crate::services::smart_app_manager::AppInfo;

/// List all packages via single command
pub async fn list_packages(device_id: &str) -> Result<Vec<String>> {
    let session = get_device_session(device_id).await?;
    let output = session.execute_command("pm list packages").await?;
    let mut result = Vec::new();
    for line in output.lines() {
        if let Some(pkg) = line.strip_prefix("package:") {
            result.push(pkg.to_string());
        }
    }
    Ok(result)
}

/// Try retrieving AppInfo details for a package with best-effort parsing.
pub async fn fetch_app_info(device_id: &str, package_name: &str) -> Result<AppInfo> {
    let session = get_device_session(device_id).await?;
    let info_output = session
        .execute_command(&format!("dumpsys package {}", package_name))
        .await?;

    let mut app_name = package_name.to_string();
    let mut version_name = None;
    let mut version_code = None;
    let mut main_activity = None;
    let mut is_system_app = false;
    let mut is_enabled = true;

    for raw in info_output.lines() {
        let line = raw.trim();
        if let Some(v) = line.strip_prefix("versionName=") {
            version_name = Some(v.to_string());
        } else if let Some(v) = line.strip_prefix("versionCode=") {
            version_code = Some(v.to_string());
        } else if line.contains("android.intent.action.MAIN") {
            // naive fallback main activity naming will be used later
            // Some ROMs don't expose cleanly here
        } else if line.contains("system=true") {
            is_system_app = true;
        } else if line.contains("enabled=false") {
            is_enabled = false;
        } else if let Some(v) = line.strip_prefix("enabled=") {
            // enabled=true/false
            is_enabled = !v.contains("false");
        }
    }

    // Best-effort: try to locate an activity name belonging to this package
    if main_activity.is_none() {
        if let Some(act) = guess_main_activity(&info_output, package_name) {
            main_activity = Some(act);
        } else {
            main_activity = Some(format!("{}.MainActivity", package_name));
        }
    }

    // Try get better label without shell pipes: find 'application-label:' pattern if present
    if let Some(label) = extract_label_from_dumpsys(&info_output) {
        app_name = label;
    } else {
        app_name = generate_friendly_name(package_name);
    }

    Ok(AppInfo {
        package_name: package_name.to_string(),
        app_name,
        version_name,
        version_code,
        is_system_app,
        is_enabled,
        main_activity,
        icon_path: None,
    })
}

fn extract_label_from_dumpsys(output: &str) -> Option<String> {
    // Some ROMs expose: application-label:'微信' or application-label-zh-CN:'微信'
    for line in output.lines() {
        let line = line.trim();
        if let Some(idx) = line.find("application-label:") {
            let rest = &line[idx + "application-label:".len()..].trim();
            return trim_label_quotes(rest);
        }
        if let Some(idx) = line.find("application-label-") {
            let rest = &line[idx..];
            if let Some(pos) = rest.find(":") {
                return trim_label_quotes(&rest[pos + 1..].trim());
            }
        }
    }
    None
}

fn trim_label_quotes(s: &str) -> Option<String> {
    let s = s.trim();
    if s.starts_with('\'') && s.ends_with('\'') && s.len() >= 2 {
        return Some(s[1..s.len() - 1].to_string());
    }
    if !s.is_empty() { Some(s.to_string()) } else { None }
}

fn generate_friendly_name(package_name: &str) -> String {
    // Simple mapping for common apps
    match package_name {
        "com.xingin.xhs" => "小红书".to_string(),
        "com.tencent.mm" => "微信".to_string(),
        "com.tencent.mobileqq" => "QQ".to_string(),
        "com.taobao.taobao" => "淘宝".to_string(),
        "com.jingdong.app.mall" => "京东".to_string(),
        "com.ss.android.ugc.aweme" => "抖音".to_string(),
        "com.smile.gifmaker" => "快手".to_string(),
        "tv.danmaku.bili" => "哔哩哔哩".to_string(),
        _ => {
            let parts: Vec<&str> = package_name.split('.').collect();
            if parts.len() >= 2 {
                parts.last().unwrap_or(&parts[parts.len() - 2]).to_string()
            } else {
                package_name.to_string()
            }
        }
    }
}

fn guess_main_activity(dumpsys_output: &str, package: &str) -> Option<String> {
    // Very heuristic: search lines containing package and Activity
    for line in dumpsys_output.lines() {
        let l = line.trim();
        if l.contains(package) && (l.contains("Activity") || l.contains(".ui.")) {
            // Extract last token that looks like Activity
            let tokens: Vec<&str> = l.split_whitespace().collect();
            for t in tokens.into_iter().rev() {
                if t.contains(package) && t.contains(".") {
                    return Some(t.trim_matches(|c| c == ',' || c == ';').to_string());
                }
            }
        }
    }
    None
}
