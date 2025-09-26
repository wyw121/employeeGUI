use crate::xml_judgment_service::model::{MatchCriteriaDTO, MatchPreviewDTO, MatchResultDTO};
use crate::xml_judgment_service::parser::{extract_field_value, extract_node_opening_tags};
use crate::xml_judgment_service::fetch::XmlJudgmentService;
use crate::services::execution::matching::{HierarchyMatcher, HierarchyMatchConfig};

/// Select the best match among multiple candidates following prioritized rules.
pub fn select_best_match(matched_indices: &Vec<usize>, node_lines: &Vec<&str>, criteria: &MatchCriteriaDTO) -> usize {
    let rid_exact = criteria.values.get("resource-id").cloned();
    let text_exact = criteria.values.get("text").cloned();
    let desc_exact = criteria.values.get("content-desc").cloned();
    let class_exact = criteria.values.get("class").cloned();
    let package_exact = criteria.values.get("package").cloned();

    if let Some(rid) = rid_exact {
        for &idx in matched_indices { let line = node_lines[idx]; if line.contains(&format!("resource-id=\"{}\"", rid)) || line.contains(&format!("resource-id=\".*/{}\"", rid)) { return idx; } }
    }
    if let Some(txt) = text_exact { for &idx in matched_indices { let line = node_lines[idx]; if line.contains(&format!("text=\"{}\"", txt)) { return idx; } } }
    if let Some(desc) = desc_exact { for &idx in matched_indices { let line = node_lines[idx]; if line.contains(&format!("content-desc=\"{}\"", desc)) { return idx; } } }
    if let Some(cls) = class_exact { for &idx in matched_indices { let line = node_lines[idx]; if line.contains(&format!("class=\"{}\"", cls)) { return idx; } } }
    if let Some(pkg) = package_exact { for &idx in matched_indices { let line = node_lines[idx]; if line.contains(&format!("package=\"{}\"", pkg)) { return idx; } } }
    matched_indices[0]
}

