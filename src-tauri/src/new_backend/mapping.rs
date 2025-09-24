use crate::domain::actions::Action;
use crate::domain::coords::{Coord, Point};
use crate::domain::direction::Direction;

#[derive(Debug, Clone)]
pub struct LegacyStep {
    pub step_type: String,
    pub parameters: serde_json::Value,
}

#[allow(dead_code)]
pub fn map_legacy_to_actions(steps: &[LegacyStep]) -> Vec<Action> {
    steps.iter().filter_map(|s| map_one(&s.step_type, &s.parameters)).collect()
}

fn map_one(t: &str, p: &serde_json::Value) -> Option<Action> {
    match t.to_lowercase().as_str() {
        "tap" => {
            let x = p.get("x").and_then(|v| v.as_u64()).unwrap_or(540) as u32;
            let y = p.get("y").and_then(|v| v.as_u64()).unwrap_or(960) as u32;
            Some(Action::Tap { x: Coord::Px(x), y: Coord::Px(y), duration_ms: None })
        }
        "swipe" => {
            let sx = p.get("start_x").and_then(|v| v.as_u64()).unwrap_or(540) as u32;
            let sy = p.get("start_y").and_then(|v| v.as_u64()).unwrap_or(1500) as u32;
            let ex = p.get("end_x").and_then(|v| v.as_u64()).unwrap_or(540) as u32;
            let ey = p.get("end_y").and_then(|v| v.as_u64()).unwrap_or(500) as u32;
            let dur = p.get("duration").and_then(|v| v.as_u64()).unwrap_or(300) as u32;
            Some(Action::Swipe { start: Point { x: Coord::Px(sx), y: Coord::Px(sy) }, end: Point { x: Coord::Px(ex), y: Coord::Px(ey) }, duration_ms: dur })
        }
        "smart_scroll" => {
            let direction = match p.get("direction").and_then(|v| v.as_str()).unwrap_or("down") {
                "up" => Direction::Up,
                "left" => Direction::Left,
                "right" => Direction::Right,
                _ => Direction::Down,
            };
            let speed_ms = p.get("speed_ms").and_then(|v| v.as_u64()).unwrap_or(300) as u32;
            let distance = p.get("distance").and_then(|v| v.as_u64()).unwrap_or(600) as u32;
            Some(Action::SmartScroll { direction, speed_ms, distance })
        }
        "wait" => {
            let ms = p.get("duration").and_then(|v| v.as_u64()).unwrap_or(500) as u32;
            Some(Action::Wait { ms })
        }
        "input" => {
            let text = p.get("text").and_then(|v| v.as_str()).unwrap_or("").to_string();
            Some(Action::InputText { text })
        }
        "keyevent" => {
            let code = p.get("code").and_then(|v| v.as_i64()).unwrap_or(4) as i32; // default BACK
            Some(Action::KeyEvent { code })
        }
        _ => None,
    }
}
