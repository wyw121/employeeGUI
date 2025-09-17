use anyhow::{Context, Result};
use tokio::time::{sleep, Duration};
use tracing::{info, warn, error};
use std::collections::HashSet;

use super::{
    core::XiaohongshuAutomator,
    types::{FollowResult, FollowStatus, ButtonState},
    screen_utils::ScreenUtilsExt,
    navigation::NavigationExt,
    page_recognition::PageRecognitionExt,
};

/// 自动关注相关功能扩展 trait
pub trait FollowAutomationExt {
    async fn batch_follow_from_contacts(&self, contacts: Vec<String>, max_follows: usize) -> Result<Vec<FollowResult>>;
    async fn follow_single_contact(&self, name: &str) -> Result<FollowResult>;
    async fn find_and_follow_user(&self, user_name: &str, max_scroll: usize) -> Result<FollowResult>;
    async fn follow_user_in_current_view(&self, target_user: &str) -> Result<FollowResult>;
    async fn extract_follow_candidates(&self, ui_dump: &str) -> Vec<(String, i32, i32, ButtonState)>;
    async fn intelligent_scroll_and_search(&self, target_user: &str, max_attempts: usize) -> Result<bool>;
    async fn check_follow_completion(&self, user_name: &str) -> Result<bool>;
    async fn handle_follow_errors(&self, error_type: &str) -> Result<()>;
    async fn batch_follow_all_contacts_in_page(&self, max_follows: usize) -> Result<Vec<FollowResult>>;
    async fn is_already_followed(&self, ui_dump: &str, contact_name: &str) -> bool;
}

impl FollowAutomationExt for XiaohongshuAutomator {
    /// 批量关注联系人
    async fn batch_follow_from_contacts(&self, contacts: Vec<String>, max_follows: usize) -> Result<Vec<FollowResult>> {
        info!("🚀 开始批量关注操作，目标联系人数量: {}, 最大关注数: {}", contacts.len(), max_follows);
        
        let mut results = Vec::new();
        let mut successful_follows = 0;
        let mut followed_users = HashSet::new();
        
        for (index, contact_name) in contacts.iter().enumerate() {
            if successful_follows >= max_follows {
                info!("✅ 已达到最大关注数限制: {}", max_follows);
                break;
            }
            
            // 跳过已关注的用户
            if followed_users.contains(contact_name) {
                info!("⏭️ 跳过已关注用户: {}", contact_name);
                continue;
            }
            
            info!("🎯 [{}/{}] 开始关注联系人: {}", index + 1, contacts.len(), contact_name);
            
            match self.follow_single_contact(contact_name).await {
                Ok(result) => {
                    match result.status {
                        FollowStatus::Success => {
                            successful_follows += 1;
                            followed_users.insert(contact_name.clone());
                            info!("✅ 成功关注: {} (第{}个)", contact_name, successful_follows);
                        }
                        FollowStatus::AlreadyFollowed => {
                            followed_users.insert(contact_name.clone());
                            info!("ℹ️ 用户已关注: {}", contact_name);
                        }
                        _ => {
                            warn!("⚠️ 关注失败: {} - {}", contact_name, result.message);
                        }
                    }
                    results.push(result);
                }
                Err(e) => {
                    error!("❌ 关注 {} 时发生错误: {}", contact_name, e);
                    results.push(FollowResult {
                        user_name: contact_name.clone(),
                        status: FollowStatus::Error,
                        message: format!("执行错误: {}", e),
                        timestamp: chrono::Utc::now(),
                    });
                }
            }
            
            // 关注间隔，避免操作过快
            if index < contacts.len() - 1 {
                let delay = if successful_follows > 0 { 3000 } else { 2000 };
                info!("⏳ 等待 {}ms 后继续下一个关注操作", delay);
                sleep(Duration::from_millis(delay)).await;
            }
        }
        
        info!("🎉 批量关注完成！成功关注: {}/{}, 总处理: {}", 
              successful_follows, max_follows, results.len());
        
        Ok(results)
    }

