/**
 * src-tauri/src/services/execution/matching/hierarchy_matcher.rs
 * 增强层级匹配器 - 支持任意深度的parent/child/descendant搜索
 */

use std::collections::HashMap;
use regex::Regex;

#[derive(Debug, Clone)]
pub struct HierarchyMatchConfig {
    pub enable_parent_context: bool,
    pub enable_child_context: bool,
    pub enable_descendant_search: bool,
    pub max_depth: usize,
    pub prioritize_semantic_fields: bool,
}

impl Default for HierarchyMatchConfig {
    fn default() -> Self {
        Self {
            enable_parent_context: true,
            enable_child_context: true,
            enable_descendant_search: false, // 默认关闭深度搜索以提高性能
            max_depth: 2,
            prioritize_semantic_fields: true,
        }
    }
}

#[derive(Debug, Clone)]
pub struct XmlNode {
    pub line_idx: usize,
    pub indent_level: usize,
    pub attributes: HashMap<String, String>,
    pub raw_line: String,
}

pub struct HierarchyMatcher;

impl HierarchyMatcher {
    /// 增强的层级字段检查
    /// 支持 parent_*, child_*, descendant_* 等层级字段
    pub fn check_hierarchy_field(
        all_lines: &[&str], 
        node_idx: usize, 
        field_name: &str, 
        expected_value: &str,
        config: &HierarchyMatchConfig
    ) -> bool {
        let nodes = Self::parse_xml_nodes(all_lines);
        if node_idx >= nodes.len() {
            return false;
        }

        let current_node = &nodes[node_idx];
        
        // 解析字段名以确定搜索范围
        if field_name.starts_with("parent_") {
            let attr_name = &field_name[7..]; // 去掉 "parent_" 前缀
            Self::check_parent_field(&nodes, node_idx, attr_name, expected_value, config)
        } else if field_name.starts_with("child_") {
            let attr_name = Self::parse_child_field_name(field_name);
            let depth = Self::parse_child_depth(field_name);
            Self::check_child_field(&nodes, node_idx, &attr_name, expected_value, depth, config)
        } else if field_name.starts_with("descendant_") {
            let attr_name = &field_name[11..]; // 去掉 "descendant_" 前缀
            Self::check_descendant_field(&nodes, node_idx, attr_name, expected_value, config)
        } else if field_name.starts_with("ancestor_") {
            let attr_name = &field_name[9..]; // 去掉 "ancestor_" 前缀
            Self::check_ancestor_field(&nodes, node_idx, attr_name, expected_value, config)
        } else {
            // 当前节点字段
            current_node.attributes.get(field_name)
                .map(|v| v == expected_value)
                .unwrap_or(false)
        }
    }

    /// 分模式：等于匹配
    pub fn check_hierarchy_field_equals(
        all_lines: &[&str],
        node_idx: usize,
        field_name: &str,
        expected_value: &str,
        config: &HierarchyMatchConfig
    ) -> bool {
        let nodes = Self::parse_xml_nodes(all_lines);
        if node_idx >= nodes.len() { return false; }
        let attr_name = Self::parse_child_field_name(field_name);
        if field_name.starts_with("parent_") {
            return Self::check_parent_field(&nodes, node_idx, &field_name[7..], expected_value, config);
        } else if field_name.starts_with("child_") || field_name.starts_with("first_child_") {
            let depth = Self::parse_child_depth(field_name);
            return Self::check_child_field(&nodes, node_idx, &attr_name, expected_value, depth, config);
        } else if field_name.starts_with("descendant_") {
            return Self::check_descendant_field(&nodes, node_idx, &field_name[11..], expected_value, config);
        } else if field_name.starts_with("ancestor_") {
            return Self::check_ancestor_field(&nodes, node_idx, &field_name[9..], expected_value, config);
        }
        nodes[node_idx].attributes.get(field_name).map(|v| v == expected_value).unwrap_or(false)
    }

