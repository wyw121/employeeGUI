use tauri::command;

/// 写入文本内容到本地文件（覆盖写入）
#[command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

/// 删除本地文件（忽略不存在错误）
#[command]
pub async fn delete_file(path: String) -> Result<(), String> {
    match std::fs::remove_file(&path) {
        Ok(_) => Ok(()),
        Err(e) => {
            // 不存在则视为成功，其他错误返回
            if e.kind() == std::io::ErrorKind::NotFound { Ok(()) } else { Err(e.to_string()) }
        }
    }
}

/// 在系统文件管理器中定位文件/打开目录
#[command]
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
