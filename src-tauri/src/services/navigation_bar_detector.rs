use anyhow::Result;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;
use tracing::{error, info, warn};

use crate::services::adb_session_manager::get_device_session;

/// 导航栏类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NavigationBarType {
    Bottom,         // 底部导航栏
    Top,            // 顶部导航栏
    Side,           // 侧边导航栏
    FloatingAction, // 悬浮操作按钮
}

/// 导航栏位置配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationBarPosition {
    /// 导航栏类型
    pub bar_type: NavigationBarType,
    /// 相对屏幕位置比例 (0.0-1.0)
    pub position_ratio: PositionRatio,
    /// 期望高度/宽度比例
    pub size_ratio: f64,
    /// 最小尺寸阈值
    pub min_size_threshold: i32,
}

/// 位置比例配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionRatio {
    /// 起始位置比例 (x轴或y轴)
    pub start: f64,
    /// 结束位置比例 (x轴或y轴)
    pub end: f64,
}

/// 导航按钮识别配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationButtonConfig {
    /// 按钮文本内容
    pub text: Option<String>,
    /// content-desc内容
    pub content_desc: Option<String>,
    /// resource-id匹配模式
    pub resource_id_pattern: Option<String>,
    /// 类名匹配
    pub class_name: Option<String>,
    /// 是否必须可点击
    pub must_clickable: bool,
    /// 位置约束（在导航栏内的相对位置）
    pub position_in_bar: Option<f64>,
}

/// 导航栏识别配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationBarDetectionConfig {
    /// 应用包名
    pub package_name: String,
    /// 导航栏位置配置
    pub bar_position: NavigationBarPosition,
    /// 目标按钮配置
    pub target_buttons: HashMap<String, NavigationButtonConfig>,
    /// 是否启用智能适配
    pub enable_smart_adaptation: bool,
}

/// 检测到的导航栏信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedNavigationBar {
    /// 导航栏边界
    pub bounds: (i32, i32, i32, i32), // (left, top, right, bottom)
    /// 导航栏类型
    pub bar_type: NavigationBarType,
    /// 包含的按钮列表
    pub buttons: Vec<DetectedNavigationButton>,
    /// 置信度 (0.0-1.0)
    pub confidence: f64,
}

/// 检测到的导航按钮
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedNavigationButton {
    /// 按钮名称/标识
    pub name: String,
    /// 按钮边界
    pub bounds: (i32, i32, i32, i32),
    /// 文本内容
    pub text: Option<String>,
    /// content-desc
    pub content_desc: Option<String>,
    /// 是否可点击
    pub clickable: bool,
    /// 在导航栏中的位置索引
    pub position_index: usize,
    /// 置信度
    pub confidence: f64,
}

/// 导航栏识别结果
#[derive(Debug, Serialize, Deserialize)]
pub struct NavigationDetectionResult {
    pub success: bool,
    pub message: String,
    pub detected_bars: Vec<DetectedNavigationBar>,
    pub target_button: Option<DetectedNavigationButton>,
    pub screen_size: (i32, i32),
    pub detection_time_ms: u64,
}

/// 导航栏检测器
pub struct NavigationBarDetector {
    device_id: String,
}

impl NavigationBarDetector {
    pub fn new(device_id: String) -> Self {
        Self { device_id }
    }

    /// 点击导航按钮
    pub async fn click_navigation_button(
        &self,
        device_id: &str,
        button_text: &str,
        config: &NavigationBarDetectionConfig,
    ) -> Result<bool> {
        // 首先检测导航栏
        let detection_result = self
            .detect_navigation_bar(config.clone(), device_id.to_string())
            .await?;

        // 查找指定按钮
        for bar in detection_result.detected_bars {
            for button in bar.buttons {
                if button.name == button_text {
                    let session = get_device_session(device_id).await?;
                    let (left, top, right, bottom) = button.bounds;
                    let center_x = (left + right) / 2;
                    let center_y = (top + bottom) / 2;

                    info!(
                        "点击导航按钮: {} 坐标: ({}, {})",
                        button.name, center_x, center_y
                    );
                    session.tap(center_x, center_y).await?;

                    // 等待页面切换
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

                    return Ok(true);
                }
            }
        }

        Ok(false)
    }

