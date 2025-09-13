use anyhow::Result;
use std::process::Command;
use tracing::info;

/// 调试辅助工具
pub struct DebugHelper {
    device_id: String,
    adb_path: String,
}

impl DebugHelper {
    pub fn new(device_id: String) -> Self {
        Self {
            device_id,
            adb_path: "adb".to_string(),
        }
    }

    /// 打印当前UI dump内容（调试用）
    pub async fn print_ui_dump(&self) -> Result<()> {
        info!("🔍 获取UI dump进行调试分析...");
        
        let ui_dump = self.get_ui_dump().await?;
        
        info!("📄 UI dump总长度: {} 字符", ui_dump.len());
        
        // 打印前500字符
        let preview = if ui_dump.len() > 500 {
            &ui_dump[..500]
        } else {
            &ui_dump
        };
        
        info!("📋 UI dump前500字符:");
        info!("{}", preview);
        
        // 查找关键词
        let keywords = vec!["关注", "follow", "首页", "推荐", "发现", "通讯录", "设置", "头像"];
        
        info!("🔍 关键词搜索结果:");
        for keyword in keywords {
            let count = ui_dump.matches(keyword).count();
            if count > 0 {
                info!("  '{}': 找到 {} 次", keyword, count);
            }
        }

        // 分析可点击元素
        let clickable_count = ui_dump.matches("clickable=\"true\"").count();
        info!("🖱️ 可点击元素数量: {}", clickable_count);

        // 分析文本元素
        let text_elements: Vec<&str> = ui_dump
            .lines()
            .filter(|line| line.contains("text=\"") && !line.contains("text=\"\""))
            .take(10)
            .collect();
        
        info!("📝 文本元素示例 (前10个):");
        for (i, element) in text_elements.iter().enumerate() {
            let text = self.extract_text_from_line(element);
            info!("  {}: {}", i + 1, text);
        }

        Ok(())
    }

    /// 从UI元素行中提取文本
    fn extract_text_from_line(&self, line: &str) -> String {
        if let Some(start) = line.find("text=\"") {
            let start = start + 6; // "text=\"".len()
            if let Some(end) = line[start..].find('"') {
                return line[start..start + end].to_string();
            }
        }
        "无文本".to_string()
    }

    /// 获取UI dump
    async fn get_ui_dump(&self) -> Result<String> {
        info!("尝试方法1: 直接输出到stdout");
        let output1 = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "uiautomator", "dump", "/dev/stdout"])
            .output()
            .context("获取UI dump失败")?;

        let result1 = String::from_utf8_lossy(&output1.stdout).to_string();
        
        if result1.len() > 100 && result1.contains("<?xml") {
            return Ok(result1);
        }

        info!("方法1失败，尝试方法2: 输出到文件再读取");
        // 方法2: 先dump到文件，再cat
        let _dump_output = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"])
            .output()
            .context("dump到文件失败")?;

        // 读取文件内容
        let output2 = Command::new(&self.adb_path)
            .args(&["-s", &self.device_id, "shell", "cat", "/sdcard/ui_dump.xml"])
            .output()
            .context("读取UI dump文件失败")?;

        let result2 = String::from_utf8_lossy(&output2.stdout).to_string();
        
        if result2.len() > 100 && result2.contains("<?xml") {
            return Ok(result2);
        }

        info!("方法2也失败，返回错误信息用于调试");
        info!("方法1输出长度: {}, 内容: {}", result1.len(), &result1[..result1.len().min(200)]);
        info!("方法2输出长度: {}, 内容: {}", result2.len(), &result2[..result2.len().min(200)]);
        
        // 返回原始结果用于调试
        Ok(format!("方法1结果: {}\n方法2结果: {}", result1, result2))
    }
}

use anyhow::Context;