    /// 关注单个联系人
    async fn follow_single_contact(&self, name: &str) -> Result<FollowResult> {
        info!("🎯 开始关注单个联系人: {}", name);
        
        // 1. 导航到发现好友页面
        self.navigate_to_discover_friends().await
            .context("导航到发现好友页面失败")?;
        
        sleep(Duration::from_millis(2000)).await;
        
        // 2. 导航到通讯录选项
        self.navigate_to_contacts_option().await
            .context("导航到通讯录选项失败")?;
        
        sleep(Duration::from_millis(3000)).await;
        
        // 3. 在当前页面查找并关注用户
        match self.find_and_follow_user(name, 10).await {
            Ok(result) => Ok(result),
            Err(e) => {
                warn!("在通讯录中查找用户 {} 失败: {}", name, e);
                Ok(FollowResult {
                    user_name: name.to_string(),
                    status: FollowStatus::NotFound,
                    message: format!("未找到用户: {}", e),
                    timestamp: chrono::Utc::now(),
                })
            }
        }
    }

    /// 查找并关注用户（优化版本 - 直接批量关注通讯录页面中的所有用户）
    async fn find_and_follow_user(&self, user_name: &str, _max_scroll: usize) -> Result<FollowResult> {
        info!("🔍 在通讯录页面中查找用户: {}", user_name);
        
        // 获取当前UI内容
        let ui_dump = self.get_ui_dump().await
            .context("获取UI内容失败")?;
            
        // 使用新的关注按钮查找方法
        let follow_buttons = self.find_follow_buttons(&ui_dump).await
            .context("查找关注按钮失败")?;
            
        info!("👥 在通讯录页面找到 {} 个可关注的联系人", follow_buttons.len());
        
        // 查找目标用户
        for (contact_name, button_coord) in follow_buttons {
            if self.is_name_match(&contact_name, user_name) {
                info!("🎯 找到匹配用户: {} -> 坐标: {:?}", contact_name, button_coord);
                
                // 点击关注按钮
                let (center_x, center_y) = button_coord.center();
                self.click_coordinates(center_x, center_y).await
                    .context("点击关注按钮失败")?;
                
                sleep(Duration::from_millis(2000)).await;
                
                // 验证关注结果
                if self.check_follow_completion(user_name).await? {
                    return Ok(FollowResult {
                        user_name: user_name.to_string(),
                        status: FollowStatus::Success,
                        message: "关注成功".to_string(),
                        timestamp: chrono::Utc::now(),
                    });
                } else {
                    return Ok(FollowResult {
                        user_name: user_name.to_string(),
                        status: FollowStatus::Failed,
                        message: "关注操作执行但状态未确认".to_string(),
                        timestamp: chrono::Utc::now(),
                    });
                }
            }
        }
        
        Ok(FollowResult {
            user_name: user_name.to_string(),
            status: FollowStatus::NotFound,
            message: "在当前页面未找到用户".to_string(),
            timestamp: chrono::Utc::now(),
        })
    }

    /// 批量关注通讯录页面中的所有联系人
    async fn batch_follow_all_contacts_in_page(&self, max_follows: usize) -> Result<Vec<FollowResult>> {
        info!("🚀 开始批量关注通讯录页面中的所有联系人，最大关注数: {}", max_follows);
        
        let mut results = Vec::new();
        let mut successful_follows = 0;
        
        // 获取当前UI内容
        let ui_dump = self.get_ui_dump().await
            .context("获取UI内容失败")?;
            
        // 查找所有关注按钮
        let follow_buttons = self.find_follow_buttons(&ui_dump).await
            .context("查找关注按钮失败")?;
        
        info!("👥 在通讯录页面找到 {} 个可关注的联系人", follow_buttons.len());
        
        for (index, (contact_name, button_coord)) in follow_buttons.iter().enumerate() {
            if successful_follows >= max_follows {
                info!("✅ 已达到最大关注数限制: {}", max_follows);
                break;
            }
            
            info!("🎯 [{}/{}] 开始关注联系人: {}", index + 1, follow_buttons.len(), contact_name);
            
            // 检查是否已经是"已关注"状态
            if self.is_already_followed(&ui_dump, contact_name).await {
                info!("ℹ️ 用户已关注: {}", contact_name);
                results.push(FollowResult {
                    user_name: contact_name.clone(),
                    status: FollowStatus::AlreadyFollowed,
                    message: "用户已关注".to_string(),
                    timestamp: chrono::Utc::now(),
                });
                continue;
            }
            
            // 点击关注按钮
            let (center_x, center_y) = button_coord.center();
            match self.click_coordinates(center_x, center_y).await {
                Ok(_) => {
                    sleep(Duration::from_millis(1500)).await;
                    successful_follows += 1;
                    
                    results.push(FollowResult {
                        user_name: contact_name.clone(),
                        status: FollowStatus::Success,
                        message: "关注成功".to_string(),
                        timestamp: chrono::Utc::now(),
                    });
                    
                    info!("✅ 成功关注: {} (第{}个)", contact_name, successful_follows);
                }
                Err(e) => {
                    error!("❌ 关注 {} 时发生错误: {}", contact_name, e);
                    results.push(FollowResult {
                        user_name: contact_name.clone(),
                        status: FollowStatus::Error,
                        message: format!("点击错误: {}", e),
                        timestamp: chrono::Utc::now(),
                    });
                }
            }
            
            // 关注间隔，避免操作过快
            if index < follow_buttons.len() - 1 && successful_follows < max_follows {
                info!("⏳ 等待 2s 后继续下一个关注操作");
                sleep(Duration::from_millis(2000)).await;
            }
        }
        
        info!("🎉 批量关注完成！成功关注: {}/{}, 总处理: {}", 
              successful_follows, max_follows, results.len());
        
        Ok(results)
    }