    /// 创建通用底部导航配置
    pub fn create_generic_bottom_navigation_config() -> NavigationBarDetectionConfig {
        NavigationBarDetectionConfig {
            package_name: "".to_string(),
            bar_position: NavigationBarPosition {
                bar_type: NavigationBarType::Bottom,
                position_ratio: PositionRatio {
                    start: 0.85,
                    end: 1.0,
                },
                size_ratio: 0.1,
                min_size_threshold: 60,
            },
            target_buttons: HashMap::new(),
            enable_smart_adaptation: true,
        }
    }

    /// 检测导航栏和目标按钮
    pub async fn detect_navigation_bar(
        &self,
        config: NavigationBarDetectionConfig,
        target_button_name: String,
    ) -> Result<NavigationDetectionResult> {
        let start_time = std::time::Instant::now();
        let session = get_device_session(&self.device_id).await?;

        info!(
            "开始检测导航栏，设备: {}, 目标按钮: {}",
            self.device_id, target_button_name
        );

        // 获取UI结构
        let ui_content = session
            .dump_ui()
            .await
            .map_err(|e| anyhow::anyhow!("获取UI结构失败: {}", e))?;

        // 获取屏幕尺寸
        let screen_size = self.extract_screen_size(&ui_content)?;
        info!("屏幕尺寸: {:?}", screen_size);

        // 解析UI结构找到导航栏
        let detected_bars = self.find_navigation_bars(&ui_content, &config, screen_size)?;

        // 在检测到的导航栏中查找目标按钮
        let target_button =
            self.find_target_button(&detected_bars, &config, &target_button_name)?;

        let detection_time = start_time.elapsed().as_millis() as u64;

        let result = NavigationDetectionResult {
            success: target_button.is_some(),
            message: if target_button.is_some() {
                format!("成功找到目标按钮: {}", target_button_name)
            } else {
                format!("未找到目标按钮: {}", target_button_name)
            },
            detected_bars,
            target_button,
            screen_size,
            detection_time_ms: detection_time,
        };

        info!("导航栏检测完成，耗时: {}ms", detection_time);
        Ok(result)
    }

    /// 提取屏幕尺寸
    fn extract_screen_size(&self, ui_content: &str) -> Result<(i32, i32)> {
        if let Some(caps) = Regex::new(r#"bounds="\[0,0\]\[(\d+),(\d+)\]""#)?.captures(ui_content) {
            let width: i32 = caps[1].parse()?;
            let height: i32 = caps[2].parse()?;
            Ok((width, height))
        } else {
            // 默认尺寸
            Ok((1080, 1920))
        }
    }

    /// 查找导航栏
    fn find_navigation_bars(
        &self,
        ui_content: &str,
        config: &NavigationBarDetectionConfig,
        screen_size: (i32, i32),
    ) -> Result<Vec<DetectedNavigationBar>> {
        let mut detected_bars = Vec::new();
        let (screen_width, screen_height) = screen_size;

        // 根据配置类型查找导航栏
        match config.bar_position.bar_type {
            NavigationBarType::Bottom => {
                detected_bars.extend(self.find_bottom_navigation_bars(
                    ui_content,
                    config,
                    screen_width,
                    screen_height,
                )?);
            }
            NavigationBarType::Top => {
                detected_bars.extend(self.find_top_navigation_bars(
                    ui_content,
                    config,
                    screen_width,
                    screen_height,
                )?);
            }
            NavigationBarType::Side => {
                detected_bars.extend(self.find_side_navigation_bars(
                    ui_content,
                    config,
                    screen_width,
                    screen_height,
                )?);
            }
            NavigationBarType::FloatingAction => {
                detected_bars.extend(self.find_floating_action_bars(
                    ui_content,
                    config,
                    screen_width,
                    screen_height,
                )?);
            }
        }

        Ok(detected_bars)
    }