/// Core matching pipeline (previously inside Tauri command).
pub async fn perform_criteria_match(device_id: &str, criteria: &MatchCriteriaDTO) -> Result<MatchResultDTO, String> {
    let xml = XmlJudgmentService::get_ui_xml(device_id).await?;
    let hierarchy_config = HierarchyMatchConfig {
        enable_parent_context: true,
        enable_child_context: true,
        enable_descendant_search: criteria.strategy == "smart_hierarchy",
        max_depth: 2,
        prioritize_semantic_fields: true,
    };

    let all_lines: Vec<&str> = xml.lines().collect();
    let node_opening_tags: Vec<String> = extract_node_opening_tags(&xml);
    let node_lines: Vec<&str> = if !node_opening_tags.is_empty() {
        node_opening_tags.iter().map(|s| s.as_str()).collect()
    } else {
        all_lines.iter().filter(|l| l.contains("<node")).cloned().collect()
    };
    if node_lines.is_empty() {
        return Ok(MatchResultDTO { ok: false, message: "未解析到任何节点".into(), total: Some(0), matchedIndex: None, preview: None });
    }

    let ignore_bounds = matches!(criteria.strategy.as_str(), "positionless"|"relaxed"|"strict"|"standard");
    let mut matched_indices: Vec<usize> = Vec::new();

    'outer: for (idx, line) in node_lines.iter().enumerate() {
        // 1) forward value checks
        for f in &criteria.fields {
            if *f == "bounds" && ignore_bounds { continue; }
            if let Some(v) = criteria.values.get(f) {
                let mode = criteria.match_mode.get(f).map(|s| s.as_str()).unwrap_or("contains");
                let hit = if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    match mode {
                        "regex" => HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, f, v, &hierarchy_config),
                        "equals" => HierarchyMatcher::check_hierarchy_field_equals(&all_lines, idx, f, v, &hierarchy_config),
                        _ => HierarchyMatcher::check_hierarchy_field_contains(&all_lines, idx, f, v, &hierarchy_config),
                    }
                } else if f == "text" || f == "content-desc" { match mode { "regex" => regex::Regex::new(v).ok().map(|re| extract_field_value(line, f).map(|fv| re.is_match(&fv)).unwrap_or(false)).unwrap_or(false), "equals" => line.contains(&format!("{}=\"{}\"", f, v)), _ => line.contains(&format!("{}=\"{}\"", f, v)) || line.contains(v), } } else if f == "resource-id" { line.contains(&format!("resource-id=\"{}\"", v)) || line.contains(&format!("resource-id=\".*/{}\"", v)) || line.contains(v) } else { line.contains(&format!("{}=\"{}\"", f, v)) };
                if !hit { continue 'outer; }
            }
        }
        // 2) includes
        for (f, words) in &criteria.includes { if !criteria.fields.contains(f) { continue; } if *f == "bounds" && ignore_bounds { continue; }
            for w in words { if w.trim().is_empty() { continue; }
                let hit = if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    HierarchyMatcher::check_hierarchy_field(&all_lines, idx, f, w, &hierarchy_config)
                } else { line.contains(&format!("{}=\"{}\"", f, w)) || line.contains(w) };
                if !hit { continue 'outer; }
            }
        }
        // 2.1 regex_includes
        for (f, patterns) in &criteria.regex_includes { if !criteria.fields.contains(f) { continue; } if *f == "bounds" && ignore_bounds { continue; }
            for pat in patterns { if pat.trim().is_empty() { continue; }
                let hit = if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, f, pat, &hierarchy_config)
                } else {
                    extract_field_value(line, f).map(|fv| regex::Regex::new(pat).ok().map(|re| re.is_match(&fv)).unwrap_or(false)).unwrap_or_else(|| regex::Regex::new(pat).ok().map(|re| re.is_match(line)).unwrap_or(false))
                };
                if !hit { continue 'outer; }
            }
        }
        // 3) excludes
        for (f, words) in &criteria.excludes { if !criteria.fields.contains(f) { continue; } if *f == "bounds" && ignore_bounds { continue; }
            for w in words { if w.trim().is_empty() { continue; }
                let hit = if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    HierarchyMatcher::check_hierarchy_field(&all_lines, idx, f, w, &hierarchy_config)
                } else { line.contains(&format!("{}=\"{}\"", f, w)) || line.contains(w) };
                if hit { continue 'outer; }
            }
        }
        // 3.1 regex_excludes
        for (f, patterns) in &criteria.regex_excludes { if !criteria.fields.contains(f) { continue; } if *f == "bounds" && ignore_bounds { continue; }
            for pat in patterns { if pat.trim().is_empty() { continue; }
                let hit = if f.starts_with("parent_") || f.starts_with("child_") || f.starts_with("descendant_") || f.starts_with("ancestor_") {
                    HierarchyMatcher::check_hierarchy_field_regex(&all_lines, idx, f, pat, &hierarchy_config)
                } else { extract_field_value(line, f).map(|fv| regex::Regex::new(pat).ok().map(|re| re.is_match(&fv)).unwrap_or(false)).unwrap_or_else(|| regex::Regex::new(pat).ok().map(|re| re.is_match(line)).unwrap_or(false)) };
                if hit { continue 'outer; }
            }
        }
        matched_indices.push(idx);
    }

    if matched_indices.is_empty() {
        return Ok(MatchResultDTO { ok: false, message: "未找到匹配元素".into(), total: Some(0), matchedIndex: None, preview: None });
    }

    let best_index = if matched_indices.len() == 1 { matched_indices[0] } else { select_best_match(&matched_indices, &node_lines, criteria) };
    let line = node_lines[best_index];
    let get_attr = |name: &str| -> Option<String> {
        let pat = format!("{}=\"", name);
        if let Some(s) = line.find(&pat) { let start = s + pat.len(); if let Some(e) = line[start..].find('"') { return Some(line[start..start+e].to_string()); } }
        None
    };
    let preview = MatchPreviewDTO { text: get_attr("text"), resource_id: get_attr("resource-id"), class_name: get_attr("class"), package: get_attr("package"), bounds: get_attr("bounds"), xpath: None };
    Ok(MatchResultDTO { ok: true, message: "已匹配".into(), total: Some(matched_indices.len()), matchedIndex: Some(best_index), preview: Some(preview) })
}