    /// 检查用户是否已经关注
    async fn is_already_followed(&self, ui_dump: &str, contact_name: &str) -> bool {
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        for (i, line) in lines.iter().enumerate() {
            // 查找联系人姓名
            if line.contains(&format!("text=\"{}\"", contact_name)) {
                // 在该联系人附近查找"已关注"按钮
                let search_start = i;
                let search_end = std::cmp::min(i + 10, lines.len());
                
                for j in search_start..search_end {
                    if let Some(check_line) = lines.get(j) {
                        if check_line.contains("text=\"已关注\"") {
                            return true;
                        }
                    }
                }
            }
        }
        
        false
    }

    /// 在当前视图中关注用户
    async fn follow_user_in_current_view(&self, target_user: &str) -> Result<FollowResult> {
        let ui_dump = self.get_ui_dump().await?;
        let candidates = self.extract_follow_candidates(&ui_dump).await;
        
        info!("👥 在当前视图中找到 {} 个候选用户", candidates.len());
        
        for (user_name, x, y, button_state) in candidates {
            // 模糊匹配用户名
            if self.is_name_match(&user_name, target_user) {
                info!("🎯 找到匹配用户: {} (坐标: {}, {})", user_name, x, y);
                
                match button_state {
                    ButtonState::AlreadyFollowed => {
                        return Ok(FollowResult {
                            user_name: target_user.to_string(),
                            status: FollowStatus::AlreadyFollowed,
                            message: "用户已关注".to_string(),
                            timestamp: chrono::Utc::now(),
                        });
                    }
                    ButtonState::CanFollow => {
                        // 点击关注按钮
                        self.click_coordinates(x, y).await
                            .context("点击关注按钮失败")?;
                        
                        sleep(Duration::from_millis(2000)).await;
                        
                        // 验证关注结果
                        if self.check_follow_completion(target_user).await? {
                            return Ok(FollowResult {
                                user_name: target_user.to_string(),
                                status: FollowStatus::Success,
                                message: "关注成功".to_string(),
                                timestamp: chrono::Utc::now(),
                            });
                        } else {
                            return Ok(FollowResult {
                                user_name: target_user.to_string(),
                                status: FollowStatus::Failed,
                                message: "关注操作执行但状态未确认".to_string(),
                                timestamp: chrono::Utc::now(),
                            });
                        }
                    }
                    ButtonState::Loading => {
                        info!("⏳ 按钮显示加载中，等待后重试");
                        sleep(Duration::from_millis(3000)).await;
                        continue;
                    }
                    ButtonState::Unknown => {
                        warn!("❓ 按钮状态未知，尝试点击");
                        self.click_coordinates(x, y).await
                            .context("点击未知状态按钮失败")?;
                        sleep(Duration::from_millis(2000)).await;
                    }
                }
            }
        }
        
        Err(anyhow::anyhow!("在当前视图中未找到用户: {}", target_user))
    }

