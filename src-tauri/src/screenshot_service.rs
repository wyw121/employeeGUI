use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use crate::adb_utils::execute_adb_command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScreenshotResult {
    pub success: bool,
    pub screenshot_path: Option<String>,
    pub error: Option<String>,
}

pub struct ScreenshotService;

impl ScreenshotService {
    /// 捕获设备截图
    pub async fn capture_screenshot(device_id: &str, app_handle: &tauri::AppHandle) -> ScreenshotResult {
        let app_data_dir = match app_handle.path_resolver().app_data_dir() {
            Some(dir) => dir,
            None => {
                return ScreenshotResult {
                    success: false,
                    screenshot_path: None,
                    error: Some("无法获取应用数据目录".to_string()),
                };
            }
        };

        // 确保screenshots目录存在
        let screenshots_dir = app_data_dir.join("screenshots");
        if let Err(e) = std::fs::create_dir_all(&screenshots_dir) {
            return ScreenshotResult {
                success: false,
                screenshot_path: None,
                error: Some(format!("创建截图目录失败: {}", e)),
            };
        }

        // 生成唯一的截图文件名
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S_%3f").to_string();
        let screenshot_filename = format!("screenshot_{}_{}.png", device_id.replace(":", "_"), timestamp);
        let local_path = screenshots_dir.join(&screenshot_filename);

        // 在设备上的临时路径
        let device_temp_path = "/sdcard/temp_screenshot.png";

        // Step 1: 在设备上截图
        let screenshot_result = execute_adb_command(device_id, &["shell", "screencap", "-p", device_temp_path]);
        if !screenshot_result.success {
            return ScreenshotResult {
                success: false,
                screenshot_path: None,
                error: Some(format!("设备截图失败: {}", screenshot_result.output)),
            };
        }

        // Step 2: 将截图从设备拉取到本地
        let pull_result = execute_adb_command(device_id, &["pull", device_temp_path, local_path.to_str().unwrap()]);
        if !pull_result.success {
            return ScreenshotResult {
                success: false,
                screenshot_path: None,
                error: Some(format!("拉取截图失败: {}", pull_result.output)),
            };
        }

        // Step 3: 清理设备上的临时文件
        let _ = execute_adb_command(device_id, &["shell", "rm", device_temp_path]);

        // Step 4: 验证文件是否存在
        if !local_path.exists() {
            return ScreenshotResult {
                success: false,
                screenshot_path: None,
                error: Some("截图文件未成功保存".to_string()),
            };
        }

        ScreenshotResult {
            success: true,
            screenshot_path: Some(local_path.to_string_lossy().to_string()),
            error: None,
        }
    }

    /// 获取设备屏幕分辨率
    pub async fn get_screen_resolution(device_id: &str) -> Result<(u32, u32), String> {
        let result = execute_adb_command(device_id, &["shell", "wm", "size"]);
        if !result.success {
            return Err(format!("获取屏幕分辨率失败: {}", result.output));
        }

        // 解析输出，格式类似: "Physical size: 1080x1920"
        for line in result.output.lines() {
            if line.contains("Physical size:") || line.contains("size:") {
                if let Some(size_part) = line.split(':').nth(1) {
                    let size_str = size_part.trim();
                    if let Some((width_str, height_str)) = size_str.split_once('x') {
                        if let (Ok(width), Ok(height)) = (width_str.parse::<u32>(), height_str.parse::<u32>()) {
                            return Ok((width, height));
                        }
                    }
                }
            }
        }

        Err("无法解析屏幕分辨率信息".to_string())
    }

    /// 清理旧的截图文件
    pub async fn cleanup_old_screenshots(app_handle: &tauri::AppHandle, keep_count: usize) -> Result<(), String> {
        let app_data_dir = match app_handle.path_resolver().app_data_dir() {
            Some(dir) => dir,
            None => return Err("无法获取应用数据目录".to_string()),
        };

        let screenshots_dir = app_data_dir.join("screenshots");
        if !screenshots_dir.exists() {
            return Ok(());
        }

        let mut screenshot_files = Vec::new();
        
        if let Ok(entries) = std::fs::read_dir(&screenshots_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        if let Some(file_name) = entry.file_name().to_str() {
                            if file_name.starts_with("screenshot_") && file_name.ends_with(".png") {
                                screenshot_files.push((entry.path(), metadata.modified().unwrap_or(std::time::UNIX_EPOCH)));
                            }
                        }
                    }
                }
            }
        }

        // 按修改时间排序，保留最新的文件
        screenshot_files.sort_by(|a, b| b.1.cmp(&a.1));

        // 删除多余的文件
        for (file_path, _) in screenshot_files.iter().skip(keep_count) {
            let _ = std::fs::remove_file(file_path);
        }

        Ok(())
    }
}

// Tauri 命令包装器
#[tauri::command]
pub async fn capture_device_screenshot(
    device_id: String,
    app_handle: tauri::AppHandle,
) -> Result<ScreenshotResult, String> {
    let result = ScreenshotService::capture_screenshot(&device_id, &app_handle).await;
    
    // 异步清理旧截图（保留最近10张）
    tokio::spawn(async move {
        let _ = ScreenshotService::cleanup_old_screenshots(&app_handle, 10).await;
    });
    
    Ok(result)
}

#[tauri::command]
pub async fn get_device_screen_resolution(device_id: String) -> Result<(u32, u32), String> {
    ScreenshotService::get_screen_resolution(&device_id).await
}