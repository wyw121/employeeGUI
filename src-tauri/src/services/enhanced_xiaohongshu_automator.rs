use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};
use crate::utils::adb_utils::get_adb_path;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// 屏幕信息结构
#[derive(Debug, Clone)]
pub struct ScreenInfo {
    pub width: u32,
    pub height: u32,
    pub scale_x: f32,
    pub scale_y: f32,
}

// 设备适配器 - 核心改进
#[derive(Debug, Clone)]
pub struct DeviceAdapter {
    pub screen_info: ScreenInfo,
    pub device_id: String,
}

impl DeviceAdapter {
    /// 创建设备适配器
    pub async fn new(device_id: String, adb_path: &str) -> Result<Self> {
        let screen_info = Self::get_screen_info(&device_id, adb_path).await?;
        
        info!("📱 设备适配器初始化完成:");
        info!("   设备ID: {}", device_id);
        info!("   屏幕尺寸: {}x{}", screen_info.width, screen_info.height);
        info!("   缩放比例: {:.3}x{:.3}", screen_info.scale_x, screen_info.scale_y);
        
        Ok(Self {
            screen_info,
            device_id,
        })
    }
    
    /// 获取屏幕信息
    async fn get_screen_info(device_id: &str, adb_path: &str) -> Result<ScreenInfo> {
        // 获取屏幕分辨率
        let (width, height) = crate::screenshot_service::ScreenshotService::get_screen_resolution(device_id).await
            .map_err(|e| anyhow::anyhow!("获取屏幕分辨率失败: {}", e))?;
        
        // 基于标准分辨率1080x1920计算缩放比例
        let scale_x = width as f32 / 1080.0;
        let scale_y = height as f32 / 1920.0;
        
        Ok(ScreenInfo {
            width,
            height,
            scale_x,
            scale_y,
        })
    }
    
    /// 智能适配坐标 - 关键改进
    pub fn adapt_coordinates(&self, base_coords: (i32, i32)) -> (i32, i32) {
        let (base_x, base_y) = base_coords;
        
        let adapted_x = (base_x as f32 * self.screen_info.scale_x).round() as i32;
        let adapted_y = (base_y as f32 * self.screen_info.scale_y).round() as i32;
        
        // 确保坐标在屏幕范围内
        let final_x = adapted_x.max(10).min(self.screen_info.width as i32 - 10);
        let final_y = adapted_y.max(10).min(self.screen_info.height as i32 - 10);
        
        info!("🔄 坐标适配: ({},{}) -> ({},{}) -> ({},{}) [缩放: {:.3}x{:.3}]", 
              base_x, base_y, adapted_x, adapted_y, final_x, final_y,
              self.screen_info.scale_x, self.screen_info.scale_y);
        
        (final_x, final_y)
    }
    
    /// 获取多个候选坐标位置
    pub fn get_candidate_coordinates(&self, base_coords: Vec<(i32, i32)>) -> Vec<(i32, i32)> {
        base_coords.into_iter()
            .map(|coord| self.adapt_coordinates(coord))
            .collect()
    }
}

// 增强版小红书自动化器
pub struct EnhancedXiaohongshuAutomator {
    device_id: String,
    adb_path: String,
    adapter: DeviceAdapter,
}

impl EnhancedXiaohongshuAutomator {
    /// 创建增强版自动化器
    pub async fn new(device_id: String) -> Result<Self> {
        let adb_path = get_adb_path();
        let adapter = DeviceAdapter::new(device_id.clone(), &adb_path).await?;
        
        info!("🚀 创建增强版XiaohongshuAutomator - 设备ID: {}", device_id);
        
        Ok(Self {
            device_id,
            adb_path,
            adapter,
        })
    }
    