    /// 从UI内容中提取关注候选
    async fn extract_follow_candidates(&self, ui_dump: &str) -> Vec<(String, i32, i32, ButtonState)> {
        let mut candidates = Vec::new();
        let lines: Vec<&str> = ui_dump.lines().collect();
        
        info!("🔍 开始解析UI内容，总行数: {}", lines.len());
        
        let mut current_user = None;
        let mut user_bounds = None;
        
        for (_i, line) in lines.iter().enumerate() {
            // 查找用户名
            if line.contains("android.widget.TextView") && line.contains("text=\"") {
                if let Some(text) = self.extract_text_from_line(line) {
                    // 过滤掉明显不是用户名的文本
                    if !text.is_empty() && 
                       !text.contains("关注") && 
                       !text.contains("粉丝") && 
                       !text.contains("获赞") &&
                       text.len() > 1 && text.len() < 20 {
                        
                        if let Some(bounds) = self.extract_bounds_from_line(line) {
                            current_user = Some(text);
                            user_bounds = Some(bounds);
                            info!("👤 发现用户: {} at bounds={:?}", current_user.as_ref().unwrap(), bounds);
                        }
                    }
                }
            }
            
            // 查找关注按钮
            if let (Some(ref user), Some(user_bounds_val)) = (&current_user, user_bounds) {
                if line.contains("关注") || line.contains("follow") || line.contains("Follow") {
                    if let Some(button_bounds) = self.extract_bounds_from_line(line) {
                        // 检查按钮是否在用户名附近
                        let user_center_y = (user_bounds_val.1 + user_bounds_val.3) / 2;
                        let button_center_y = (button_bounds.1 + button_bounds.3) / 2;
                        let y_distance = (user_center_y - button_center_y).abs();
                        
                        if y_distance < 200 { // 按钮在用户名附近
                            let button_center_x = (button_bounds.0 + button_bounds.2) / 2;
                            let button_center_y = (button_bounds.1 + button_bounds.3) / 2;
                            
                            // 分析按钮状态
                            let button_text = self.extract_text_from_line(line).unwrap_or_default();
                            let button_state = self.analyze_button_state(&button_text);
                            
                            candidates.push((
                                user.clone(),
                                button_center_x,
                                button_center_y,
                                button_state
                            ));
                            
                            info!("🔘 找到按钮: {} -> {} at ({}, {})", user, button_text, button_center_x, button_center_y);
                            
                            // 重置，寻找下一个用户
                            current_user = None;
                            user_bounds = None;
                        }
                    }
                }
            }
        }
        
        info!("✅ 提取完成，找到 {} 个关注候选", candidates.len());
        candidates
    }

    /// 智能滚动搜索
    async fn intelligent_scroll_and_search(&self, target_user: &str, max_attempts: usize) -> Result<bool> {
        info!("🔍 开始智能滚动搜索用户: {}", target_user);
        
        let mut attempts = 0;
        let mut last_content_hash = 0u64;
        let mut stable_count = 0;
        
        while attempts < max_attempts {
            // 获取当前页面内容hash
            let current_hash = self.get_ui_content_hash().await?;
            
            // 检查页面是否有变化
            if current_hash == last_content_hash {
                stable_count += 1;
                if stable_count >= 3 {
                    info!("📄 页面内容已稳定，可能到达底部");
                    break;
                }
            } else {
                stable_count = 0;
                last_content_hash = current_hash;
            }
            
            // 检查当前页面是否包含目标用户
            let ui_dump = self.get_ui_dump().await?;
            if ui_dump.contains(target_user) {
                info!("✅ 在第{}次尝试中找到目标用户", attempts + 1);
                return Ok(true);
            }
            
            // 继续滚动
            self.scroll_down().await?;
            attempts += 1;
            
            sleep(Duration::from_millis(2000)).await;
        }
        
        info!("❌ 经过{}次滚动未找到用户: {}", attempts, target_user);
        Ok(false)
    }

    /// 检查关注完成状态
    async fn check_follow_completion(&self, user_name: &str) -> Result<bool> {
        sleep(Duration::from_millis(1500)).await;
        
        let ui_dump = self.get_ui_dump().await?;
        let candidates = self.extract_follow_candidates(&ui_dump).await;
        
        for (name, _, _, state) in candidates {
            if self.is_name_match(&name, user_name) {
                match state {
                    ButtonState::AlreadyFollowed => {
                        info!("✅ 确认用户 {} 已关注", user_name);
                        return Ok(true);
                    }
                    _ => {
                        info!("⚠️ 用户 {} 关注状态未确认: {:?}", user_name, state);
                        return Ok(false);
                    }
                }
            }
        }
        
        warn!("❓ 无法确认用户 {} 的关注状态", user_name);
        Ok(false)
    }