    /// 查找底部导航栏
    fn find_bottom_navigation_bars(
        &self,
        ui_content: &str,
        config: &NavigationBarDetectionConfig,
        screen_width: i32,
        screen_height: i32,
    ) -> Result<Vec<DetectedNavigationBar>> {
        let mut bars = Vec::new();
        let position_config = &config.bar_position.position_ratio;

        // 计算期望的导航栏Y坐标范围
        let expected_top = (screen_height as f64 * position_config.start) as i32;
        let expected_bottom = (screen_height as f64 * position_config.end) as i32;

        info!(
            "查找底部导航栏，期望范围: Y({}-{})",
            expected_top, expected_bottom
        );

        // 使用正则表达式查找符合条件的ViewGroup
        let node_regex = Regex::new(
            r#"<node[^>]*class="([^"]*(?:ViewGroup|LinearLayout|RelativeLayout|FrameLayout)[^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*package="([^"]*)"[^>]*>"#,
        )?;

        for caps in node_regex.captures_iter(ui_content) {
            let class_name = &caps[1];
            let left: i32 = caps[2].parse()?;
            let top: i32 = caps[3].parse()?;
            let right: i32 = caps[4].parse()?;
            let bottom: i32 = caps[5].parse()?;
            let package_name = &caps[6];

            // 检查是否是目标应用的包
            if package_name != config.package_name {
                continue;
            }

            // 检查是否在预期的底部区域
            if top >= expected_top && bottom <= expected_bottom {
                let height = bottom - top;
                let width = right - left;

                // 检查尺寸是否合理（宽度应该占屏幕大部分，高度相对较小）
                if width > screen_width / 2
                    && height > config.bar_position.min_size_threshold
                    && height < screen_height / 4
                {
                    info!(
                        "发现潜在底部导航栏: {} bounds=({},{},{},{})",
                        class_name, left, top, right, bottom
                    );

                    // 在这个区域内查找按钮
                    let buttons = self.find_navigation_buttons_in_area(
                        ui_content,
                        (left, top, right, bottom),
                        config,
                    )?;

                    if buttons.len() >= 2 {
                        // 至少要有2个按钮才认为是导航栏
                        bars.push(DetectedNavigationBar {
                            bounds: (left, top, right, bottom),
                            bar_type: NavigationBarType::Bottom,
                            buttons,
                            confidence: self.calculate_bar_confidence(
                                &config.bar_position,
                                (left, top, right, bottom),
                                (screen_width, screen_height),
                            ),
                        });
                    }
                }
            }
        }

        Ok(bars)
    }