    /// 分模式：包含匹配
    pub fn check_hierarchy_field_contains(
        all_lines: &[&str],
        node_idx: usize,
        field_name: &str,
        expected_substring: &str,
        config: &HierarchyMatchConfig
    ) -> bool {
        let nodes = Self::parse_xml_nodes(all_lines);
        if node_idx >= nodes.len() { return false; }
        let attr_name = Self::parse_child_field_name(field_name);
        let matcher = |val: &str| val.contains(expected_substring);
        if field_name.starts_with("parent_") {
            let current_indent = nodes[node_idx].indent_level;
            for i in (0..node_idx).rev() {
                let node = &nodes[i];
                if node.indent_level < current_indent {
                    if let Some(value) = node.attributes.get(&field_name[7..]) { return matcher(value); }
                    break;
                }
            }
            return false;
        } else if field_name.starts_with("child_") || field_name.starts_with("first_child_") {
            let depth = Self::parse_child_depth(field_name);
            let current_indent = nodes[node_idx].indent_level;
            let mut level = 0usize;
            for i in (nodes[node_idx].line_idx + 1)..all_lines.len() {
                let line = all_lines[i];
                if !line.contains("<node") { continue; }
                let indent = line.chars().take_while(|&c| c == ' ').count();
                if indent > current_indent { level += 1; } else if indent <= current_indent { break; }
                if let Some(d) = depth { if level != d { continue; } }
                let attrs = Self::parse_xml_attributes(line);
                if let Some(val) = attrs.get(&attr_name) { if matcher(val) { return true; } }
            }
            return false;
        } else if field_name.starts_with("descendant_") {
            let current_indent = nodes[node_idx].indent_level;
            for i in (nodes[node_idx].line_idx + 1)..all_lines.len() {
                let line = all_lines[i];
                if !line.contains("<node") { continue; }
                let indent = line.chars().take_while(|&c| c == ' ').count();
                if indent <= current_indent { break; }
                let attrs = Self::parse_xml_attributes(line);
                if let Some(val) = attrs.get(&field_name[11..]) { if matcher(val) { return true; } }
            }
            return false;
        } else if field_name.starts_with("ancestor_") {
            let current_indent = nodes[node_idx].indent_level;
            for i in (0..node_idx).rev() {
                let node = &nodes[i];
                if node.indent_level < current_indent {
                    if let Some(val) = node.attributes.get(&field_name[9..]) { return matcher(val); }
                }
            }
            return false;
        }
        nodes[node_idx].attributes.get(field_name).map(|v| v.contains(expected_substring)).unwrap_or(false)
    }

    /// 分模式：正则匹配
    pub fn check_hierarchy_field_regex(
        all_lines: &[&str],
        node_idx: usize,
        field_name: &str,
        pattern: &str,
        config: &HierarchyMatchConfig
    ) -> bool {
        let re = if let Ok(r) = Regex::new(pattern) { r } else { return false; };
        let nodes = Self::parse_xml_nodes(all_lines);
        if node_idx >= nodes.len() { return false; }
        let attr_name = Self::parse_child_field_name(field_name);
        let matcher = |val: &str| re.is_match(val);
        if field_name.starts_with("parent_") {
            let current_indent = nodes[node_idx].indent_level;
            for i in (0..node_idx).rev() {
                let node = &nodes[i];
                if node.indent_level < current_indent {
                    if let Some(value) = node.attributes.get(&field_name[7..]) { return matcher(value); }
                    break;
                }
            }
            return false;
        } else if field_name.starts_with("child_") || field_name.starts_with("first_child_") {
            let depth = Self::parse_child_depth(field_name);
            let current_indent = nodes[node_idx].indent_level;
            let mut level = 0usize;
            for i in (nodes[node_idx].line_idx + 1)..all_lines.len() {
                let line = all_lines[i];
                if !line.contains("<node") { continue; }
                let indent = line.chars().take_while(|&c| c == ' ').count();
                if indent > current_indent { level += 1; } else if indent <= current_indent { break; }
                if let Some(d) = depth { if level != d { continue; } }
                let attrs = Self::parse_xml_attributes(line);
                if let Some(val) = attrs.get(&attr_name) { if matcher(val) { return true; } }
            }
            return false;
        } else if field_name.starts_with("descendant_") {
            let current_indent = nodes[node_idx].indent_level;
            for i in (nodes[node_idx].line_idx + 1)..all_lines.len() {
                let line = all_lines[i];
                if !line.contains("<node") { continue; }
                let indent = line.chars().take_while(|&c| c == ' ').count();
                if indent <= current_indent { break; }
                let attrs = Self::parse_xml_attributes(line);
                if let Some(val) = attrs.get(&field_name[11..]) { if matcher(val) { return true; } }
            }
            return false;
        } else if field_name.starts_with("ancestor_") {
            let current_indent = nodes[node_idx].indent_level;
            for i in (0..node_idx).rev() {
                let node = &nodes[i];
                if node.indent_level < current_indent {
                    if let Some(val) = node.attributes.get(&field_name[9..]) { if matcher(val) { return true; } }
                }
            }
            return false;
        }
        nodes[node_idx].attributes.get(field_name).map(|v| matcher(v)).unwrap_or(false)
    }

