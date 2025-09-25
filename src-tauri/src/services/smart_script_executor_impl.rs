// smart_script_executor_impl.rs - 智能脚本执行器的具体实现
use super::*;

impl SmartScriptExecutor {
    
    // ==================== 页面识别系统 ====================
    
    /// 识别当前页面状态
    pub async fn recognize_current_page(&self) -> Result<PageRecognitionResult> {
        info!("🔍 开始智能页面识别...");

        let ui_dump = self.get_ui_dump().await?;
        let ui_elements = self.parse_ui_elements(&ui_dump).await?;
        
        // 分析页面特征
        let (page_state, confidence, key_elements) = self.analyze_page_state(&ui_dump, &ui_elements).await?;
        
        let result = PageRecognitionResult {
            current_state: page_state,
            confidence,
            key_elements,
            ui_elements: ui_elements.clone(),
            message: format!("页面识别完成，状态: {:?}，置信度: {:.2}", page_state, confidence),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        info!("✅ 页面识别结果: {:?} (置信度: {:.2})", result.current_state, result.confidence);
        Ok(result)
    }

    /// 获取UI dump
    async fn get_ui_dump(&self) -> Result<String> {
        info!("📱 获取UI结构信息...");
        
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "uiautomator", "dump", "/dev/stdout"
        ]).await?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("获取UI dump失败: {}", error_msg));
        }

        let ui_content = String::from_utf8_lossy(&output.stdout);
        info!("📊 UI内容长度: {} 字符", ui_content.len());
        
        Ok(ui_content.to_string())
    }

    /// 解析UI元素
    async fn parse_ui_elements(&self, ui_dump: &str) -> Result<Vec<SmartUIElement>> {
        info!("🔧 解析UI元素...");
        
        let mut elements = Vec::new();
        let node_regex = Regex::new(r#"<node[^>]*>"#)?;
        
        for node_match in node_regex.find_iter(ui_dump) {
            let node_str = node_match.as_str();
            
            if let Some(element) = self.parse_single_node(node_str)? {
                elements.push(element);
            }
        }

        info!("📊 解析到 {} 个UI元素", elements.len());
        Ok(elements)
    }

    /// 解析单个UI节点
    fn parse_single_node(&self, node_str: &str) -> Result<Option<SmartUIElement>> {
        // 提取属性
        let text = self.extract_attribute(node_str, "text")?;
        let content_desc = self.extract_attribute(node_str, "content-desc")?;
        let resource_id = self.extract_attribute(node_str, "resource-id")?;
        let class_name = self.extract_attribute(node_str, "class")?;
        let package = self.extract_attribute(node_str, "package")?;
        let bounds_str = self.extract_attribute(node_str, "bounds")?;
        let clickable = self.extract_attribute(node_str, "clickable")? == Some("true".to_string());
        let enabled = self.extract_attribute(node_str, "enabled")? == Some("true".to_string());

        // 解析bounds
        let bounds = if let Some(bounds_str) = bounds_str {
            self.parse_bounds(&bounds_str)?
        } else {
            return Ok(None);
        };

        // 计算中心点
        let center = ((bounds.0 + bounds.2) / 2, (bounds.1 + bounds.3) / 2);

        // 判断元素类型
        let element_type = self.determine_element_type(&class_name.unwrap_or_default());

        // 过滤掉无意义的元素
        if text.as_ref().map_or(true, |t| t.trim().is_empty()) && 
           content_desc.as_ref().map_or(true, |t| t.trim().is_empty()) &&
           !clickable {
            return Ok(None);
        }

        let element = SmartUIElement {
            element_type,
            text: text.unwrap_or_default(),
            bounds,
            center,
            clickable,
            visible: enabled,
            resource_id,
            class_name,
            content_desc,
            package,
        };

        Ok(Some(element))
    }

    /// 分析页面状态
    async fn analyze_page_state(&self, ui_dump: &str, ui_elements: &[SmartUIElement]) -> Result<(PageState, f32, Vec<String>)> {
        let mut confidence = 0.0;
        let mut key_elements = Vec::new();
        
        // 检测应用包名
        let package_confidence = self.detect_app_package(ui_elements);
        confidence += package_confidence * 0.3;

        // 检测特征元素
        let (feature_state, feature_confidence, features) = self.detect_page_features(ui_elements);
        confidence += feature_confidence * 0.4;
        key_elements.extend(features);

        // 检测布局特征
        let layout_confidence = self.detect_layout_features(ui_elements);
        confidence += layout_confidence * 0.3;

        // 确定最终页面状态
        let page_state = if confidence < 0.3 {
            PageState::Unknown
        } else if ui_dump.contains("android.launcher") || ui_dump.contains("com.android.launcher") {
            PageState::Home
        } else if !feature_state.is_empty() {
            PageState::Custom(feature_state)
        } else {
            PageState::AppMainPage
        };

        Ok((page_state, confidence.min(1.0), key_elements))
    }

    /// 检测应用包名
    fn detect_app_package(&self, ui_elements: &[SmartUIElement]) -> f32 {
        let packages: Vec<_> = ui_elements.iter()
            .filter_map(|e| e.package.as_ref())
            .collect();

        if packages.is_empty() {
            return 0.0;
        }

        // 检查是否有统一的包名
        let first_package = &packages[0];
        let same_package_count = packages.iter().filter(|p| *p == first_package).count();
        
        same_package_count as f32 / packages.len() as f32
    }

    /// 检测页面特征
    fn detect_page_features(&self, ui_elements: &[SmartUIElement]) -> (String, f32, Vec<String>) {
        let mut features = Vec::new();
        let mut confidence = 0.0;
        let mut state_name = String::new();

        // 检测常见页面特征
        for element in ui_elements {
            let text = element.text.to_lowercase();
            let desc = element.content_desc.as_ref().map(|s| s.to_lowercase()).unwrap_or_default();
            
            // 登录页面特征
            if text.contains("登录") || text.contains("login") || text.contains("sign in") {
                features.push("登录按钮".to_string());
                confidence += 0.2;
                state_name = "LoginPage".to_string();
            }
            
            // 主页特征
            if text.contains("首页") || text.contains("主页") || text.contains("home") {
                features.push("主页标识".to_string());
                confidence += 0.15;
                state_name = "MainPage".to_string();
            }
            
            // 设置页面特征
            if text.contains("设置") || text.contains("settings") {
                features.push("设置页面".to_string());
                confidence += 0.2;
                state_name = "SettingsPage".to_string();
            }
            
            // 列表页面特征
            if element.element_type == UIElementType::ListView || 
               element.element_type == UIElementType::ScrollView {
                features.push("列表视图".to_string());
                confidence += 0.1;
                if state_name.is_empty() {
                    state_name = "ListPage".to_string();
                }
            }
            
            // 对话框特征
            if text.contains("确定") && text.contains("取消") {
                features.push("对话框".to_string());
                confidence += 0.3;
                state_name = "DialogPage".to_string();
            }
        }

        (state_name, confidence, features)
    }

    /// 检测布局特征
    fn detect_layout_features(&self, ui_elements: &[SmartUIElement]) -> f32 {
        let clickable_count = ui_elements.iter().filter(|e| e.clickable).count();
        let total_count = ui_elements.len();
        
        if total_count == 0 {
            return 0.0;
        }

        // 可点击元素比例
        let clickable_ratio = clickable_count as f32 / total_count as f32;
        
        // 元素分布均匀度
        let distribution_score = self.calculate_element_distribution(ui_elements);
        
        (clickable_ratio * 0.6 + distribution_score * 0.4).min(1.0)
    }

    /// 计算元素分布均匀度
    fn calculate_element_distribution(&self, ui_elements: &[SmartUIElement]) -> f32 {
        if ui_elements.len() < 3 {
            return 0.5;
        }

        // 简化版分布计算 - 检查元素是否分布在屏幕不同区域
        let mut regions = [0; 9]; // 3x3网格
        
        for element in ui_elements {
            let x_region = (element.center.0 / 360).min(2); // 假设屏幕宽度1080
            let y_region = (element.center.1 / 640).min(2); // 假设屏幕高度1920
            let region_index = (y_region * 3 + x_region) as usize;
            regions[region_index] += 1;
        }

        let non_empty_regions = regions.iter().filter(|&&count| count > 0).count();
        non_empty_regions as f32 / 9.0
    }

    // ==================== UI元素查找系统 ====================

    /// 智能查找UI元素
    pub async fn smart_find_elements(&self, condition: &ElementFindCondition) -> Result<Vec<SmartUIElement>> {
        info!("🔍 智能查找UI元素...");
        
        let ui_elements = self.get_current_ui_elements().await?;
        let mut matching_elements = Vec::new();

        for element in ui_elements {
            if self.element_matches_condition(&element, condition) {
                matching_elements.push(element);
            }
        }

        info!("📊 找到 {} 个匹配元素", matching_elements.len());
        Ok(matching_elements)
    }

    /// 获取当前UI元素
    async fn get_current_ui_elements(&self) -> Result<Vec<SmartUIElement>> {
        let ui_dump = self.get_ui_dump().await?;
        self.parse_ui_elements(&ui_dump).await
    }

    /// 检查元素是否匹配条件
    fn element_matches_condition(&self, element: &SmartUIElement, condition: &ElementFindCondition) -> bool {
        // 文本匹配
        if let Some(text_contains) = &condition.text_contains {
            if !element.text.contains(text_contains) {
                return false;
            }
        }

        if let Some(text_equals) = &condition.text_equals {
            if element.text != *text_equals {
                return false;
            }
        }

        if let Some(text_regex) = &condition.text_regex {
            if let Ok(regex) = Regex::new(text_regex) {
                if !regex.is_match(&element.text) {
                    return false;
                }
            }
        }

        // 属性匹配
        if let Some(resource_id) = &condition.resource_id {
            if element.resource_id.as_ref() != Some(resource_id) {
                return false;
            }
        }

        if let Some(class_name) = &condition.class_name {
            if element.class_name.as_ref() != Some(class_name) {
                return false;
            }
        }

        if let Some(clickable) = condition.clickable {
            if element.clickable != clickable {
                return false;
            }
        }

        // 坐标范围匹配
        if let Some(bounds_filter) = &condition.bounds_filter {
            if !self.bounds_match_filter(&element.bounds, bounds_filter) {
                return false;
            }
        }

        // 元素类型匹配
        if let Some(element_type) = &condition.element_type {
            if element.element_type != *element_type {
                return false;
            }
        }

        true
    }

    /// 检查坐标是否匹配过滤器
    fn bounds_match_filter(&self, bounds: &(i32, i32, i32, i32), filter: &BoundsFilter) -> bool {
        let (left, top, right, bottom) = *bounds;
        let width = right - left;
        let height = bottom - top;

        if let Some(min_x) = filter.min_x {
            if left < min_x { return false; }
        }
        if let Some(max_x) = filter.max_x {
            if right > max_x { return false; }
        }
        if let Some(min_y) = filter.min_y {
            if top < min_y { return false; }
        }
        if let Some(max_y) = filter.max_y {
            if bottom > max_y { return false; }
        }
        if let Some(min_width) = filter.min_width {
            if width < min_width { return false; }
        }
        if let Some(max_width) = filter.max_width {
            if width > max_width { return false; }
        }
        if let Some(min_height) = filter.min_height {
            if height < min_height { return false; }
        }
        if let Some(max_height) = filter.max_height {
            if height > max_height { return false; }
        }

        true
    }

    // ==================== 辅助方法 ====================

    /// 执行ADB命令
    async fn execute_adb_command(&self, args: &[&str]) -> Result<std::process::Output> {
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        
        let output = cmd.output()
            .context(format!("执行ADB命令失败 - ADB路径: {}, 参数: {:?}", self.adb_path, args))?;
        
        Ok(output)
    }

    /// 提取XML属性
    fn extract_attribute(&self, node_str: &str, attr_name: &str) -> Result<Option<String>> {
        let pattern = format!(r#"{}="([^"]*)""#, attr_name);
        let regex = Regex::new(&pattern)?;
        
        if let Some(captures) = regex.captures(node_str) {
            if let Some(value) = captures.get(1) {
                return Ok(Some(value.as_str().to_string()));
            }
        }
        
        Ok(None)
    }

    /// 解析bounds属性
    fn parse_bounds(&self, bounds_str: &str) -> Result<(i32, i32, i32, i32)> {
        // bounds格式: "[left,top][right,bottom]"
        let bounds_regex = Regex::new(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")?;
        
        if let Some(captures) = bounds_regex.captures(bounds_str) {
            let left: i32 = captures[1].parse()?;
            let top: i32 = captures[2].parse()?;
            let right: i32 = captures[3].parse()?;
            let bottom: i32 = captures[4].parse()?;
            
            Ok((left, top, right, bottom))
        } else {
            Err(anyhow::anyhow!("无法解析bounds: {}", bounds_str))
        }
    }

    /// 判断元素类型
    fn determine_element_type(&self, class_name: &str) -> UIElementType {
        match class_name {
            s if s.contains("Button") => UIElementType::Button,
            s if s.contains("TextView") => UIElementType::TextView,
            s if s.contains("EditText") => UIElementType::EditText,
            s if s.contains("ImageView") => UIElementType::ImageView,
            s if s.contains("ListView") => UIElementType::ListView,
            s if s.contains("ScrollView") => UIElementType::ScrollView,
            s if s.contains("LinearLayout") => UIElementType::LinearLayout,
            s if s.contains("RelativeLayout") => UIElementType::RelativeLayout,
            s if s.contains("FrameLayout") => UIElementType::FrameLayout,
            _ => UIElementType::Unknown,
        }
    }

    /// 检查前置条件
    async fn check_pre_conditions(&self, conditions: &[PageState]) -> Result<()> {
        if conditions.is_empty() {
            return Ok(());
        }

        let current_page = self.recognize_current_page().await?;
        
        for condition in conditions {
            if current_page.current_state == *condition {
                return Ok(());
            }
        }

        Err(anyhow::anyhow!("前置条件不满足，当前页面: {:?}, 期望: {:?}", 
            current_page.current_state, conditions))
    }

    /// 执行带重试的步骤
    async fn execute_step_with_retry(&self, step: &SmartScriptStep) -> Result<SmartExecutionLog> {
        let retry_config = step.retry_config.as_ref().unwrap_or(&RetryConfig::default());
        let mut retry_count = 0;
        let step_start = std::time::Instant::now();

        loop {
            match self.execute_single_step(step).await {
                Ok(log) => return Ok(log),
                Err(e) => {
                    retry_count += 1;
                    
                    if retry_count >= retry_config.max_retries {
                        return Err(e);
                    }

                    warn!("⚠️ 步骤执行失败，第 {} 次重试: {}", retry_count, e);
                    
                    let wait_time = if retry_config.exponential_backoff {
                        retry_config.retry_interval_ms * (2_u64.pow(retry_count - 1))
                    } else {
                        retry_config.retry_interval_ms
                    };
                    
                    sleep(Duration::from_millis(wait_time)).await;
                }
            }
        }
    }

    /// 执行单个步骤
    async fn execute_single_step(&self, step: &SmartScriptStep) -> Result<SmartExecutionLog> {
        let step_start = std::time::Instant::now();
        
        // 记录执行前的页面状态
        let page_state_before = if self.config.page_recognition_enabled {
            self.recognize_current_page().await.ok().map(|r| r.current_state)
        } else {
            None
        };

        let result = match step.step_type {
            SmartActionType::SmartTap => self.execute_smart_tap(step).await,
            SmartActionType::SmartFindElement => self.execute_smart_find_element(step).await,
            SmartActionType::RecognizePage => self.execute_recognize_page(step).await,
            SmartActionType::VerifyAction => self.execute_verify_action(step).await,
            SmartActionType::WaitForPageState => self.execute_wait_for_page_state(step).await,
            SmartActionType::ExtractElement => self.execute_extract_element(step).await,
            SmartActionType::SmartNavigation => self.execute_smart_navigation(step).await,
            // 基础操作类型
            SmartActionType::Tap => self.execute_basic_tap(step).await,
            SmartActionType::Swipe => self.execute_basic_swipe(step).await,
            SmartActionType::Input => self.execute_basic_input(step).await,
            SmartActionType::Wait => self.execute_basic_wait(step).await,
            SmartActionType::KeyEvent => {
                // 简化：通过统一执行器路径处理，复用 dispatcher 已实现的 KeyEvent
                match self.dispatch_action(step).await {
                    Ok(msg) => Ok((vec![], std::collections::HashMap::new())),
                    Err(e) => Err(e),
                }
            }
            _ => Err(anyhow::anyhow!("不支持的操作类型: {:?}", step.step_type)),
        };

        // 记录执行后的页面状态
        let page_state_after = if self.config.page_recognition_enabled {
            self.recognize_current_page().await.ok().map(|r| r.current_state)
        } else {
            None
        };

        let duration_ms = step_start.elapsed().as_millis() as u64;

        match result {
            Ok((found_elements, extracted_data)) => {
                Ok(SmartExecutionLog {
                    step_id: step.id.clone(),
                    step_name: step.name.clone(),
                    status: ExecutionStatus::Success,
                    message: "执行成功".to_string(),
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    duration_ms,
                    retry_count: 0,
                    page_state_before,
                    page_state_after,
                    found_elements,
                    verification_result: None,
                    extracted_data,
                })
            }
            Err(e) => {
                Err(e)
            }
        }
    }

    // 这里会在下一个文件中继续实现具体的执行方法...
}