use anyhow::Result;
use tracing::{info, warn};
use serde_json::Value;

/// 滑动参数验证器
#[derive(Debug, Clone)]
pub struct SwipeValidator {
    pub device_id: String,
    pub screen_width: u32,
    pub screen_height: u32,
}

impl SwipeValidator {
    pub fn new(device_id: String, screen_width: u32, screen_height: u32) -> Self {
        Self {
            device_id,
            screen_width,
            screen_height,
        }
    }

    /// 验证滑动参数的有效性
    pub fn validate_swipe_params(&self, params: &Value) -> Result<ValidatedSwipeParams> {
        let start_x = params["start_x"].as_i64()
            .ok_or_else(|| anyhow::anyhow!("缺少start_x参数"))? as u32;
        let start_y = params["start_y"].as_i64()
            .ok_or_else(|| anyhow::anyhow!("缺少start_y参数"))? as u32;
        let end_x = params["end_x"].as_i64()
            .ok_or_else(|| anyhow::anyhow!("缺少end_x参数"))? as u32;
        let end_y = params["end_y"].as_i64()
            .ok_or_else(|| anyhow::anyhow!("缺少end_y参数"))? as u32;
        let duration = params.get("duration")
            .and_then(|v| v.as_u64())
            .unwrap_or(300) as u32;

        // 验证坐标是否在屏幕范围内
        if start_x >= self.screen_width || end_x >= self.screen_width {
            warn!("⚠️ X坐标超出屏幕范围: start_x={}, end_x={}, 屏幕宽度={}", 
                  start_x, end_x, self.screen_width);
        }
        if start_y >= self.screen_height || end_y >= self.screen_height {
            warn!("⚠️ Y坐标超出屏幕范围: start_y={}, end_y={}, 屏幕高度={}", 
                  start_y, end_y, self.screen_height);
        }

        // 检查滑动距离
        let distance = ((end_x as i32 - start_x as i32).pow(2) + 
                       (end_y as i32 - start_y as i32).pow(2)) as f32;
        let distance = distance.sqrt();
        
        if distance < 10.0 {
            warn!("⚠️ 滑动距离过小: {:.1}px，可能无法触发滑动", distance);
        }
        
        info!("✅ 滑动参数验证通过: ({},{}) → ({},{}) 距离={:.1}px 时长={}ms", 
              start_x, start_y, end_x, end_y, distance, duration);

        Ok(ValidatedSwipeParams {
            start_x,
            start_y,
            end_x,
            end_y,
            duration,
            distance: distance as u32,
            direction: self.detect_direction(start_x, start_y, end_x, end_y),
        })
    }

    /// 检测滑动方向
    fn detect_direction(&self, start_x: u32, start_y: u32, end_x: u32, end_y: u32) -> SwipeDirection {
        let dx = end_x as i32 - start_x as i32;
        let dy = end_y as i32 - start_y as i32;
        
        if dx.abs() > dy.abs() {
            if dx > 0 { SwipeDirection::Right } else { SwipeDirection::Left }
        } else {
            if dy > 0 { SwipeDirection::Down } else { SwipeDirection::Up }
        }
    }
}

/// 验证后的滑动参数
#[derive(Debug, Clone)]
pub struct ValidatedSwipeParams {
    pub start_x: u32,
    pub start_y: u32,
    pub end_x: u32,
    pub end_y: u32,
    pub duration: u32,
    pub distance: u32,
    pub direction: SwipeDirection,
}

/// 滑动方向
#[derive(Debug, Clone, Copy)]
pub enum SwipeDirection {
    Up,
    Down,
    Left,
    Right,
}

impl std::fmt::Display for SwipeDirection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SwipeDirection::Up => write!(f, "向上"),
            SwipeDirection::Down => write!(f, "向下"),
            SwipeDirection::Left => write!(f, "向左"),
            SwipeDirection::Right => write!(f, "向右"),
        }
    }
}