    /// 在指定区域内查找导航按钮
    fn find_navigation_buttons_in_area(
        &self,
        ui_content: &str,
        area_bounds: (i32, i32, i32, i32),
        config: &NavigationBarDetectionConfig,
    ) -> Result<Vec<DetectedNavigationButton>> {
        let mut buttons = Vec::new();
        let (area_left, area_top, area_right, area_bottom) = area_bounds;

        // 查找区域内所有可能的按钮元素
        let button_regex = Regex::new(
            r#"<node[^>]*(?:class="[^"]*(?:TextView|Button|ImageView|ViewGroup)[^"]*"[^>]*)?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*(?:clickable="([^"]*)"[^>]*)?(?:text="([^"]*)"[^>]*)?(?:content-desc="([^"]*)"[^>]*)?(?:resource-id="([^"]*)"[^>]*)?[^>]*/?>"#,
        )?;

        let mut button_index = 0;
        for caps in button_regex.captures_iter(ui_content) {
            let left: i32 = caps[1].parse().unwrap_or(0);
            let top: i32 = caps[2].parse().unwrap_or(0);
            let right: i32 = caps[3].parse().unwrap_or(0);
            let bottom: i32 = caps[4].parse().unwrap_or(0);
            let clickable = caps.get(5).map_or(false, |m| m.as_str() == "true");
            let text = caps
                .get(6)
                .map(|m| m.as_str().to_string())
                .filter(|s| !s.is_empty());
            let content_desc = caps
                .get(7)
                .map(|m| m.as_str().to_string())
                .filter(|s| !s.is_empty());
            let resource_id = caps
                .get(8)
                .map(|m| m.as_str().to_string())
                .filter(|s| !s.is_empty());

            // 检查是否在指定区域内
            if left >= area_left && top >= area_top && right <= area_right && bottom <= area_bottom
            {
                // 检查是否有文本或content-desc（导航按钮通常有标识）
                if text.is_some() || content_desc.is_some() {
                    let button_name = text
                        .as_ref()
                        .or(content_desc.as_ref())
                        .unwrap_or(&format!("button_{}", button_index))
                        .clone();

                    buttons.push(DetectedNavigationButton {
                        name: button_name,
                        bounds: (left, top, right, bottom),
                        text,
                        content_desc,
                        clickable,
                        position_index: button_index,
                        confidence: 0.8, // 基础置信度
                    });

                    button_index += 1;
                }
            }
        }

        // 按位置排序（底部导航栏按x坐标排序）
        buttons.sort_by(|a, b| a.bounds.0.cmp(&b.bounds.0));
        for (index, button) in buttons.iter_mut().enumerate() {
            button.position_index = index;
        }

        info!(
            "在区域 ({},{},{},{}) 内找到 {} 个按钮",
            area_left,
            area_top,
            area_right,
            area_bottom,
            buttons.len()
        );

        Ok(buttons)
    }

    /// 查找目标按钮
    fn find_target_button(
        &self,
        detected_bars: &[DetectedNavigationBar],
        config: &NavigationBarDetectionConfig,
        target_button_name: &str,
    ) -> Result<Option<DetectedNavigationButton>> {
        if let Some(target_config) = config.target_buttons.get(target_button_name) {
            for bar in detected_bars {
                for button in &bar.buttons {
                    if self.match_button_config(button, target_config) {
                        info!(
                            "找到匹配的目标按钮: {} 位置: {:?}",
                            target_button_name, button.bounds
                        );
                        return Ok(Some(button.clone()));
                    }
                }
            }
        }

        // 如果没有找到精确匹配，尝试模糊匹配
        for bar in detected_bars {
            for button in &bar.buttons {
                if self.fuzzy_match_button(button, target_button_name) {
                    warn!(
                        "通过模糊匹配找到目标按钮: {} -> {}",
                        target_button_name, button.name
                    );
                    return Ok(Some(button.clone()));
                }
            }
        }

        Ok(None)
    }

    /// 匹配按钮配置
    fn match_button_config(
        &self,
        button: &DetectedNavigationButton,
        config: &NavigationButtonConfig,
    ) -> bool {
        // 检查文本匹配
        if let Some(expected_text) = &config.text {
            if let Some(button_text) = &button.text {
                if button_text.contains(expected_text) {
                    return true;
                }
            }
        }

        // 检查content-desc匹配
        if let Some(expected_desc) = &config.content_desc {
            if let Some(button_desc) = &button.content_desc {
                if button_desc.contains(expected_desc) {
                    return true;
                }
            }
        }

        false
    }

    /// 模糊匹配按钮
    fn fuzzy_match_button(&self, button: &DetectedNavigationButton, target_name: &str) -> bool {
        if let Some(text) = &button.text {
            if text.contains(target_name) || target_name.contains(text) {
                return true;
            }
        }

        if let Some(desc) = &button.content_desc {
            if desc.contains(target_name) || target_name.contains(desc) {
                return true;
            }
        }

        false
    }

