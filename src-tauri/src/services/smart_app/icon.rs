use anyhow::{anyhow, Result};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use zip::ZipArchive;

use crate::utils::adb_utils::get_adb_path;

/// Pull the APK of a package to a temp file on host and return the path
pub fn pull_apk_to_temp(device_id: &str, package_name: &str) -> Result<PathBuf> {
    // Get apk path on device
    let adb = get_adb_path();
    let output = Command::new(&adb)
        .args(["-s", device_id, "shell", "pm", "path", package_name])
        .output()?;
    let out = String::from_utf8_lossy(&output.stdout);
    let apk_path = out
        .lines()
        .find_map(|l| l.strip_prefix("package:"))
        .ok_or_else(|| anyhow!("Failed to get apk path for {}", package_name))?;

    let mut host_path = std::env::temp_dir();
    host_path.push(format!("{}_icon_extract.apk", package_name.replace('.', "_")));

    // Pull
    let status = Command::new(&adb)
        .args(["-s", device_id, "pull", apk_path, host_path.to_string_lossy().as_ref()])
        .status()?;
    if !status.success() { return Err(anyhow!("adb pull failed")); }

    Ok(host_path)
}

/// Try to extract best icon bytes from APK by scanning zip entries
pub fn extract_icon_from_apk(apk_path: &Path) -> Result<Vec<u8>> {
    let file = File::open(apk_path)?;
    let mut zip = ZipArchive::new(file)?;

    // 1) 尝试通过 AndroidManifest.xml 精准解析 @mipmap/@drawable 名称
    if let Some(bytes) = try_extract_icon_via_manifest(&mut zip)? {
        return Ok(bytes);
    }

    // 2) 回退：启发式扫描 ic_launcher* 最优密度
    let mut best_score = -1i32;
    let mut best_bytes: Option<Vec<u8>> = None;

    for i in 0..zip.len() {
        let mut file = zip.by_index(i)?;
        let name = file.name().to_string();
        let lname = name.to_lowercase();

        if (lname.contains("res/mipmap") || lname.contains("res/drawable"))
            && lname.contains("ic_launcher")
            && (lname.ends_with(".png") || lname.ends_with(".webp"))
        {
            let score = icon_score(&lname);
            if score > best_score {
                let mut buf = Vec::with_capacity(file.size() as usize);
                let _ = std::io::copy(&mut file, &mut buf)?;
                best_score = score;
                best_bytes = Some(buf);
            }
        }
    }

    best_bytes.ok_or_else(|| anyhow!("No icon candidate found"))
}

/// 从 AndroidManifest.xml 中提取 android:icon 引用并按名称挑选最佳图标
fn try_extract_icon_via_manifest<R: Read + std::io::Seek>(zip: &mut ZipArchive<R>) -> Result<Option<Vec<u8>>> {
    // 定位 Manifest
    let data = {
        let mut manifest = match zip.by_name("AndroidManifest.xml") {
            Ok(f) => f,
            Err(_) => return Ok(None),
        };
        let mut data = Vec::with_capacity(manifest.size() as usize);
        std::io::copy(&mut manifest, &mut data)?;
        data
    }; // manifest 在这里被释放

    // 在二进制 AXML 中搜索可见字符串：@mipmap/ 或 @drawable/
    // 虽非标准解析，但在大量 APK 中可行；解析失败时回退
    if let Some(icon_name) = find_icon_resource_name(&data) {
        // 基于名称在 res/mipmap* 与 res/drawable* 中挑选最佳密度
        if let Some(bytes) = extract_icon_by_name(zip, &icon_name)? {
            return Ok(Some(bytes));
        }
    }
    Ok(None)
}

fn find_icon_resource_name(axml_bytes: &[u8]) -> Option<String> {
    let pats: [&[u8]; 2] = [b"@mipmap/", b"@drawable/"];
    for pat in pats.iter() {
        if let Some(pos) = find_bytes(axml_bytes, pat) {
            let start = pos + pat.len();
            // 读取合法资源名 [a-zA-Z0-9_.-]
            let mut end = start;
            while end < axml_bytes.len() {
                let c = axml_bytes[end] as char;
                if c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-' { end += 1; } else { break; }
            }
            if end > start {
                let name = String::from_utf8_lossy(&axml_bytes[start..end]).to_string();
                return Some(name);
            }
        }
    }
    None
}

fn find_bytes(hay: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() { return Some(0); }
    hay.windows(needle.len()).position(|w| w == needle)
}

fn extract_icon_by_name<R: Read + std::io::Seek>(zip: &mut ZipArchive<R>, icon_name: &str) -> Result<Option<Vec<u8>>> {
    let mut best_score = -1i32;
    let mut best_bytes: Option<Vec<u8>> = None;
    let needle_png = format!("{}.png", icon_name.to_lowercase());
    let needle_webp = format!("{}.webp", icon_name.to_lowercase());
    for i in 0..zip.len() {
        let mut file = zip.by_index(i)?;
        let name = file.name().to_string();
        let lname = name.to_lowercase();
        if (lname.contains("res/mipmap") || lname.contains("res/drawable"))
            && (lname.ends_with(&needle_png) || lname.ends_with(&needle_webp) || lname.contains(&format!("/{}", icon_name.to_lowercase())))
        {
            let score = icon_score(&lname);
            if score > best_score {
                let mut buf = Vec::with_capacity(file.size() as usize);
                let _ = std::io::copy(&mut file, &mut buf)?;
                best_score = score;
                best_bytes = Some(buf);
            }
        }
    }
    Ok(best_bytes)
}

fn icon_score(name: &str) -> i32 {
    // density preference
    let mut score = 0;
    if name.contains("xxxhdpi") { score += 6; }
    else if name.contains("xxhdpi") { score += 5; }
    else if name.contains("xhdpi") { score += 4; }
    else if name.contains("hdpi") { score += 3; }
    else if name.contains("mdpi") { score += 2; }
    // bonus for mipmap over drawable
    if name.contains("/mipmap-") { score += 2; }
    if name.contains("ic_launcher_round") { score += 1; }
    score
}
