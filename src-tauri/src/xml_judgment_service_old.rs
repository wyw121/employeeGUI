// Deprecated legacy file kept temporarily only because automated deletion failed.
// It is intentionally left EMPTY to avoid accidental usage.
// Safe to remove manually from filesystem.

impl XmlJudgmentService {
    /// 获取设备当前UI的XML结构
    pub async fn get_ui_xml(device_id: &str) -> Result<String, String> {
        // 先dump UI hierarchy
        match execute_adb_with_result(&["-s", device_id, "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"]).await {
            Ok(dump_result) => {
                tracing::info!("✅ uiautomator dump 执行成功: {}", String::from_utf8_lossy(&dump_result.stdout));
            }
            Err(e) => {
                tracing::error!("❌ uiautomator dump 执行失败: {}", e);
                return Err(format!("UI dump 失败: {}", e));
            }
        }

        // 等待文件生成，增加更长的等待时间
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // 先检查文件是否存在
        match execute_adb_with_result(&["-s", device_id, "shell", "ls", "-la", "/sdcard/ui_dump.xml"]).await {
            Ok(ls_result) => {
                tracing::info!("📂 文件状态: {}", String::from_utf8_lossy(&ls_result.stdout));
            }
            Err(e) => {
                tracing::warn!("⚠️  文件检查失败: {}", e);
            }
        }

        // 读取XML文件内容
        let cat_result = execute_adb_with_result(&["-s", device_id, "shell", "cat", "/sdcard/ui_dump.xml"]).await?;

        // 检查读取到的内容长度
        let xml_content = String::from_utf8_lossy(&cat_result.stdout);
        tracing::info!("📄 XML内容长度: {} bytes", xml_content.len());

        // 清理临时文件
        let _ = execute_adb_command(&["-s", device_id, "shell", "rm", "/sdcard/ui_dump.xml"]);

        Ok(xml_content.to_string())
    }

    /// 解析XML字符串为结构化数据
    #[allow(dead_code)]
    pub fn parse_xml(xml_content: &str) -> Result<XmlElement, String> {
        // 简化的XML解析实现
        // 在实际项目中建议使用 quick-xml 或其他专业XML解析库
        
        let xml_content = xml_content.trim();
        if xml_content.is_empty() {
            return Err("XML内容为空".to_string());
        }

        // 提取根节点
        if let Some(start) = xml_content.find('<') {
            if let Some(end) = xml_content.rfind('>') {
                let root_xml = &xml_content[start..=end];
                return Self::parse_element(root_xml);
            }
        }

        Err("无效的XML格式".to_string())
    }

    /// 解析单个XML元素
    fn parse_element(element_str: &str) -> Result<XmlElement, String> {
        // 简化的元素解析
        let tag_regex = Regex::new(r"<(\w+)([^>]*)>").map_err(|e| e.to_string())?;
        
        if let Some(captures) = tag_regex.captures(element_str) {
            let tag = captures.get(1).unwrap().as_str().to_string();
            let attrs_str = captures.get(2).unwrap().as_str();
            
            let attributes = Self::parse_attributes(attrs_str);
            let bounds = Self::extract_bounds(&attributes);
            
            // 提取文本内容
            let text_regex = Regex::new(&format!(r"<{}[^>]*>(.*?)</{}>", tag, tag)).map_err(|e| e.to_string())?;
            let text = text_regex.captures(element_str)
                .and_then(|cap| cap.get(1))
                .map(|m| m.as_str().trim().to_string())
                .filter(|s| !s.is_empty());

            return Ok(XmlElement {
                tag,
                attributes,
                text,
                children: vec![], // 简化实现，不递归解析子元素
                bounds,
            });
        }

        Err("无法解析XML元素".to_string())
    }