    /// 计算导航栏置信度
    fn calculate_bar_confidence(
        &self,
        position_config: &NavigationBarPosition,
        bounds: (i32, i32, i32, i32),
        screen_size: (i32, i32),
    ) -> f64 {
        let (left, top, right, bottom) = bounds;
        let (screen_width, screen_height) = screen_size;

        match position_config.bar_type {
            NavigationBarType::Bottom => {
                let expected_y = screen_height as f64 * position_config.position_ratio.start;
                let actual_y = top as f64;
                let y_diff = (expected_y - actual_y).abs();
                let y_accuracy = 1.0 - (y_diff / screen_height as f64).min(1.0);

                let width_ratio = (right - left) as f64 / screen_width as f64;
                let width_score = if width_ratio > 0.8 {
                    1.0
                } else {
                    width_ratio / 0.8
                };

                (y_accuracy * 0.6 + width_score * 0.4).max(0.1)
            }
            _ => 0.5, // 其他类型的基础置信度
        }
    }

    /// 查找顶部导航栏（待实现）
    fn find_top_navigation_bars(
        &self,
        _ui_content: &str,
        _config: &NavigationBarDetectionConfig,
        _screen_width: i32,
        _screen_height: i32,
    ) -> Result<Vec<DetectedNavigationBar>> {
        Ok(Vec::new()) // TODO: 实现顶部导航栏检测
    }

    /// 查找侧边导航栏（待实现）
    fn find_side_navigation_bars(
        &self,
        _ui_content: &str,
        _config: &NavigationBarDetectionConfig,
        _screen_width: i32,
        _screen_height: i32,
    ) -> Result<Vec<DetectedNavigationBar>> {
        Ok(Vec::new()) // TODO: 实现侧边导航栏检测
    }

    /// 查找悬浮操作栏（待实现）
    fn find_floating_action_bars(
        &self,
        _ui_content: &str,
        _config: &NavigationBarDetectionConfig,
        _screen_width: i32,
        _screen_height: i32,
    ) -> Result<Vec<DetectedNavigationBar>> {
        Ok(Vec::new()) // TODO: 实现悬浮操作栏检测
    }
}

/// 预定义的应用导航栏配置
pub fn create_xiaohongshu_navigation_config() -> NavigationBarDetectionConfig {
    let mut target_buttons = HashMap::new();

    // 配置"我"按钮
    target_buttons.insert(
        "我".to_string(),
        NavigationButtonConfig {
            text: Some("我".to_string()),
            content_desc: Some("我".to_string()),
            resource_id_pattern: None,
            class_name: Some("android.widget.TextView".to_string()),
            must_clickable: true,
            position_in_bar: Some(0.8), // 在导航栏右侧位置
        },
    );

    // 配置"首页"按钮
    target_buttons.insert(
        "首页".to_string(),
        NavigationButtonConfig {
            text: Some("首页".to_string()),
            content_desc: Some("首页".to_string()),
            resource_id_pattern: None,
            class_name: Some("android.widget.TextView".to_string()),
            must_clickable: true,
            position_in_bar: Some(0.1), // 在导航栏左侧位置
        },
    );

    NavigationBarDetectionConfig {
        package_name: "com.xingin.xhs".to_string(),
        bar_position: NavigationBarPosition {
            bar_type: NavigationBarType::Bottom,
            position_ratio: PositionRatio {
                start: 0.9, // 屏幕底部90%位置开始
                end: 1.0,   // 到屏幕底部100%
            },
            size_ratio: 0.07,        // 高度占屏幕7%
            min_size_threshold: 100, // 最小高度100像素
        },
        target_buttons,
        enable_smart_adaptation: true,
    }
}

