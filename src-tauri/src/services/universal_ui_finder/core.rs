// 通用UI元素查找核心 - 适配所有Android应用的智能UI定位

use regex::Regex;
use std::collections::HashMap;
use crate::services::universal_ui_finder::{FindRequest, FindError};
use crate::services::universal_ui_finder::logger::{InteractiveLogger, ElementSearchStep, PreActionStep};

pub struct UIFinderCore {
    adb_path: String,
    device_id: Option<String>,
    screen_width: i32,
    screen_height: i32,
}

impl UIFinderCore {
    pub fn new(adb_path: &str, device_id: Option<String>) -> Result<Self, Box<dyn std::error::Error>> {
        let mut finder = Self {
            adb_path: adb_path.to_string(),
            device_id,
            screen_width: 1080, // 默认值
            screen_height: 1920,
        };
        
        // 动态获取屏幕尺寸
        if let Ok((width, height)) = finder.get_screen_size() {
            finder.screen_width = width;
            finder.screen_height = height;
        }
        
        Ok(finder)
    }
    
    /// 主要的UI元素查找方法 - 支持用户交互
    pub async fn find_element_with_guidance(&self, request: &FindRequest, logger: &mut InteractiveLogger) 
        -> Result<UniversalUIElement, FindError> {
        
        logger.log_element_search(&request.target_text, ElementSearchStep::Starting);
        
        // 执行预操作 (如展开侧边栏)
        if let Some(pre_actions) = &request.pre_actions {
            for action in pre_actions {
                self.execute_pre_action(action, logger).await?;
            }
        }
        
        let mut retry_count = 0;
        let max_retries = request.retry_count.unwrap_or(3);
        
        loop {
            // 步骤1: 获取UI布局
            logger.log_element_search(&request.target_text, ElementSearchStep::DumpingUI);
            let xml_content = self.get_ui_dump()?;
            
            // 步骤2: 解析XML
            logger.log_element_search(&request.target_text, ElementSearchStep::Parsing);
            let all_elements = self.parse_all_ui_elements(&xml_content)?;
            
            // 步骤3: 智能筛选匹配元素
            let candidates = self.filter_candidates(&all_elements, request);
            logger.log_element_search(&request.target_text, ElementSearchStep::Filtering(candidates.len()));
            
            if candidates.is_empty() {
                if retry_count >= max_retries {
                    logger.log_element_search(&request.target_text, ElementSearchStep::NotFound);
                    
                    if request.user_guidance {
                        // 用户交互在logger中处理
                        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                        retry_count = 0; // 重置重试计数
                        continue;
                    } else {
                        return Err(FindError::ElementNotFound(format!("未找到匹配元素: {}", request.target_text)));
                    }
                } else {
                    retry_count += 1;
                    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                    continue;
                }
            }
            
            // 步骤4: 选择最佳匹配
            let best_element = self.select_best_match(&candidates, request);
            let confidence = self.calculate_confidence(&best_element, request);
            
            if candidates.len() > 1 {
                logger.log_element_search(&request.target_text, ElementSearchStep::MultipleFound(candidates.len()));
            }
            
            logger.log_element_search(&request.target_text, ElementSearchStep::Found(best_element.clone(), confidence));
            
            return Ok(best_element);
        }
    }
    
