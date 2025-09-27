// File system related simple commands

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    match std::fs::remove_file(&path) {
        Ok(_) => Ok(()),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok(())
            } else {
                Err(format!("删除文件失败: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn clear_adb_keys() -> Result<(), String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(std::path::PathBuf::from)
        .map_err(|_| "无法获取用户主目录".to_string())?;

    let android_dir = home.join(".android");
    let key = android_dir.join("adbkey");
    let key_pub = android_dir.join("adbkey.pub");

    let mut errs: Vec<String> = Vec::new();
    for p in [key, key_pub].iter() {
        if p.exists() {
            if let Err(e) = std::fs::remove_file(p) {
                errs.push(format!("删除 {:?} 失败: {}", p, e));
            }
        }
    }

    if errs.is_empty() { Ok(()) } else { Err(errs.join("; ")) }
}

/// 在系统文件管理器中定位文件/打开目录
#[tauri::command]
pub async fn reveal_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        // 如果路径存在，尝试使用 /select 定位；否则直接打开父目录或路径
        let p = std::path::Path::new(&path);
        if p.exists() {
            // explorer /select,"C:\\path\\to\\file"
            Command::new("explorer")
                .args(["/select,", &path])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if let Some(parent) = p.parent() {
            Command::new("explorer")
                .arg(parent.to_string_lossy().to_string())
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            // 兜底：直接打开 explorer，不报错
            let _ = Command::new("explorer").spawn();
        }
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let p = std::path::Path::new(&path);
        if p.exists() {
            Command::new("open")
                .args(["-R", &path])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if let Some(parent) = p.parent() {
            Command::new("open")
                .arg(parent.to_string_lossy().to_string())
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            let _ = Command::new("open").spawn();
        }
        Ok(())
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        use std::process::Command;
        let p = std::path::Path::new(&path);
        if p.exists() {
            Command::new("xdg-open")
                .arg(p.to_string_lossy().to_string())
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if let Some(parent) = p.parent() {
            Command::new("xdg-open")
                .arg(parent.to_string_lossy().to_string())
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            let _ = Command::new("xdg-open").spawn();
        }
        Ok(())
    }
}