    /// 检查父节点字段
    fn check_parent_field(
        nodes: &[XmlNode], 
        node_idx: usize, 
        attr_name: &str, 
        expected_value: &str,
        _config: &HierarchyMatchConfig
    ) -> bool {
        let current_node = &nodes[node_idx];
        let current_indent = current_node.indent_level;

        // 向上查找父节点（缩进级别更小的节点）
        for i in (0..node_idx).rev() {
            let node = &nodes[i];
            if node.indent_level < current_indent {
                // 找到父节点
                if let Some(value) = node.attributes.get(attr_name) {
                    return value == expected_value;
                }
                break; // 只检查直接父节点
            }
        }
        
        false
    }

    /// 检查子节点字段（支持指定深度）
    fn check_child_field(
        nodes: &[XmlNode], 
        node_idx: usize, 
        attr_name: &str, 
        expected_value: &str,
        target_depth: Option<usize>,
        config: &HierarchyMatchConfig
    ) -> bool {
        let current_node = &nodes[node_idx];
        let current_indent = current_node.indent_level;
        let max_search_depth = target_depth.unwrap_or(config.max_depth);

        // 向下查找子节点
        for i in (node_idx + 1)..nodes.len() {
            let node = &nodes[i];
            let depth_diff = node.indent_level.saturating_sub(current_indent);
            
            if node.indent_level <= current_indent {
                // 已经到了同级或更高级节点，停止搜索
                break;
            }
            
            if depth_diff > max_search_depth {
                // 超过最大搜索深度
                continue;
            }

            // 检查目标深度（如果指定）
            if let Some(target) = target_depth {
                if depth_diff != target {
                    continue;
                }
            }

            // 检查属性匹配
            if let Some(value) = node.attributes.get(attr_name) {
                if value == expected_value {
                    return true;
                }
            }
        }
        
        false
    }

    /// 检查后代节点字段（任意深度）
    fn check_descendant_field(
        nodes: &[XmlNode], 
        node_idx: usize, 
        attr_name: &str, 
        expected_value: &str,
        config: &HierarchyMatchConfig
    ) -> bool {
        if !config.enable_descendant_search {
            return false;
        }

        let current_node = &nodes[node_idx];
        let current_indent = current_node.indent_level;
        let mut depth_count = 0;

        // 向下查找所有后代节点
        for i in (node_idx + 1)..nodes.len() {
            let node = &nodes[i];
            
            if node.indent_level <= current_indent {
                // 已经到了同级或更高级节点，停止搜索
                break;
            }
            
            depth_count += 1;
            if depth_count > config.max_depth * 10 {
                // 防止过深搜索影响性能
                break;
            }

            // 检查属性匹配
            if let Some(value) = node.attributes.get(attr_name) {
                if value == expected_value {
                    return true;
                }
            }
        }
        
        false
    }