    /// 智能查找发现好友按钮 - 重点改进
    pub async fn smart_find_discover_friends_coords(&self) -> Result<(i32, i32)> {
        info!("🎯 开始智能查找发现好友按钮坐标...");
        info!("📱 设备信息: {}x{} (缩放: {:.3}x{:.3})", 
              self.adapter.screen_info.width, self.adapter.screen_info.height,
              self.adapter.screen_info.scale_x, self.adapter.screen_info.scale_y);
        
        // 策略1: UI元素分析
        if let Ok(coords) = self.find_discover_friends_by_ui_analysis().await {
            info!("✅ 通过UI分析找到发现好友按钮: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 策略2: 基于设备适配的多候选位置
        let base_candidates = vec![
            (270, 168), // 验证成功的基准坐标
            (160, 280), // 侧边栏上部
            (160, 320), // 侧边栏中部
            (160, 360), // 侧边栏中下部
            (180, 300), // 稍右偏移
            (140, 340), // 稍左偏移
            (200, 250), // 额外候选位置
            (220, 400), // 下方位置
        ];
        
        let adapted_candidates = self.adapter.get_candidate_coordinates(base_candidates);
        
        info!("🎯 准备测试 {} 个适配候选位置:", adapted_candidates.len());
        for (i, (x, y)) in adapted_candidates.iter().enumerate() {
            info!("   候选{}:  ({}, {})", i + 1, x, y);
        }
        
        // 策略3: 智能验证候选位置
        for (i, &coords) in adapted_candidates.iter().enumerate() {
            info!("🔍 测试候选位置{}: ({}, {})", i + 1, coords.0, coords.1);
            
            // 获取该位置的UI信息进行验证
            if let Ok(is_valid) = self.verify_discover_friends_position(coords).await {
                if is_valid {
                    info!("✅ 验证成功! 发现好友按钮位置: ({}, {})", coords.0, coords.1);
                    return Ok(coords);
                }
            }
        }
        
        // 策略4: 如果都验证失败，返回最有可能的适配位置
        let fallback_coords = adapted_candidates[0];
        warn!("⚠️ 所有候选位置验证失败，使用默认适配位置: ({}, {})", 
              fallback_coords.0, fallback_coords.1);
        
        Ok(fallback_coords)
    }
    
    /// 通过UI分析查找发现好友按钮
    async fn find_discover_friends_by_ui_analysis(&self) -> Result<(i32, i32)> {
        info!("🔍 开始UI分析查找发现好友按钮...");
        
        let ui_dump = self.get_ui_dump_with_retry().await?;
        info!("📄 获取UI dump成功，长度: {} 字符", ui_dump.len());
        
        // 分析UI内容，查找发现好友相关元素
        let lines: Vec<&str> = ui_dump.lines().collect();
        info!("📊 UI dump包含 {} 行", lines.len());
        
        // 搜索策略
        let search_patterns = vec![
            ("发现好友", "精确匹配"),
            ("发现", "部分匹配1"),
            ("好友", "部分匹配2"),
            ("discover", "英文匹配1"),
            ("friend", "英文匹配2"),
        ];
        
        for (pattern, description) in &search_patterns {
            info!("🔍 搜索模式: {} ({})", pattern, description);
            
            let matching_lines: Vec<(usize, &str)> = lines.iter()
                .enumerate()
                .filter(|(_, line)| line.to_lowercase().contains(&pattern.to_lowercase()))
                .collect();
            
            info!("📝 找到 {} 行包含 '{}' 的内容", matching_lines.len(), pattern);
            
            for (line_num, line) in &matching_lines {
                info!("   第{}行: {}", line_num + 1, 
                     line.chars().take(100).collect::<String>());
                
                // 尝试从这行提取坐标
                if let Some(coords) = self.extract_coords_from_ui_line(line) {
                    info!("✅ 从第{}行提取到坐标: ({}, {})", line_num + 1, coords.0, coords.1);
                    
                    // 验证坐标是否合理
                    if self.is_coordinate_valid(coords) {
                        return Ok(coords);
                    } else {
                        info!("⚠️ 坐标不合理，继续搜索");
                    }
                }
            }
        }
        
        Err(anyhow::anyhow!("UI分析未找到发现好友按钮"))
    }
    
    /// 验证发现好友按钮位置
    async fn verify_discover_friends_position(&self, coords: (i32, i32)) -> Result<bool> {
        info!("🔍 验证位置 ({}, {}) 是否为发现好友按钮", coords.0, coords.1);
        
        // 获取该位置周围的UI信息
        let ui_dump = self.get_ui_dump_with_retry().await?;
        
        // 检查坐标周围是否有发现好友相关的文本
        let tolerance = 50; // 50像素容差
        let mut nearby_texts = Vec::new();
        
        for line in ui_dump.lines() {
            if let Some(element_coords) = self.extract_coords_from_ui_line(line) {
                let distance = ((element_coords.0 - coords.0).pow(2) + (element_coords.1 - coords.1).pow(2)) as f64;
                let distance = distance.sqrt() as i32;
                
                if distance <= tolerance {
                    if let Some(text) = self.extract_text_from_ui_line(line) {
                        nearby_texts.push((distance, text));
                    }
                }
            }
        }
        
        // 按距离排序
        nearby_texts.sort_by_key(|&(dist, _)| dist);
        
        info!("📝 位置({},{})附近的文本元素:", coords.0, coords.1);
        for (distance, text) in &nearby_texts {
            info!("   距离{}: '{}'", distance, text);
        }
        
        // 判断是否包含发现好友相关文本
        let is_valid = nearby_texts.iter().any(|(_, text)| {
            let text_lower = text.to_lowercase();
            text_lower.contains("发现好友") || 
            text_lower.contains("发现") || 
            text_lower.contains("discover") ||
            text_lower.contains("friend")
        });
        
        if is_valid {
            info!("✅ 位置验证成功，发现相关文本");
        } else {
            info!("❌ 位置验证失败，未发现相关文本");
        }
        
        Ok(is_valid)
    }
    
    /// 从UI行中提取坐标
    fn extract_coords_from_ui_line(&self, line: &str) -> Option<(i32, i32)> {
        // 查找bounds属性: bounds="[left,top][right,bottom]"
        if let Some(bounds_start) = line.find("bounds=\"[") {
            if let Some(bounds_end) = line[bounds_start..].find("]\"") {
                let bounds_str = &line[bounds_start + 9..bounds_start + bounds_end];
                
                if let Some(middle) = bounds_str.find("][") {
                    let left_top = &bounds_str[..middle];
                    let right_bottom = &bounds_str[middle + 2..];
                    
                    if let (Some(comma1), Some(comma2)) = (left_top.find(','), right_bottom.find(',')) {
                        if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                            left_top[..comma1].parse::<i32>(),
                            left_top[comma1 + 1..].parse::<i32>(),
                            right_bottom[..comma2].parse::<i32>(),
                            right_bottom[comma2 + 1..].parse::<i32>(),
                        ) {
                            let center_x = (left + right) / 2;
                            let center_y = (top + bottom) / 2;
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        None
    }
    
    /// 从UI行中提取文本
    fn extract_text_from_ui_line(&self, line: &str) -> Option<String> {
        if let Some(text_start) = line.find("text=\"") {
            let text_part = &line[text_start + 6..];
            if let Some(text_end) = text_part.find("\"") {
                let text = text_part[..text_end].to_string();
                if !text.trim().is_empty() {
                    return Some(text);
                }
            }
        }
        None
    }
    
    /// 验证坐标是否有效
    fn is_coordinate_valid(&self, coords: (i32, i32)) -> bool {
        let (x, y) = coords;
        let screen_width = self.adapter.screen_info.width as i32;
        let screen_height = self.adapter.screen_info.height as i32;
        
        x > 10 && x < screen_width - 10 && y > 10 && y < screen_height - 10
    }
    
    /// 获取UI dump（带重试机制）
    async fn get_ui_dump_with_retry(&self) -> Result<String> {
        const MAX_RETRIES: u32 = 3;
        
        for attempt in 1..=MAX_RETRIES {
            info!("📱 第 {} 次尝试获取UI dump...", attempt);
            
            match self.get_ui_dump_once().await {
                Ok(ui_dump) => {
                    if ui_dump.len() > 100 && ui_dump.contains("<?xml") {
                        info!("✓ 成功获取UI dump，长度: {} 字符", ui_dump.len());
                        return Ok(ui_dump);
                    } else {
                        warn!("⚠️ UI dump内容不完整，长度: {}", ui_dump.len());
                    }
                }
                Err(e) => {
                    warn!("❌ 第 {} 次获取UI dump失败: {}", attempt, e);
                }
            }
            
            if attempt < MAX_RETRIES {
                let wait_time = 1000 * attempt;
                info!("⏳ 等待 {}ms 后重试", wait_time);
                sleep(Duration::from_millis(wait_time as u64)).await;
            }
        }
        
        Err(anyhow::anyhow!("获取UI dump失败，已重试 {} 次", MAX_RETRIES))
    }
    
    /// 单次获取UI dump
    async fn get_ui_dump_once(&self) -> Result<String> {
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(&[
            "-s", &self.device_id,
            "shell", "uiautomator", "dump", "/dev/stdout"
        ]);
        
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        
        let output = cmd.output()
            .context("执行uiautomator dump失败")?;
        
        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout).to_string();
            if result.len() > 100 && result.contains("<?xml") {
                return Ok(result);
            }
        }
        
        // 如果直接dump失败，尝试先写入文件再读取
        let mut cmd2 = Command::new(&self.adb_path);
        cmd2.args(&[
            "-s", &self.device_id,
            "shell", "uiautomator", "dump", "/sdcard/ui_temp.xml"
        ]);
        
        #[cfg(windows)]
        cmd2.creation_flags(0x08000000);
        
        cmd2.output().context("dump到文件失败")?;
        
        sleep(Duration::from_millis(500)).await;
        
        let mut cmd3 = Command::new(&self.adb_path);
        cmd3.args(&[
            "-s", &self.device_id,
            "shell", "cat", "/sdcard/ui_temp.xml"
        ]);
        
        #[cfg(windows)]
        cmd3.creation_flags(0x08000000);
        
        let output2 = cmd3.output()
            .context("读取UI文件失败")?;
        
        Ok(String::from_utf8_lossy(&output2.stdout).to_string())
    }
    
    /// 智能点击发现好友按钮
    pub async fn smart_click_discover_friends(&self) -> Result<()> {
        info!("🎯 开始智能点击发现好友按钮");
        
        let coords = self.smart_find_discover_friends_coords().await?;
        
        info!("👆 点击发现好友按钮，坐标: ({}, {})", coords.0, coords.1);
        self.adb_tap(coords.0, coords.1).await?;
        
        // 等待页面加载
        sleep(Duration::from_millis(2000)).await;
        
        // 验证点击结果
        if let Ok(success) = self.verify_click_success("发现好友").await {
            if success {
                info!("✅ 发现好友按钮点击成功");
                Ok(())
            } else {
                Err(anyhow::anyhow!("发现好友按钮点击验证失败"))
            }
        } else {
            warn!("⚠️ 无法验证点击结果，但操作已执行");
            Ok(())
        }
    }
    
    /// 验证点击成功
    async fn verify_click_success(&self, expected_change: &str) -> Result<bool> {
        info!("🔍 验证点击结果，期望变化: {}", expected_change);
        
        let ui_dump = self.get_ui_dump_with_retry().await?;
        
        // 检查页面是否包含预期的变化
        let success = match expected_change {
            "发现好友" => {
                // 检查是否进入发现好友页面
                ui_dump.contains("通讯录") || 
                ui_dump.contains("联系人") ||
                ui_dump.contains("推荐关注") ||
                ui_dump.contains("可能认识")
            },
            _ => false,
        };
        
        if success {
            info!("✅ 点击验证成功，页面已发生预期变化");
        } else {
            info!("❌ 点击验证失败，页面未发生预期变化");
            // 输出当前页面的关键信息用于调试
            let key_texts: Vec<&str> = ui_dump.lines()
                .filter_map(|line| self.extract_text_from_ui_line(line))
                .filter(|text| !text.trim().is_empty() && text.len() < 20)
                .collect::<Vec<String>>()
                .iter()
                .map(|s| s.as_str())
                .take(10)
                .collect();
            
            info!("🔍 当前页面关键文本: {:?}", key_texts);
        }
        
        Ok(success)
    }
    
    /// ADB点击操作
    async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        info!("👆 执行ADB点击，坐标: ({}, {})", x, y);
        
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(&[
            "-s", &self.device_id,
            "shell", "input", "tap",
            &x.to_string(), &y.to_string()
        ]);
        
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        
        let output = cmd.output()
            .context("ADB点击命令执行失败")?;
        
        if output.status.success() {
            info!("✅ ADB点击成功");
            Ok(())
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            Err(anyhow::anyhow!("ADB点击失败: {}", error_msg))
        }
    }
    
    /// 保存调试截图
    pub async fn save_debug_screenshot(&self, prefix: &str) -> Result<()> {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let filename = format!("{}_{}.png", prefix, timestamp);
        
        info!("📸 保存调试截图: {}", filename);
        
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(&[
            "-s", &self.device_id,
            "shell", "screencap", "-p", "/sdcard/debug_screenshot.png"
        ]);
        
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);
        
        let output = cmd.output()?;
        
        if output.status.success() {
            // 将截图拉取到本地
            let mut cmd2 = Command::new(&self.adb_path);
            cmd2.args(&[
                "-s", &self.device_id,
                "pull", "/sdcard/debug_screenshot.png", 
                &format!("./screenshots/{}", filename)
            ]);
            
            #[cfg(windows)]
            cmd2.creation_flags(0x08000000);
            
            cmd2.output()?;
            
            info!("✅ 调试截图保存成功: {}", filename);
        }
        
        Ok(())
    }
}