    /// 获取屏幕尺寸
    fn get_screen_size(&self) -> Result<(i32, i32), Box<dyn std::error::Error>> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "wm", "size"]);
        
        let output = cmd.output()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // 解析 "Physical size: 1080x1920"
        let size_regex = Regex::new(r"Physical size: (\d+)x(\d+)").unwrap();
        if let Some(captures) = size_regex.captures(&output_str) {
            let width: i32 = captures.get(1).unwrap().as_str().parse()?;
            let height: i32 = captures.get(2).unwrap().as_str().parse()?;
            return Ok((width, height));
        }
        
        // 使用默认值
        Ok((1080, 1920))
    }
    
    /// 获取UI布局XML
    fn get_ui_dump(&self) -> Result<String, FindError> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["exec-out", "uiautomator", "dump", "/dev/stdout"]);
        
        let output = cmd.output().map_err(|e| {
            FindError::ExecutionFailed(format!("ADB命令执行失败: {}", e))
        })?;
        
        if !output.status.success() {
            return Err(FindError::ExecutionFailed(format!(
                "UI dump失败: {}", 
                String::from_utf8_lossy(&output.stderr)
            )));
        }
        
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }
    
    /// 解析所有UI元素
    fn parse_all_ui_elements(&self, xml_content: &str) -> Result<Vec<UniversalUIElement>, FindError> {
        let mut elements = Vec::new();
        
        // 使用正则表达式解析XML节点
        let node_regex = Regex::new(r#"<node[^>]*?(?:text="([^"]*)")?[^>]*?(?:content-desc="([^"]*)")?[^>]*?(?:bounds="(\[[^\]]+\])")?[^>]*?(?:clickable="([^"]*)")?[^>]*?(?:class="([^"]*)")?[^>]*?(?:package="([^"]*)")?[^>]*?/>"#).unwrap();
        
        for captures in node_regex.captures_iter(xml_content) {
            let text = captures.get(1).map_or(String::new(), |m| m.as_str().to_string());
            let content_desc = captures.get(2).map_or(String::new(), |m| m.as_str().to_string());
            let bounds_str = captures.get(3).map_or(String::new(), |m| m.as_str().to_string());
            let clickable = captures.get(4).map_or(false, |m| m.as_str() == "true");
            let class_name = captures.get(5).map_or(String::new(), |m| m.as_str().to_string());
            let package = captures.get(6).map_or(String::new(), |m| m.as_str().to_string());
            
            if let Ok(bounds) = self.parse_bounds(&bounds_str) {
                elements.push(UniversalUIElement {
                    text,
                    content_desc,
                    bounds,
                    clickable,
                    class_name,
                    package,
                    confidence: 0.0, // 稍后计算
                });
            }
        }
        
        Ok(elements)
    }
    
    /// 解析坐标边界
    fn parse_bounds(&self, bounds_str: &str) -> Result<UniversalElementBounds, Box<dyn std::error::Error>> {
        // 解析 "[left,top][right,bottom]" 格式
        let bounds_regex = Regex::new(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]").unwrap();
        
        if let Some(captures) = bounds_regex.captures(bounds_str) {
            let left: i32 = captures.get(1).unwrap().as_str().parse()?;
            let top: i32 = captures.get(2).unwrap().as_str().parse()?;
            let right: i32 = captures.get(3).unwrap().as_str().parse()?;
            let bottom: i32 = captures.get(4).unwrap().as_str().parse()?;
            
            Ok(UniversalElementBounds::new(left, top, right, bottom))
        } else {
            Err("无法解析bounds格式".into())
        }
    }
    
    /// 智能筛选候选元素
    fn filter_candidates(&self, all_elements: &[UniversalUIElement], request: &FindRequest) -> Vec<UniversalUIElement> {
        let mut candidates = Vec::new();
        
        for element in all_elements {
            if self.is_potential_match(element, request) {
                candidates.push(element.clone());
            }
        }
        
        candidates
    }
    
    /// 判断是否为潜在匹配
    fn is_potential_match(&self, element: &UniversalUIElement, request: &FindRequest) -> bool {
        // 1. 基本筛选：必须可点击
        if !element.clickable {
            return false;
        }
        
        // 2. 文本匹配 (精确 + 模糊)
        if !self.text_matches(&element.text, &request.target_text) &&
           !self.text_matches(&element.content_desc, &request.target_text) {
            return false;
        }
        
        // 3. 位置区域筛选
        if let Some(position_hint) = &request.position_hint {
            if !self.position_matches(&element.bounds, position_hint) {
                return false;
            }
        }
        
        // 4. 尺寸合理性检查
        if !self.size_reasonable(&element.bounds) {
            return false;
        }
        
        true
    }
    
    /// 文本匹配检查 (支持精确和模糊匹配)
    fn text_matches(&self, element_text: &str, target_text: &str) -> bool {
        if element_text.is_empty() {
            return false;
        }
        
        // 精确匹配
        if element_text == target_text {
            return true;
        }
        
        // 包含匹配
        if element_text.contains(target_text) || target_text.contains(element_text) {
            return true;
        }
        
        // 忽略空格和标点的匹配
        let clean_element = element_text.chars().filter(|c| c.is_alphanumeric()).collect::<String>();
        let clean_target = target_text.chars().filter(|c| c.is_alphanumeric()).collect::<String>();
        
        clean_element == clean_target || clean_element.contains(&clean_target)
    }
    
    /// 位置匹配检查
    fn position_matches(&self, bounds: &UniversalElementBounds, position_hint: &str) -> bool {
        match position_hint {
            "下方导航栏" | "底部导航栏" => {
                bounds.bottom > self.screen_height * 4 / 5
            },
            "上方导航栏" | "顶部导航栏" | "顶部工具栏" => {
                bounds.top < self.screen_height / 5
            },
            "左侧边栏" => {
                bounds.left < self.screen_width / 3 && bounds.right < self.screen_width * 2 / 3
            },
            "右侧边栏" => {
                bounds.left > self.screen_width / 3 && bounds.right > self.screen_width * 2 / 3
            },
            "中部区域" | "内容区域" => {
                bounds.top > self.screen_height / 5 && bounds.bottom < self.screen_height * 4 / 5
            },
            _ => true, // 未知位置提示，不筛选
        }
    }
    
    /// 尺寸合理性检查
    fn size_reasonable(&self, bounds: &UniversalElementBounds) -> bool {
        let width = bounds.width();
        let height = bounds.height();
        
        // 过滤掉过小或过大的元素
        width >= 30 && height >= 20 && 
        width <= self.screen_width && height <= 200
    }
    
    /// 选择最佳匹配元素
    fn select_best_match(&self, candidates: &[UniversalUIElement], request: &FindRequest) -> UniversalUIElement {
        let mut scored_candidates: Vec<(UniversalUIElement, f32)> = candidates.iter()
            .map(|element| {
                let score = self.calculate_confidence(element, request);
                (element.clone(), score)
            })
            .collect();
        
        // 按置信度排序
        scored_candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        
        // 返回最高分的元素
        scored_candidates.into_iter().next().unwrap().0
    }
    
    /// 计算匹配置信度
    fn calculate_confidence(&self, element: &UniversalUIElement, request: &FindRequest) -> f32 {
        let mut confidence = 0.0;
        
        // 1. 文本匹配得分 (最重要，权重50%)
        if element.text == request.target_text {
            confidence += 50.0; // 完全匹配
        } else if element.text.contains(&request.target_text) {
            confidence += 35.0; // 包含匹配
        } else if element.content_desc == request.target_text {
            confidence += 40.0; // 描述匹配
        } else if element.content_desc.contains(&request.target_text) {
            confidence += 25.0; // 描述包含匹配
        }
        
        // 2. 位置匹配得分 (权重25%)
        if let Some(position_hint) = &request.position_hint {
            if self.position_matches(&element.bounds, position_hint) {
                confidence += 25.0;
            }
        }
        
        // 3. 尺寸合适性得分 (权重15%)
        if self.size_reasonable(&element.bounds) {
            let width = element.bounds.width();
            let height = element.bounds.height();
            
            // 理想尺寸范围的元素获得更高分数
            if width >= 80 && width <= 300 && height >= 35 && height <= 80 {
                confidence += 15.0;
            } else if width >= 50 && width <= 500 && height >= 25 && height <= 120 {
                confidence += 10.0;
            } else {
                confidence += 5.0;
            }
        }
        
        // 4. 可点击性得分 (权重10%)
        if element.clickable {
            confidence += 10.0;
        }
        
        confidence
    }
    
    /// 执行预操作 (如展开侧边栏、滑动等)
    async fn execute_pre_action(&self, action: &str, logger: &mut InteractiveLogger) 
        -> Result<(), FindError> {
        
        logger.log_pre_action(action, PreActionStep::Starting);
        logger.log_pre_action(action, PreActionStep::Executing);
        
        match action {
            "右滑展开" => {
                self.swipe(50, 500, 300, 500, 300)?;
            },
            "左滑展开" => {
                self.swipe(1030, 500, 780, 500, 300)?;
            },
            "下拉刷新" => {
                self.swipe(540, 300, 540, 800, 500)?;
            },
            "上滑加载" => {
                self.swipe(540, 1600, 540, 1200, 500)?;
            },
            action if action.starts_with("等待") => {
                // 解析等待时间，如"等待动画500ms"
                let duration = if action.contains("ms") {
                    action.chars().filter(|c| c.is_numeric()).collect::<String>()
                        .parse().unwrap_or(800)
                } else {
                    800 // 默认等待时间
                };
                
                logger.log_pre_action(action, PreActionStep::Waiting(duration));
                tokio::time::sleep(tokio::time::Duration::from_millis(duration)).await;
            },
            _ => {
                logger.log_pre_action(action, PreActionStep::Failed(format!("未知预操作: {}", action)));
                return Err(FindError::ExecutionFailed(format!("不支持的预操作: {}", action)));
            }
        }
        
        logger.log_pre_action(action, PreActionStep::Completed);
        Ok(())
    }
    
    /// ADB滑动命令
    fn swipe(&self, x1: i32, y1: i32, x2: i32, y2: i32, duration: i32) -> Result<(), FindError> {
        let mut cmd = std::process::Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "input", "swipe", 
                  &x1.to_string(), &y1.to_string(), 
                  &x2.to_string(), &y2.to_string(), 
                  &duration.to_string()]);
        
        let output = cmd.output().map_err(|e| {
            FindError::ExecutionFailed(format!("滑动命令执行失败: {}", e))
        })?;
        
        if !output.status.success() {
            return Err(FindError::ExecutionFailed(format!(
                "滑动失败: {}", 
                String::from_utf8_lossy(&output.stderr)
            )));
        }
        
        Ok(())
    }
}

/// UI元素结构  
#[derive(Debug, Clone)]
pub struct UniversalUIElement {
    pub text: String,
    pub content_desc: String,
    pub bounds: UniversalElementBounds,
    pub clickable: bool,
    pub class_name: String,
    pub package: String,
    pub confidence: f32,
}

/// 元素边界坐标
#[derive(Debug, Clone)]
pub struct UniversalElementBounds {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl UniversalElementBounds {
    pub fn new(left: i32, top: i32, right: i32, bottom: i32) -> Self {
        Self { left, top, right, bottom }
    }
    
    pub fn width(&self) -> i32 {
        self.right - self.left
    }
    
    pub fn height(&self) -> i32 {
        self.bottom - self.top
    }
    
    pub fn center(&self) -> (i32, i32) {
        ((self.left + self.right) / 2, (self.top + self.bottom) / 2)
    }
}