    /// 解析XML属性
    fn parse_attributes(attrs_str: &str) -> HashMap<String, String> {
        let mut attributes = HashMap::new();
        let attr_regex = Regex::new(r#"(\w+)="([^"]*)""#).unwrap();
        
        for captures in attr_regex.captures_iter(attrs_str) {
            if let (Some(key), Some(value)) = (captures.get(1), captures.get(2)) {
                attributes.insert(key.as_str().to_string(), value.as_str().to_string());
            }
        }
        
        attributes
    }

    /// 提取bounds坐标
    fn extract_bounds(attributes: &HashMap<String, String>) -> Option<(i32, i32, i32, i32)> {
        if let Some(bounds_str) = attributes.get("bounds") {
            // bounds格式: "[left,top][right,bottom]"
            let bounds_regex = Regex::new(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]").unwrap();
            if let Some(captures) = bounds_regex.captures(bounds_str) {
                let left = captures.get(1)?.as_str().parse().ok()?;
                let top = captures.get(2)?.as_str().parse().ok()?;
                let right = captures.get(3)?.as_str().parse().ok()?;
                let bottom = captures.get(4)?.as_str().parse().ok()?;
                return Some((left, top, right, bottom));
            }
        }
        None
    }

    /// 查找符合条件的UI元素
    pub async fn find_elements(device_id: &str, condition: &XmlCondition) -> Result<XmlJudgmentResult, String> {
        let xml_content = Self::get_ui_xml(device_id).await?;
        
        // 简化的元素查找实现
        let mut matched_elements = Vec::new();
        let mut matched = false;

        match condition.condition_type.as_str() {
            "resource_id" => {
                if xml_content.contains(&format!("resource-id=\"{}\"", condition.selector)) {
                    matched = true;
                    // 这里应该解析出具体的元素，简化实现
                    if let Ok(element) = Self::parse_element(&xml_content) {
                        matched_elements.push(element);
                    }
                }
            }
            "text" => {
                if xml_content.contains(&format!("text=\"{}\"", condition.selector)) {
                    matched = true;
                    if let Ok(element) = Self::parse_element(&xml_content) {
                        matched_elements.push(element);
                    }
                }
            }
            "text_contains" => {
                if let Some(value) = &condition.value {
                    if xml_content.contains(value) {
                        matched = true;
                        if let Ok(element) = Self::parse_element(&xml_content) {
                            matched_elements.push(element);
                        }
                    }
                }
            }
            "class" => {
                if xml_content.contains(&format!("class=\"{}\"", condition.selector)) {
                    matched = true;
                    if let Ok(element) = Self::parse_element(&xml_content) {
                        matched_elements.push(element);
                    }
                }
            }
            _ => {
                return Err(format!("不支持的条件类型: {}", condition.condition_type));
            }
        }

        Ok(XmlJudgmentResult {
            success: true,
            matched,
            elements: matched_elements,
            error: None,
        })
    }

    /// 等待元素出现
    pub async fn wait_for_element(
        device_id: &str, 
        condition: &XmlCondition, 
        timeout_ms: u64
    ) -> Result<XmlJudgmentResult, String> {
        let start_time = std::time::Instant::now();
        let timeout = std::time::Duration::from_millis(timeout_ms);

        loop {
            if start_time.elapsed() >= timeout {
                return Ok(XmlJudgmentResult {
                    success: true,
                    matched: false,
                    elements: vec![],
                    error: Some("等待超时".to_string()),
                });
            }

            let result = Self::find_elements(device_id, condition).await?;
            if result.matched {
                return Ok(result);
            }

            // 等待100ms后重试
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    }

    /// 检查页面状态
    pub async fn check_page_state(device_id: &str, expected_indicators: &[&str]) -> Result<bool, String> {
        let xml_content = Self::get_ui_xml(device_id).await?;
        
        for indicator in expected_indicators {
            if !xml_content.contains(indicator) {
                return Ok(false);
            }
        }
        
        Ok(true)
    }

    /// 获取元素中心点坐标
    #[allow(dead_code)]
    pub fn get_element_center(element: &XmlElement) -> Option<(i32, i32)> {
        if let Some((left, top, right, bottom)) = element.bounds {
            let center_x = (left + right) / 2;
            let center_y = (top + bottom) / 2;
            Some((center_x, center_y))
        } else {
            None
        }
    }
}

// Tauri命令包装器
use tauri::command;

#[command]
pub async fn get_device_ui_xml(device_id: String) -> Result<String, String> {
    XmlJudgmentService::get_ui_xml(&device_id).await
}

#[command]
pub async fn find_xml_ui_elements(
    device_id: String, 
    condition: XmlCondition
) -> Result<XmlJudgmentResult, String> {
    XmlJudgmentService::find_elements(&device_id, &condition).await
}

#[command]
pub async fn wait_for_ui_element(
    device_id: String,
    condition: XmlCondition,
    timeout_ms: u64
) -> Result<XmlJudgmentResult, String> {
    XmlJudgmentService::wait_for_element(&device_id, &condition, timeout_ms).await
}

#[command]
pub async fn check_device_page_state(
    device_id: String,
    indicators: Vec<String>
) -> Result<bool, String> {
    let indicator_refs: Vec<&str> = indicators.iter().map(|s| s.as_str()).collect();
    XmlJudgmentService::check_page_state(&device_id, &indicator_refs).await
}

// ====== 新增：按匹配条件查找元素（用于脚本步骤绑定） ======

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchCriteriaDTO {
    pub strategy: String,           // 'absolute' | 'strict' | 'relaxed' | 'positionless' | 'standard'
    pub fields: Vec<String>,        // 勾选的字段
    pub values: std::collections::HashMap<String, String>, // 字段值
    #[serde(default)]
    pub excludes: std::collections::HashMap<String, Vec<String>>, // 每字段“不可包含”的词
    #[serde(default)]
    pub includes: std::collections::HashMap<String, Vec<String>>, // 每字段“必须包含”的词
    /// 每字段匹配模式：equals | contains | regex
    #[serde(default)]
    pub match_mode: std::collections::HashMap<String, String>,
    /// 每字段“必须匹配”的正则（全部需满足）
    #[serde(default)]
    pub regex_includes: std::collections::HashMap<String, Vec<String>>,
    /// 每字段“不可匹配”的正则（任一命中即失败）
    #[serde(default)]
    pub regex_excludes: std::collections::HashMap<String, Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MatchPreviewDTO {
    pub text: Option<String>,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
    pub package: Option<String>,
    pub bounds: Option<String>,
    pub xpath: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchResultDTO {
    pub ok: bool,
    pub message: String,
    pub total: Option<usize>,
    pub matchedIndex: Option<usize>,
    pub preview: Option<MatchPreviewDTO>,
}

/// 从多个匹配项中选择最佳匹配
fn select_best_match(
    matched_indices: &Vec<usize>,
    node_lines: &Vec<&str>,
    criteria: &MatchCriteriaDTO,
) -> usize {
    // 优先级规则：
    // 1) resource-id 精确匹配优先
    // 2) text/content-desc 精确匹配优先
    // 3) class/package 精确匹配优先
    // 4) 其他情况返回第一个

    let rid_exact = criteria.values.get("resource-id").cloned();
    let text_exact = criteria.values.get("text").cloned();
    let desc_exact = criteria.values.get("content-desc").cloned();
    let class_exact = criteria.values.get("class").cloned();
    let package_exact = criteria.values.get("package").cloned();

    // 1) resource-id 精确匹配
    if let Some(rid) = rid_exact {
        for &idx in matched_indices {
            let line = node_lines[idx];
            if line.contains(&format!("resource-id=\"{}\"", rid))
                || line.contains(&format!("resource-id=\".*/{}\"", rid))
            {
                tracing::debug!("[XML] 择优: 命中 resource-id 精确匹配 => 选择 #{}", idx);
                return idx;
            }
        }
    }

    // 2) 文本精确匹配
    if let Some(txt) = text_exact {
        for &idx in matched_indices {
            let line = node_lines[idx];
            if line.contains(&format!("text=\"{}\"", txt)) {
                tracing::debug!("[XML] 择优: 命中文本精确匹配 => 选择 #{}", idx);
                return idx;
            }
        }
    }
    if let Some(desc) = desc_exact {
        for &idx in matched_indices {
            let line = node_lines[idx];
            if line.contains(&format!("content-desc=\"{}\"", desc)) {
                tracing::debug!("[XML] 择优: 命中 content-desc 精确匹配 => 选择 #{}", idx);
                return idx;
            }
        }
    }

    // 3) class/package 精确匹配
    if let Some(cls) = class_exact {
        for &idx in matched_indices {
            let line = node_lines[idx];
            if line.contains(&format!("class=\"{}\"", cls)) {
                tracing::debug!("[XML] 择优: 命中 class 精确匹配 => 选择 #{}", idx);
                return idx;
            }
        }
    }
    if let Some(pkg) = package_exact {
        for &idx in matched_indices {
            let line = node_lines[idx];
            if line.contains(&format!("package=\"{}\"", pkg)) {
                tracing::debug!("[XML] 择优: 命中 package 精确匹配 => 选择 #{}", idx);
                return idx;
            }
        }
    }

    // 4) 默认返回第一个
    tracing::debug!("[XML] 择优: 未触发优先规则，默认选择第一个 => #{}", matched_indices[0]);
    matched_indices[0]
}

/// 子元素字段匹配辅助函数
/// 检查指定节点的第一个子节点的文本是否匹配给定值
#[allow(dead_code)]
fn check_first_child_text(all_lines: &[&str], node_idx: usize, expected_value: &str) -> bool {
    // 找到当前节点在全部行中的位置
    let node_lines: Vec<&str> = all_lines.iter().filter(|l| l.contains("<node")).cloned().collect();
    if node_idx >= node_lines.len() {
        return false;
    }
    
    let current_line = node_lines[node_idx];
    
    // 获取当前节点的缩进级别（简单方法：计算前导空格）
    let current_indent = current_line.chars().take_while(|&c| c == ' ').count();
    
    // 查找当前节点在所有行中的位置
    if let Some(current_pos) = all_lines.iter().position(|&line| line == current_line) {
        // 在当前节点之后查找子节点
        for i in (current_pos + 1)..all_lines.len() {
            let line = all_lines[i];
            if line.contains("<node") {
                let line_indent = line.chars().take_while(|&c| c == ' ').count();
                if line_indent > current_indent {
                    // 这是一个子节点，检查其 text 属性
                    if line.contains(&format!("text=\"{}\"", expected_value)) {
                        return true;
                    }
                } else if line_indent <= current_indent {
                    // 已经到了同级或更高级节点，停止搜索
                    break;
                }
            }
        }
    }
    
    false
}

/// 检查指定节点的第一个子节点的 class 是否匹配给定值
#[allow(dead_code)]
fn check_first_child_class(all_lines: &[&str], node_idx: usize, expected_value: &str) -> bool {
    let node_lines: Vec<&str> = all_lines.iter().filter(|l| l.contains("<node")).cloned().collect();
    if node_idx >= node_lines.len() {
        return false;
    }
    
    let current_line = node_lines[node_idx];
    let current_indent = current_line.chars().take_while(|&c| c == ' ').count();
    
    if let Some(current_pos) = all_lines.iter().position(|&line| line == current_line) {
        for i in (current_pos + 1)..all_lines.len() {
            let line = all_lines[i];
            if line.contains("<node") {
                let line_indent = line.chars().take_while(|&c| c == ' ').count();
                if line_indent > current_indent {
                    if line.contains(&format!("class=\"{}\"", expected_value)) {
                        return true;
                    }
                } else if line_indent <= current_indent {
                    break;
                }
            }
        }
    }
    
    false
}

/// 检查指定节点的第一个子节点的文本是否包含给定字符串（用于 includes 条件）
#[allow(dead_code)]
fn check_first_child_text_contains(all_lines: &[&str], node_idx: usize, search_text: &str) -> bool {
    let node_lines: Vec<&str> = all_lines.iter().filter(|l| l.contains("<node")).cloned().collect();
    if node_idx >= node_lines.len() {
        return false;
    }
    
    let current_line = node_lines[node_idx];
    let current_indent = current_line.chars().take_while(|&c| c == ' ').count();
    
    if let Some(current_pos) = all_lines.iter().position(|&line| line == current_line) {
        for i in (current_pos + 1)..all_lines.len() {
            let line = all_lines[i];
            if line.contains("<node") {
                let line_indent = line.chars().take_while(|&c| c == ' ').count();
                if line_indent > current_indent {
                    // 检查 text 属性是否包含搜索文本
                    if let Some(text_start) = line.find("text=\"") {
                        let text_start = text_start + 6;
                        if let Some(text_end) = line[text_start..].find('"') {
                            let text_value = &line[text_start..text_start + text_end];
                            if text_value.contains(search_text) {
                                return true;
                            }
                        }
                    }
                } else if line_indent <= current_indent {
                    break;
                }
            }
        }
    }
    
    false
}

/// 检查指定节点的第一个子节点的 class 是否包含给定字符串（用于 includes 条件）
#[allow(dead_code)]
fn check_first_child_class_contains(all_lines: &[&str], node_idx: usize, search_text: &str) -> bool {
    let node_lines: Vec<&str> = all_lines.iter().filter(|l| l.contains("<node")).cloned().collect();
    if node_idx >= node_lines.len() {
        return false;
    }
    
    let current_line = node_lines[node_idx];
    let current_indent = current_line.chars().take_while(|&c| c == ' ').count();
    
    if let Some(current_pos) = all_lines.iter().position(|&line| line == current_line) {
        for i in (current_pos + 1)..all_lines.len() {
            let line = all_lines[i];
            if line.contains("<node") {
                let line_indent = line.chars().take_while(|&c| c == ' ').count();
                if line_indent > current_indent {
                    // 检查 class 属性是否包含搜索文本
                    if let Some(class_start) = line.find("class=\"") {
                        let class_start = class_start + 7;
                        if let Some(class_end) = line[class_start..].find('"') {
                            let class_value = &line[class_start..class_start + class_end];
                            if class_value.contains(search_text) {
                                return true;
                            }
                        }
                    }
                } else if line_indent <= current_indent {
                    break;
                }
            }
        }
    }
    
    false
}

#[command]
#[allow(non_snake_case)]
pub async fn match_element_by_criteria(
    deviceId: String,
    criteria: MatchCriteriaDTO,
) -> Result<MatchResultDTO, String> {
    tracing::info!("🔎 [XML] 开始按条件匹配: strategy={}, device={}", criteria.strategy, deviceId);
    tracing::debug!("[XML] 条件: fields={:?}, values={:?}, match_mode={:?}, regex_includes={:?}, regex_excludes={:?}",
        criteria.fields, criteria.values, criteria.match_mode, criteria.regex_includes, criteria.regex_excludes);
    // 读取当前XML
    let xml = XmlJudgmentService::get_ui_xml(&deviceId).await?;

    // 🆕 初始化增强层级匹配配置
    let hierarchy_config = HierarchyMatchConfig {
        enable_parent_context: true,
        enable_child_context: true,
        enable_descendant_search: criteria.strategy == "smart_hierarchy", // 仅在智能层级模式下启用深度搜索
        max_depth: 2,
        prioritize_semantic_fields: true,
    };

    // 增强XML解析：支持子元素字段匹配
    let all_lines: Vec<&str> = xml.lines().collect();
    // 优先使用 opening-tag 视图以适配“单行XML”的情况
    let node_opening_tags: Vec<String> = extract_node_opening_tags(&xml);
    let node_lines: Vec<&str> = if !node_opening_tags.is_empty() {
        tracing::debug!("[XML] 采用 opening-tag 视图解析节点: count={}", node_opening_tags.len());
        node_opening_tags.iter().map(|s| s.as_str()).collect()
    } else {
        // 回退为按行视图（历史实现）
        let v: Vec<&str> = all_lines.iter().filter(|l| l.contains("<node")).cloned().collect();
        tracing::debug!("[XML] 按行视图解析节点: lines_with_node={}", v.len());
        v
    };

    if node_lines.is_empty() {
        tracing::warn!("[XML] 未解析到任何节点，匹配失败");
        return Ok(MatchResultDTO { ok: false, message: "未解析到任何节点".into(), total: Some(0), matchedIndex: None, preview: None });
    }

    // 根据选择字段匹配；对 positionless/relaxed/strict/standard 策略忽略位置字段
    let ignore_bounds = criteria.strategy == "positionless" || criteria.strategy == "relaxed" || criteria.strategy == "strict" || criteria.strategy == "standard";
    if ignore_bounds {
        tracing::debug!("[XML] 策略 {} 将忽略 bounds 参与过滤/比较", criteria.strategy);
    }

    // 收集全部命中项，后续做择优选择，避免首个命中导致误选
    let mut matched_indices: Vec<usize> = Vec::new();
    for (idx, line) in node_lines.iter().enumerate() {
        let mut ok = true;

        // 1) 正向匹配：values
        for f in &criteria.fields {
            if *f == "bounds" && ignore_bounds { continue; }
            if let Some(v) = criteria.values.get(f) {
                // 先检查是否指定 regex 模式
                let mode = criteria.match_mode.get(f).map(|s| s.as_str()).unwrap_or("contains");
                // 🆕 使用增强层级匹配器处理层级字段
                if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    let hit = match mode {
                        "regex" => HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, f, v, &hierarchy_config),
                        "equals" => HierarchyMatcher::check_hierarchy_field_equals(&all_lines, idx, f, v, &hierarchy_config),
                        _ => HierarchyMatcher::check_hierarchy_field_contains(&all_lines, idx, f, v, &hierarchy_config),
                    };
                    if !hit {
                        ok = false; 
                        break;
                    }
                }
                // 处理传统子元素字段（向后兼容）
                else if f == "first_child_text" {
                    let hit = match mode {
                        "regex" => HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, "child_text", v, &hierarchy_config),
                        "equals" => HierarchyMatcher::check_hierarchy_field_equals(&all_lines, idx, "child_text", v, &hierarchy_config),
                        _ => HierarchyMatcher::check_hierarchy_field_contains(&all_lines, idx, "child_text", v, &hierarchy_config),
                    };
                    if !hit {
                        ok = false; break;
                    }
                } else if f == "first_child_class" {
                    let hit = match mode {
                        "regex" => HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, "child_class", v, &hierarchy_config),
                        "equals" => HierarchyMatcher::check_hierarchy_field_equals(&all_lines, idx, "child_class", v, &hierarchy_config),
                        _ => HierarchyMatcher::check_hierarchy_field_contains(&all_lines, idx, "child_class", v, &hierarchy_config),
                    };
                    if !hit {
                        ok = false; break;
                    }
                } else if f == "text" || f == "content-desc" {
                    let hit = match mode {
                        "regex" => {
                            if let Ok(re) = regex::Regex::new(v) {
                                // 🔧 修复：提取字段值进行正则匹配，而不是匹配整行
                                if let Some(field_value) = extract_field_value(line, f) {
                                    re.is_match(&field_value)
                                } else {
                                    false
                                }
                            } else { 
                                false 
                            }
                        }
                        "equals" => line.contains(&format!("{}=\"{}\"", f, v)),
                        _ => line.contains(&format!("{}=\"{}\"", f, v)) || line.contains(v),
                    };
                    if !hit { ok = false; break; }
                } else if f == "resource-id" {
                    if !line.contains(&format!("resource-id=\"{}\"", v)) && !line.contains(&format!("resource-id=\".*/{}\"", v)) {
                        if !line.contains(v) { ok = false; break; }
                    }
                } else {
                    if !line.contains(&format!("{}=\"{}\"", f, v)) { ok = false; break; }
                }
            }
        }
        if !ok { continue; }

        // 2) 额外包含：includes（若某字段有 includes 条件，则每个词都必须出现；仅对被选字段生效）
        for (f, words) in &criteria.includes {
            if !criteria.fields.contains(f) { continue; }
            if *f == "bounds" && ignore_bounds { continue; }
            for w in words {
                if w.trim().is_empty() { continue; }
                
                // 🆕 使用增强层级匹配器处理包含条件
                if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    if !HierarchyMatcher::check_hierarchy_field(&all_lines, idx, f, w, &hierarchy_config) {
                        ok = false;
                        break;
                    }
                }
                // 处理传统子元素字段包含条件
                else if f == "first_child_text" {
                    if !HierarchyMatcher::check_hierarchy_field(&all_lines, idx, "child_text", w, &hierarchy_config) {
                        ok = false; break;
                    }
                } else if f == "first_child_class" {
                    if !HierarchyMatcher::check_hierarchy_field(&all_lines, idx, "child_class", w, &hierarchy_config) {
                        ok = false; break;
                    }
                } else {
                    // 文本类字段使用包含判断；其他字段也使用包含以增强兼容
                    if !line.contains(&format!("{}=\"{}\"", f, w)) && !line.contains(w) {
                        ok = false; break;
                    }
                }
            }
            if !ok { break; }
        }
        if !ok { continue; }

