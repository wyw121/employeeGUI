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

    // Collect candidates
    let mut best_score = -1i32;
    let mut best_bytes: Option<Vec<u8>> = None;

    for i in 0..zip.len() {
        let mut file = zip.by_index(i)?;
        let name = file.name().to_string();
        let lname = name.to_lowercase();

        // Prefer png icons in mipmap/drawable folders
        if (lname.contains("res/mipmap") || lname.contains("res/drawable"))
            && lname.contains("ic_launcher")
            && lname.ends_with(".png")
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
