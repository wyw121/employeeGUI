use anyhow::{anyhow, Result};
use regex::Regex;
use serde_json::Value;
use tracing::{debug, warn};

#[derive(Debug, Clone, Copy)]
pub struct Rect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl Rect {
    pub fn center(&self) -> (i32, i32) {
        (((self.left + self.right) / 2), ((self.top + self.bottom) / 2))
    }
}

/// 尝试从多种格式解析 bounds：
/// - JSON 对象：{ left, top, right, bottom }
/// - 字符串："[l,t][r,b]" 或 "l,t,r,b"
/// - JSON 数组：[l, t, r, b]
pub fn parse_bounds_value(v: &Value) -> Result<Rect> {
    debug!("🔍 解析 bounds 值: {:?}", v);
    
    // 对象格式
    if let Some(obj) = v.as_object() {
        debug!("🔧 尝试对象格式解析");
        return parse_bounds_object(obj);
    }
    // 数组格式
    if let Some(arr) = v.as_array() {
        debug!("🔧 尝试数组格式解析 (长度: {})", arr.len());
        if arr.len() == 4 {
            let to_i32 = |i: usize| -> Result<i32> {
                arr.get(i)
                    .and_then(|x| x.as_i64())
                    .map(|x| x as i32)
                    .ok_or_else(|| anyhow!("bounds 数组索引 {} 不是整数", i))
            };
            let rect = Rect {
                left: to_i32(0)?,
                top: to_i32(1)?,
                right: to_i32(2)?,
                bottom: to_i32(3)?,
            };
            debug!("✅ 数组格式解析成功: left={}, top={}, right={}, bottom={}", rect.left, rect.top, rect.right, rect.bottom);
            return Ok(rect);
        } else {
            warn!("❌ 数组长度不为4，无法解析: {}", arr.len());
        }
    }
    // 字符串格式
    if let Some(s) = v.as_str() {
        debug!("🔧 尝试字符串格式解析");
        return parse_bounds_str(s);
    }
    
    warn!("❌ 无法从该值解析 bounds: {:?}", v);
    Err(anyhow!("无法从该值解析 bounds: {:?} (类型: {})", v, match v {
        Value::Null => "null",
        Value::Bool(_) => "boolean", 
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }))
}

pub fn parse_bounds_str(input: &str) -> Result<Rect> {
    debug!("🔍 解析 bounds 字符串: '{}'", input);
    
    // 归一化：去除空白，将全角括号转半角
    let mut s = input.trim().to_string();
    s = s.replace('（', "[").replace('）', "]");
    s = s.replace('【', "[").replace('】', "]");
    s = s.replace(' ', "");
    
    debug!("🔧 归一化后: '{}'", s);

    // 先匹配标准格式 [l,t][r,b]
    if let Some(rect) = parse_bounds_bracket_format(&s) {
        debug!("✅ 匹配到标准格式: left={}, top={}, right={}, bottom={}", rect.left, rect.top, rect.right, rect.bottom);
        return Ok(rect);
    }
    // 再尝试逗号分隔 l,t,r,b
    if let Some(rect) = parse_bounds_csv_format(&s) {
        debug!("✅ 匹配到CSV格式: left={}, top={}, right={}, bottom={}", rect.left, rect.top, rect.right, rect.bottom);
        return Ok(rect);
    }
    
    warn!("❌ 无法解析 bounds 字符串: '{}' (原始: '{}')", s, input);
    Err(anyhow!("无法解析 bounds 字符串: {} (归一化后: {})", input, s))
}

fn parse_bounds_bracket_format(s: &str) -> Option<Rect> {
    // 允许中间存在一个或多个空格/无关字符已经在上游去除
    let re: Regex = Regex::new(r"^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$").ok()?;
    let caps = re.captures(s)?;
    let left = caps.get(1)?.as_str().parse::<i32>().ok()?;
    let top = caps.get(2)?.as_str().parse::<i32>().ok()?;
    let right = caps.get(3)?.as_str().parse::<i32>().ok()?;
    let bottom = caps.get(4)?.as_str().parse::<i32>().ok()?;
    Some(Rect { left, top, right, bottom })
}

fn parse_bounds_csv_format(s: &str) -> Option<Rect> {
    // 支持诸如 "l,t,r,b" 或 "[l,t,r,b]"
    let cleaned = s.trim_matches('[').trim_matches(']');
    let parts: Vec<_> = cleaned.split(',').collect();
    if parts.len() != 4 { return None; }
    let p = |i: usize| parts[i].parse::<i32>().ok();
    Some(Rect { left: p(0)?, top: p(1)?, right: p(2)?, bottom: p(3)? })
}

fn parse_bounds_object(obj: &serde_json::Map<String, Value>) -> Result<Rect> {
    // 支持多种键名：left/top/right/bottom 或 l/t/r/b 或 x1/y1/x2/y2
    let get_i32 = |keys: &[&str]| -> Option<i32> {
        for k in keys {
            if let Some(v) = obj.get(*k) {
                if let Some(n) = v.as_i64() { return Some(n as i32); }
                if let Some(s) = v.as_str() { if let Ok(n) = s.parse::<i32>() { return Some(n); } }
            }
        }
        None
    };

    let left = get_i32(&["left", "l", "x1"]).ok_or_else(|| anyhow!("bounds 对象缺少 left/l/x1"))?;
    let top = get_i32(&["top", "t", "y1"]).ok_or_else(|| anyhow!("bounds 对象缺少 top/t/y1"))?;
    let right = get_i32(&["right", "r", "x2"]).ok_or_else(|| anyhow!("bounds 对象缺少 right/r/x2"))?;
    let bottom = get_i32(&["bottom", "b", "y2"]).ok_or_else(|| anyhow!("bounds 对象缺少 bottom/b/y2"))?;
    Ok(Rect { left, top, right, bottom })
}