        // 2.1) 额外包含：regex_includes（若有，则每个正则都必须命中；仅对被选字段生效）
        for (f, patterns) in &criteria.regex_includes {
            if !criteria.fields.contains(f) { continue; }
            if *f == "bounds" && ignore_bounds { continue; }
            for pat in patterns {
                if pat.trim().is_empty() { continue; }
                let hit = if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, f, pat, &hierarchy_config)
                } else {
                    // 🔧 修复：提取字段值进行正则匹配，而不是匹配整行
                    if let Some(field_value) = extract_field_value(line, f) {
                        regex::Regex::new(pat).ok().map(|re| re.is_match(&field_value)).unwrap_or(false)
                    } else {
                        // 对于没有明确字段值的情况，回退到原来的行匹配
                        regex::Regex::new(pat).ok().map(|re| re.is_match(line)).unwrap_or(false)
                    }
                };
                if !hit { ok = false; break; }
            }
            if !ok { break; }
        }
        if !ok { continue; }

        // 3) 不包含：excludes（若某字段有 excludes 条件，则任何一个词出现都判为不匹配；仅对被选字段生效）
        for (f, words) in &criteria.excludes {
            if !criteria.fields.contains(f) { continue; }
            if *f == "bounds" && ignore_bounds { continue; }
            for w in words {
                if w.trim().is_empty() { continue; }
                
                // 🆕 使用增强层级匹配器处理排除条件
                if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    if HierarchyMatcher::check_hierarchy_field(&all_lines, idx, f, w, &hierarchy_config) {
                        ok = false; // 找到排除词，匹配失败
                        break;
                    }
                }
                // 处理传统子元素字段排除条件
                else if f == "first_child_text" {
                    if HierarchyMatcher::check_hierarchy_field(&all_lines, idx, "child_text", w, &hierarchy_config) {
                        ok = false; break;
                    }
                } else if f == "first_child_class" {
                    if HierarchyMatcher::check_hierarchy_field(&all_lines, idx, "child_class", w, &hierarchy_config) {
                        ok = false; break;
                    }
                } else {
                    if line.contains(&format!("{}=\"{}\"", f, w)) || line.contains(w) {
                        ok = false; break;
                    }
                }
            }
            if !ok { break; }
        }
        if !ok { continue; }

        // 3.1) 不包含：regex_excludes（任一正则命中即不匹配；仅对被选字段生效）
        for (f, patterns) in &criteria.regex_excludes {
            if !criteria.fields.contains(f) { continue; }
            if *f == "bounds" && ignore_bounds { continue; }
            for pat in patterns {
                if pat.trim().is_empty() { continue; }
                let hit = if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, f, pat, &hierarchy_config)
                } else {
                    // 🔧 修复：提取字段值进行正则匹配，而不是匹配整行
                    if let Some(field_value) = extract_field_value(line, f) {
                        regex::Regex::new(pat).ok().map(|re| re.is_match(&field_value)).unwrap_or(false)
                    } else {
                        // 对于没有明确字段值的情况，回退到原来的行匹配
                        regex::Regex::new(pat).ok().map(|re| re.is_match(line)).unwrap_or(false)
                    }
                };
                if hit { ok = false; break; }
            }
            if !ok { break; }
        }
        if !ok { continue; }

        // 记录命中索引；不立即返回，留待择优
        // 限制打印关键信息，避免日志爆炸
        if let Some(b) = extract_field_value(line, "bounds") {
            tracing::debug!("[XML] ✅ 候选命中 #{} bounds={}", idx, b);
        } else {
            tracing::debug!("[XML] ✅ 候选命中 #{} (无bounds)", idx);
        }
        matched_indices.push(idx);
    }
    // 没有任何命中
    if matched_indices.is_empty() {
        tracing::info!("[XML] 未找到匹配元素");
        return Ok(MatchResultDTO { ok: false, message: "未找到匹配元素".into(), total: Some(0), matchedIndex: None, preview: None });
    }

    // 从多个命中中选择最佳匹配
    let best_index = if matched_indices.len() == 1 {
        tracing::info!("[XML] 仅有 1 个候选，直接选用 #{}", matched_indices[0]);
        matched_indices[0]
    } else {
        tracing::info!("[XML] 共命中 {} 个候选，进入择优逻辑", matched_indices.len());
        let chosen = select_best_match(&matched_indices, &node_lines, &criteria);
        tracing::info!("[XML] 择优选择结果: #{}", chosen);
        chosen
    };

    {
        // 构造预览
        let line = node_lines[best_index];
        let get_attr = |name: &str| -> Option<String> {
            let pat = format!("{}=\"", name);
            if let Some(s) = line.find(&pat) {
                let start = s + pat.len();
                if let Some(e) = line[start..].find('"') { return Some(line[start..start+e].to_string()); }
            }
            None
        };
        let preview = MatchPreviewDTO {
            text: get_attr("text"),
            resource_id: get_attr("resource-id"),
            class_name: get_attr("class"),
            package: get_attr("package"),
            bounds: get_attr("bounds"),
            xpath: None,
        };
        tracing::info!(
            "[XML] 最终选择: index=#{} text={:?} resource-id={:?} class={:?} bounds={:?}",
            best_index,
            preview.text,
            preview.resource_id,
            preview.class_name,
            preview.bounds
        );
        Ok(MatchResultDTO { ok: true, message: "已匹配".into(), total: Some(matched_indices.len()), matchedIndex: Some(best_index), preview: Some(preview) })
    }
}