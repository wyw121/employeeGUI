use tracing::{error, info};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;

/// 小红书关注结果
#[derive(Debug, Serialize, Deserialize)]
pub struct XiaohongshuFollowResult {
    pub success: bool,
    pub followed_count: usize,
    pub message: String,
}

/// 小红书自动关注服务
pub struct XiaohongshuFollowService;

impl XiaohongshuFollowService {
    /// 执行小红书自动关注
    pub async fn auto_follow(
        device_id: &str,
        max_follows: Option<usize>,
    ) -> Result<XiaohongshuFollowResult, String> {
        info!("开始小红书自动关注: 设备 {}", device_id);

        // 构建xiaohongshu-follow-test项目的可执行文件路径
        let exe_path = std::path::Path::new("xiaohongshu-follow-test")
            .join("target")
            .join("debug")
            .join("xiaohongshu-follow.exe");

        if !exe_path.exists() {
            // 如果可执行文件不存在，尝试编译
            info!("可执行文件不存在，开始编译...");
            let compile_result = Command::new("cargo")
                .args(&["build"])
                .current_dir("xiaohongshu-follow-test")
                .output()
                .map_err(|e| format!("编译失败: {}", e))?;

            if !compile_result.status.success() {
                let error_msg = String::from_utf8_lossy(&compile_result.stderr);
                return Err(format!("编译失败: {}", error_msg));
            }
        }

        // 构建命令参数
        let mut args = vec!["follow", "--device", device_id];
        let max_follows_str;
        if let Some(max) = max_follows {
            max_follows_str = max.to_string();
            args.extend(&["--max-follows", &max_follows_str]);
        }

        info!("执行命令: {:?} {:?}", exe_path, args);

        // 执行关注命令
        let output = Command::new(&exe_path)
            .args(&args)
            .current_dir("xiaohongshu-follow-test")
            .output()
            .map_err(|e| format!("执行关注命令失败: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        info!("命令输出: {}", stdout);
        if !stderr.is_empty() {
            error!("命令错误: {}", stderr);
        }

        if output.status.success() {
            // 解析输出，提取关注结果
            let followed_count = Self::parse_followed_count(&stdout);
            Ok(XiaohongshuFollowResult {
                success: true,
                followed_count,
                message: format!("成功关注了 {} 个好友", followed_count),
            })
        } else {
            Err(format!("关注失败: {}", stderr))
        }
    }

    /// 从输出中解析关注数量
    fn parse_followed_count(output: &str) -> usize {
        // 查找类似 "✅ 已成功关注 X 个好友" 的文本
        for line in output.lines() {
            if line.contains("已成功关注") && line.contains("个好友") {
                // 提取数字
                if let Some(start) = line.find("关注 ") {
                    if let Some(end) = line[start + 3..].find(" 个") {
                        let count_str = &line[start + 3..start + 3 + end];
                        if let Ok(count) = count_str.trim().parse::<usize>() {
                            return count;
                        }
                    }
                }
            }
            // 也查找 "关注数量: X" 的格式
            if line.contains("关注数量:") {
                if let Some(colon_pos) = line.find(':') {
                    let count_str = line[colon_pos + 1..].trim();
                    if let Ok(count) = count_str.parse::<usize>() {
                        return count;
                    }
                }
            }
        }
        0
    }
}

/// Tauri命令：小红书自动关注（新版本）
#[command]
pub async fn xiaohongshu_auto_follow_v2(
    device_id: String,
    max_follows: Option<usize>,
) -> Result<XiaohongshuFollowResult, String> {
    XiaohongshuFollowService::auto_follow(&device_id, max_follows).await
}