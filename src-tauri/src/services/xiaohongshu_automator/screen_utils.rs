use anyhow::Result;
use tracing::info;
use super::core::XiaohongshuAutomator;

pub trait ScreenUtilsExt {
    async fn get_screen_info(&self) -> Result<(u32, u32)>;
    async fn get_adaptive_avatar_coords(&self) -> Result<(i32, i32)>;
    async fn find_discover_friends_coords(&self) -> Result<(i32, i32)>;
    async fn find_contacts_option_coords(&self) -> Result<(i32, i32)>;
    async fn parse_menu_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)>;
    async fn parse_discover_friends_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)>;
    async fn parse_contacts_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)>;
    fn extract_bounds_from_line(&self, line: &str) -> Option<(i32, i32, i32, i32)>;
}

impl ScreenUtilsExt for XiaohongshuAutomator {
    /// 获取屏幕信息
    async fn get_screen_info(&self) -> Result<(u32, u32)> {
        crate::screenshot_service::ScreenshotService::get_screen_resolution(&self.device_id).await
            .map_err(|e| anyhow::anyhow!("获取屏幕分辨率失败: {}", e))
    }
    
    /// 获取自适应头像坐标 - 增强设备适配版
    async fn get_adaptive_avatar_coords(&self) -> Result<(i32, i32)> {
        info!("🎯 智能计算自适应头像坐标...");
        
        let screen_info = self.get_screen_info().await?;
        let scale_x = screen_info.0 as f32 / 1080.0;
        let scale_y = screen_info.1 as f32 / 2316.0; // 使用UI可视区域高度
        
        // 获取UI dump进行动态分析
        let ui_dump = self.get_ui_dump().await?;
        info!("📱 UI内容长度: {} 字符", ui_dump.len());
        
        // 策略1: 从UI中查找菜单按钮
        if let Some(coords) = self.parse_menu_from_ui(&ui_dump).await {
            info!("✅ 从UI动态解析到菜单按钮坐标: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 策略2: 多候选坐标适配（基于不同设备的实测数据）
        let base_candidates = vec![
            // 标准位置 - 基于ADB实测
            (81, 150, "标准菜单位置 - 基于XML解析 bounds=[27,96][135,204]"),
            (60, 100, "原版头像位置 - 旧设备验证"),
            (81, 120, "菜单按钮上偏移"),
            (81, 180, "菜单按钮下偏移"),
            (50, 150, "左偏移菜单位置"),
            (100, 150, "右偏移菜单位置"),
        ];
        
        // 应用屏幕适配
        let adapted_candidates: Vec<(i32, i32, &str)> = base_candidates.into_iter()
            .map(|(x, y, desc)| {
                let adapted_x = (x as f32 * scale_x).round() as i32;
                let adapted_y = (y as f32 * scale_y).round() as i32;
                // 确保坐标在合理范围内
                let final_x = adapted_x.max(20).min(200);
                let final_y = adapted_y.max(50).min(300);
                (final_x, final_y, desc)
            })
            .collect();
        
        info!("📱 屏幕: {}x{} (UI区域), 适配比例: {:.3}x{:.3}", 
              screen_info.0, screen_info.1, scale_x, scale_y);
        info!("🎯 准备测试 {} 个菜单按钮候选位置:", adapted_candidates.len());
        
        for (i, (x, y, desc)) in adapted_candidates.iter().enumerate() {
            info!("   候选{}: {} -> ({}, {})", i + 1, desc, x, y);
        }
        
        // 返回第一个候选坐标（最可能的位置）
        let (final_x, final_y, desc) = adapted_candidates[0];
        info!("✓ 选择菜单按钮坐标: {} -> ({}, {})", desc, final_x, final_y);
        
        Ok((final_x, final_y))
    }

    /// 查找发现好友按钮坐标
    async fn find_discover_friends_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 智能查找发现好友选项坐标...");
        
        let ui_dump = self.get_ui_dump().await?;
        
        // 首先尝试从UI动态解析
        if let Some(coords) = self.parse_discover_friends_from_ui(&ui_dump).await {
            info!("✅ 从UI动态解析到发现好友坐标: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 备用策略：使用自适应坐标
        let screen_info = self.get_screen_info().await?;
        let scale_x = screen_info.0 as f32 / 1080.0;
        let scale_y = screen_info.1 as f32 / 2316.0;
        
        // 基于真机测试的基准坐标
        let base_coords = [(270, 168), (250, 180), (300, 160)];
        
        for (base_x, base_y) in &base_coords {
            let adapted_x = (*base_x as f32 * scale_x).round() as i32;
            let adapted_y = (*base_y as f32 * scale_y).round() as i32;
            
            if adapted_x > 50 && adapted_x < 500 && adapted_y > 50 && adapted_y < 800 {
                info!("✅ 使用适配坐标: ({}, {})", adapted_x, adapted_y);
                return Ok((adapted_x, adapted_y));
            }
        }
        
        Err(anyhow::anyhow!("无法找到发现好友按钮坐标"))
    }

    /// 查找通讯录选项坐标
    async fn find_contacts_option_coords(&self) -> Result<(i32, i32)> {
        info!("🔍 智能查找通讯录选项坐标（增强设备适配版）...");
        
        let ui_dump = self.get_ui_dump().await?;
        
        // 首先尝试从UI动态解析
        if let Some(coords) = self.parse_contacts_from_ui(&ui_dump).await {
            info!("✅ 从UI动态解析到通讯录坐标: ({}, {})", coords.0, coords.1);
            return Ok(coords);
        }
        
        // 备用策略：使用屏幕适配的基准坐标
        let screen_info = self.get_screen_info().await?;
        let scale_x = screen_info.0 as f32 / 1080.0;
        let scale_y = screen_info.1 as f32 / 2316.0;
        
        // 基于不同设备的基准坐标
        let base_coords = [
            (539, 330, "主要通讯录位置"),
            (520, 340, "通讯录位置变体1"),
            (560, 320, "通讯录位置变体2"),
            (540, 350, "通讯录位置变体3"),
        ];
        
        info!("📱 屏幕: {}x{}, 适配比例: {:.3}x{:.3}", 
              screen_info.0, screen_info.1, scale_x, scale_y);
        
        for (base_x, base_y, desc) in &base_coords {
            let adapted_x = (*base_x as f32 * scale_x).round() as i32;
            let adapted_y = (*base_y as f32 * scale_y).round() as i32;
            
            // 确保坐标在合理范围内
            if adapted_x > 200 && adapted_x < 800 && adapted_y > 200 && adapted_y < 600 {
                info!("✅ 使用适配坐标: {} -> ({}, {})", desc, adapted_x, adapted_y);
                return Ok((adapted_x, adapted_y));
            }
        }
        
        Err(anyhow::anyhow!("无法找到通讯录选项坐标"))
    }

    /// 从UI内容中动态解析菜单按钮坐标
    async fn parse_menu_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)> {
        info!("🔧 动态解析UI XML内容查找菜单按钮...");
        
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        for (i, line) in lines.iter().enumerate() {
            if line.contains("菜单") || line.contains("content-desc=\"菜单\"") {
                info!("📍 找到包含'菜单'的行 {}: {}", i, line.trim());
                
                if let Some(bounds) = self.extract_bounds_from_line(line) {
                    let center_x = (bounds.0 + bounds.2) / 2;
                    let center_y = (bounds.1 + bounds.3) / 2;
                    info!("✅ 解析到菜单边界: {:?}, 中心点: ({}, {})", bounds, center_x, center_y);
                    
                    if center_x > 20 && center_x < 200 && center_y > 50 && center_y < 300 {
                        return Some((center_x, center_y));
                    }
                }
            }
        }
        None
    }

    /// 从UI内容中解析发现好友按钮坐标
    async fn parse_discover_friends_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)> {
        info!("🔧 解析UI XML内容查找发现好友按钮...");
        
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        // 首先尝试精确匹配"发现好友"
        for (i, line) in lines.iter().enumerate() {
            if line.contains("发现好友") {
                info!("📍 找到包含'发现好友'的行 {}: {}", i, line.trim());
                
                for check_line in &lines[i.saturating_sub(2)..=(i + 2).min(lines.len() - 1)] {
                    if let Some(bounds) = self.extract_bounds_from_line(check_line) {
                        let center_x = (bounds.0 + bounds.2) / 2;
                        let center_y = (bounds.1 + bounds.3) / 2;
                        
                        if center_x > 50 && center_x < 500 && center_y > 50 && center_y < 800 {
                            return Some((center_x, center_y));
                        }
                    }
                }
            }
        }
        None
    }

    /// 从UI内容中解析通讯录按钮坐标
    async fn parse_contacts_from_ui(&self, ui_dump: &str) -> Option<(i32, i32)> {
        info!("🔧 动态解析UI XML内容查找通讯录按钮...");
        
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        // 查找包含"通讯录"的可点击元素
        for (i, line) in lines.iter().enumerate() {
            if (line.contains("通讯录") || line.contains("联系人")) && 
               (line.contains("clickable=\"true\"") || line.contains("TextView")) {
                info!("📍 找到包含'通讯录'的可点击元素行 {}: {}", i, line.trim());
                
                if let Some(bounds) = self.extract_bounds_from_line(line) {
                    let center_x = (bounds.0 + bounds.2) / 2;
                    let center_y = (bounds.1 + bounds.3) / 2;
                    
                    // 验证坐标合理性（通讯录按钮通常在中间区域）
                    if center_x > 200 && center_x < 800 && center_y > 200 && center_y < 600 {
                        info!("✅ 解析到通讯录按钮坐标: ({}, {})", center_x, center_y);
                        return Some((center_x, center_y));
                    }
                }
            }
        }
        
        None
    }

    /// 从XML行中提取bounds属性
    fn extract_bounds_from_line(&self, line: &str) -> Option<(i32, i32, i32, i32)> {
        if let Some(bounds_start) = line.find("bounds=\"[") {
            let bounds_part = &line[bounds_start + 9..];
            if let Some(bounds_end) = bounds_part.find('"') {
                let bounds_str = &bounds_part[..bounds_end];
                
                if let Some(middle) = bounds_str.find("][") {
                    let left_top = &bounds_str[..middle];
                    let right_bottom = &bounds_str[middle + 2..];
                    
                    if let (Some(comma1), Some(comma2)) = (left_top.find(','), right_bottom.find(',')) {
                        let left_str = &left_top[..comma1];
                        let top_str = &left_top[comma1 + 1..];
                        let right_str = &right_bottom[..comma2];
                        let bottom_str = &right_bottom[comma2 + 1..];
                        
                        if let (Ok(left), Ok(top), Ok(right), Ok(bottom)) = (
                            left_str.parse::<i32>(),
                            top_str.parse::<i32>(),
                            right_str.parse::<i32>(),
                            bottom_str.parse::<i32>()
                        ) {
                            return Some((left, top, right, bottom));
                        }
                    }
                }
            }
        }
        None
    }
}