    /// 处理关注错误
    async fn handle_follow_errors(&self, error_type: &str) -> Result<()> {
        info!("🔧 处理关注错误: {}", error_type);
        
        match error_type {
            "network_error" => {
                info!("🌐 网络错误，等待5秒后重试");
                sleep(Duration::from_millis(5000)).await;
            }
            "rate_limit" => {
                info!("⏱️ 触发频率限制，等待10秒");
                sleep(Duration::from_millis(10000)).await;
            }
            "ui_changed" => {
                info!("🔄 UI发生变化，重新获取页面状态");
                self.get_ui_dump().await?;
                sleep(Duration::from_millis(2000)).await;
            }
            _ => {
                info!("❓ 未知错误类型，等待3秒");
                sleep(Duration::from_millis(3000)).await;
            }
        }
        
        Ok(())
    }
}

impl XiaohongshuAutomator {
    /// 从XML行中提取文本内容
    pub fn extract_text_from_line(&self, line: &str) -> Option<String> {
        if let Some(start) = line.find("text=\"") {
            let text_part = &line[start + 6..];
            if let Some(end) = text_part.find('"') {
                let text = text_part[..end].trim().to_string();
                if !text.is_empty() {
                    return Some(text);
                }
            }
        }
        None
    }

    /// 判断用户名是否匹配（支持模糊匹配）
    fn is_name_match(&self, found_name: &str, target_name: &str) -> bool {
        let found_clean = found_name.trim().to_lowercase();
        let target_clean = target_name.trim().to_lowercase();
        
        // 精确匹配
        if found_clean == target_clean {
            return true;
        }
        
        // 包含匹配
        if found_clean.contains(&target_clean) || target_clean.contains(&found_clean) {
            return true;
        }
        
        // 去除特殊字符后匹配
        let found_alpha: String = found_clean.chars().filter(|c| c.is_alphanumeric()).collect();
        let target_alpha: String = target_clean.chars().filter(|c| c.is_alphanumeric()).collect();
        
        if !found_alpha.is_empty() && !target_alpha.is_empty() {
            if found_alpha == target_alpha || 
               found_alpha.contains(&target_alpha) || 
               target_alpha.contains(&found_alpha) {
                return true;
            }
        }
        
        false
    }

    /// 智能判断按钮状态
    fn analyze_button_state(&self, button_text: &str) -> ButtonState {
        let text_lower = button_text.to_lowercase();
        
        if text_lower.contains("已关注") || 
           text_lower.contains("following") || 
           text_lower.contains("已follow") ||
           text_lower.contains("取消关注") {
            ButtonState::AlreadyFollowed
        } else if text_lower.contains("关注") || 
                  text_lower.contains("follow") ||
                  text_lower.contains("+ 关注") {
            ButtonState::CanFollow
        } else if text_lower.contains("加载") || 
                  text_lower.contains("loading") {
            ButtonState::Loading
        } else {
            ButtonState::Unknown
        }
    }

    /// 获取UI内容的简化hash，用于检测页面变化
    async fn get_ui_content_hash(&self) -> Result<u64> {
        let ui_content = self.get_ui_dump().await?;
        
        // 提取关键内容用于hash计算（忽略动态变化的部分）
        let key_content = ui_content
            .lines()
            .filter(|line| {
                // 只关注包含用户信息和按钮的行
                line.contains("关注") || 
                line.contains("用户") || 
                line.contains("用户名") ||
                line.contains("nickname") ||
                (line.contains("TextView") && line.contains("bounds"))
            })
            .collect::<Vec<_>>()
            .join("\n");
        
        // 计算简单hash
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        key_content.hash(&mut hasher);
        let hash = hasher.finish();
        
        info!("📊 计算页面内容hash: {}, 关键行数: {}", hash, key_content.lines().count());
        Ok(hash)
    }

    /// 向下滚动页面
    async fn scroll_down(&self) -> Result<()> {
        info!("📜 执行向下滚动操作");
        
        // 从屏幕中间向上滑动，距离适中以避免滑动过快
        let _output = self.execute_adb_command(&[
                "-s",
                &self.device_id,
                "shell",
                "input",
                "swipe",
                "500",
                "700", // 起始位置 (稍微降低起始位置)
                "500",
                "400",  // 结束位置 (增加滚动距离)
                "800", // 滑动时长(ms) (减少滑动时间使其更流畅)
            ])
            .context("滑动页面失败")?;

        info!("✓ 滚动操作完成");
        Ok(())
    }


}