    /// 检查祖先节点字段
    fn check_ancestor_field(
        nodes: &[XmlNode], 
        node_idx: usize, 
        attr_name: &str, 
        expected_value: &str,
        config: &HierarchyMatchConfig
    ) -> bool {
        let current_node = &nodes[node_idx];
        let current_indent = current_node.indent_level;
        let mut depth_count = 0;

        // 向上查找所有祖先节点
        for i in (0..node_idx).rev() {
            let node = &nodes[i];
            if node.indent_level >= current_indent {
                continue; // 跳过同级或子级节点
            }
            
            depth_count += 1;
            if depth_count > config.max_depth * 5 {
                // 防止过深搜索
                break;
            }

            // 检查属性匹配
            if let Some(value) = node.attributes.get(attr_name) {
                if value == expected_value {
                    return true;
                }
            }
        }
        
        false
    }

    /// 解析XML节点信息
    fn parse_xml_nodes(all_lines: &[&str]) -> Vec<XmlNode> {
        let mut nodes = Vec::new();
        
        for (line_idx, &line) in all_lines.iter().enumerate() {
            if line.contains("<node") {
                let indent_level = line.chars().take_while(|&c| c == ' ').count();
                let attributes = Self::parse_xml_attributes(line);
                
                nodes.push(XmlNode {
                    line_idx,
                    indent_level,
                    attributes,
                    raw_line: line.to_string(),
                });
            }
        }
        
        nodes
    }

    /// 解析XML属性
    fn parse_xml_attributes(line: &str) -> HashMap<String, String> {
        let mut attributes = HashMap::new();
        
        // 匹配 attribute="value" 格式
        let attr_regex = Regex::new(r#"(\w+[-\w]*)\s*=\s*"([^"]*)"#).unwrap();
        
        for cap in attr_regex.captures_iter(line) {
            if let (Some(key), Some(value)) = (cap.get(1), cap.get(2)) {
                attributes.insert(key.as_str().to_string(), value.as_str().to_string());
            }
        }
        
        attributes
    }

    /// 解析子字段名称（处理 child_0_text, child_text, first_child_text 等格式）
    fn parse_child_field_name(field_name: &str) -> String {
        if field_name.starts_with("child_") {
            let parts: Vec<&str> = field_name.split('_').collect();
            if parts.len() >= 3 {
                // child_0_text -> text, child_1_class -> class
                parts[2..].join("_")
            } else {
                // child_text -> text
                field_name[6..].to_string()
            }
        } else if field_name.starts_with("first_child_") {
            // first_child_text -> text
            field_name[12..].to_string()
        } else {
            field_name.to_string()
        }
    }

    /// 解析子字段深度（child_0_text -> Some(1), child_2_class -> Some(3)）
    fn parse_child_depth(field_name: &str) -> Option<usize> {
        if field_name.starts_with("child_") {
            let parts: Vec<&str> = field_name.split('_').collect();
            if parts.len() >= 3 {
                if let Ok(depth_num) = parts[1].parse::<usize>() {
                    return Some(depth_num + 1); // 0-based to 1-based
                }
            }
        }
        
        // first_child_* 默认为深度1
        if field_name.starts_with("first_child_") {
            return Some(1);
        }
        
        None
    }

    /// 增强的文本包含检查（支持层级）
    pub fn check_hierarchy_text_contains(
        all_lines: &[&str], 
        node_idx: usize, 
        field_name: &str, 
        search_texts: &[String],
        config: &HierarchyMatchConfig
    ) -> bool {
        for search_text in search_texts {
            if Self::check_hierarchy_field(all_lines, node_idx, field_name, search_text, config) {
                return true;
            }
        }
        false
    }

    /// 增强的文本排除检查（支持层级）
    pub fn check_hierarchy_text_excludes(
        all_lines: &[&str], 
        node_idx: usize, 
        field_name: &str, 
        exclude_texts: &[String],
        config: &HierarchyMatchConfig
    ) -> bool {
        for exclude_text in exclude_texts {
            if Self::check_hierarchy_field(all_lines, node_idx, field_name, exclude_text, config) {
                return true; // 找到排除文本，匹配失败
            }
        }
        false // 没有找到排除文本，匹配成功
    }
}