/// Tauri命令：检测导航栏并点击目标按钮
#[command]
pub async fn detect_and_click_navigation_button(
    device_id: String,
    app_package: String,
    button_name: String,
    bar_type: String, // "bottom", "top", "side", "floating"
) -> Result<NavigationDetectionResult, String> {
    info!(
        "开始导航栏检测，设备: {}, 应用: {}, 按钮: {}",
        device_id, app_package, button_name
    );

    let detector = NavigationBarDetector::new(device_id.clone());

    // 根据应用包名创建配置
    let config = match app_package.as_str() {
        _ => {
            // 通用配置
            let mut target_buttons = HashMap::new();
            target_buttons.insert(
                button_name.clone(),
                NavigationButtonConfig {
                    text: Some(button_name.clone()),
                    content_desc: Some(button_name.clone()),
                    resource_id_pattern: None,
                    class_name: None,
                    must_clickable: true,
                    position_in_bar: None,
                },
            );

            NavigationBarDetectionConfig {
                package_name: app_package,
                bar_position: NavigationBarPosition {
                    bar_type: match bar_type.as_str() {
                        "top" => NavigationBarType::Top,
                        "side" => NavigationBarType::Side,
                        "floating" => NavigationBarType::FloatingAction,
                        _ => NavigationBarType::Bottom,
                    },
                    position_ratio: PositionRatio {
                        start: if bar_type == "bottom" { 0.9 } else { 0.0 },
                        end: if bar_type == "bottom" { 1.0 } else { 0.2 },
                    },
                    size_ratio: 0.07,
                    min_size_threshold: 80,
                },
                target_buttons,
                enable_smart_adaptation: true,
            }
        }
    };

    // 执行检测
    match detector
        .detect_navigation_bar(config.clone(), button_name.clone())
        .await
    {
        Ok(mut result) => {
            // 如果找到目标按钮，尝试点击
            if let Some(ref target_button) = result.target_button {
                match detector
                    .click_navigation_button(&device_id, &target_button.name, &config)
                    .await
                {
                    Ok(_) => {
                        result.message = format!("成功点击导航按钮: {}", button_name);
                        info!("导航按钮点击成功: {}", button_name);
                    }
                    Err(e) => {
                        result.success = false;
                        result.message = format!("导航按钮点击失败: {}", e);
                        error!("导航按钮点击失败: {}", e);
                    }
                }
            }
            Ok(result)
        }
        Err(e) => {
            error!("导航栏检测失败: {}", e);
            Err(format!("导航栏检测失败: {}", e))
        }
    }
}

/// Tauri命令：仅检测导航栏（不点击）
#[command]
pub async fn detect_navigation_bar(
    device_id: String,
    app_package: String,
    bar_type: String,
) -> Result<NavigationDetectionResult, String> {
    let detector = NavigationBarDetector::new(device_id);

    let config = NavigationBarDetectionConfig {
        package_name: app_package,
        bar_position: NavigationBarPosition {
            bar_type: match bar_type.as_str() {
                "top" => NavigationBarType::Top,
                "side" => NavigationBarType::Side,
                "floating" => NavigationBarType::FloatingAction,
                _ => NavigationBarType::Bottom,
            },
            position_ratio: PositionRatio {
                start: if bar_type == "bottom" { 0.85 } else { 0.0 },
                end: if bar_type == "bottom" { 1.0 } else { 0.25 },
            },
            size_ratio: 0.1,
            min_size_threshold: 60,
        },
        target_buttons: HashMap::new(),
        enable_smart_adaptation: true,
    };

    match detector.detect_navigation_bar(config, String::new()).await {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("导航栏检测失败: {}", e)),
    }
}

#[command]
pub async fn click_navigation_button(
    device_id: String,
    button_text: String,
    config: NavigationBarDetectionConfig,
) -> Result<bool, String> {
    info!("点击导航按钮 '{}' 在设备 '{}'", button_text, device_id);

    let detector = NavigationBarDetector::new(device_id.clone());
    detector
        .click_navigation_button(&device_id, &button_text, &config)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub fn get_navigation_configs() -> Vec<NavigationBarDetectionConfig> {
    vec![
        create_xiaohongshu_navigation_config(),
        NavigationBarDetector::create_generic_bottom_navigation_config(),
    ]
}
