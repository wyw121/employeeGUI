use crate::domain::actions::Action;
use crate::domain::coords::{Coord, Point};
use crate::domain::direction::Direction;
use crate::application::device_metrics::DeviceMetrics;

fn coord_to_px(coord: &Coord, max: u32) -> u32 {
	match coord {
		Coord::Px(v) => (*v).min(max),
		Coord::Percent(p) => ((*p).clamp(0.0, 100.0) / 100.0 * max as f32).round() as u32,
	}
}

fn point_to_px_coord(point: &Point<Coord>, m: &DeviceMetrics) -> Point<Coord> {
	Point {
		x: Coord::Px(coord_to_px(&point.x, m.width_px)),
		y: Coord::Px(coord_to_px(&point.y, m.height_px)),
	}
}

pub fn normalize_action(action: Action, metrics: &DeviceMetrics) -> Action {
	match action {
		Action::Tap { x, y, duration_ms } => Action::Tap {
			x: Coord::Px(coord_to_px(&x, metrics.width_px)),
			y: Coord::Px(coord_to_px(&y, metrics.height_px)),
			duration_ms,
		},
		Action::Swipe { start, end, duration_ms } => Action::Swipe {
			start: point_to_px_coord(&start, metrics),
			end: point_to_px_coord(&end, metrics),
			duration_ms,
		},
		Action::SmartScroll { direction, speed_ms, distance: _ } => {
			// Default semantic scroll: 50% X, 70% -> 30% Y (down), opposite for up.
			let (start, end) = match direction {
				Direction::Down => (
					Point { x: Coord::Percent(50.0), y: Coord::Percent(70.0) },
					Point { x: Coord::Percent(50.0), y: Coord::Percent(30.0) },
				),
				Direction::Up => (
					Point { x: Coord::Percent(50.0), y: Coord::Percent(30.0) },
					Point { x: Coord::Percent(50.0), y: Coord::Percent(70.0) },
				),
				Direction::Left => (
					Point { x: Coord::Percent(30.0), y: Coord::Percent(50.0) },
					Point { x: Coord::Percent(70.0), y: Coord::Percent(50.0) },
				),
				Direction::Right => (
					Point { x: Coord::Percent(70.0), y: Coord::Percent(50.0) },
					Point { x: Coord::Percent(30.0), y: Coord::Percent(50.0) },
				),
			};
			let start_px = point_to_px_coord(&start, metrics);
			let end_px = point_to_px_coord(&end, metrics);
			Action::Swipe { start: start_px, end: end_px, duration_ms: speed_ms.clamp(150, 800) }
		}
		other => other,
	}
}

/// JSON-level normalization for legacy inbound steps (snake_case types and flat params),
/// returns a possibly rewritten JSON parameters object and unified type string.
pub fn normalize_step_json(step_type: &str, mut params: serde_json::Value, metrics: &DeviceMetrics) -> (String, serde_json::Value) {
	let t = step_type.to_lowercase();
	match t.as_str() {
		"smart_scroll" => {
			let direction = params.get("direction").and_then(|v| v.as_str()).unwrap_or("down");
			let from_edge = params.get("from_edge").and_then(|v| v.as_bool()).unwrap_or(false);
			if from_edge {
				// 基于边缘的返回手势：按 edge 与方向推导坐标
				let edge = params.get("edge").and_then(|v| v.as_str()).unwrap_or("left");
				let y_percent = params.get("y_percent").and_then(|v| v.as_f64()).unwrap_or(50.0).clamp(0.0, 100.0);
				let distance_percent = params.get("distance_percent").and_then(|v| v.as_f64()).unwrap_or(45.0).clamp(5.0, 95.0);
				let duration = params.get("speed_ms").and_then(|v| v.as_u64()).unwrap_or(260) as u32;

				let y = ((y_percent / 100.0) * metrics.height_px as f64).round() as u32;
				let (start_x_pct, end_x_pct) = match (edge, direction) {
					("left", "right") => (3.0, distance_percent),
					("right", "left") => (97.0, 100.0 - distance_percent),
					("left", _) => (3.0, distance_percent),
					("right", _) => (97.0, 100.0 - distance_percent),
					_ => (3.0, distance_percent),
				};
				let sx = ((start_x_pct / 100.0) * metrics.width_px as f64).round() as u32;
				let ex = ((end_x_pct / 100.0) * metrics.width_px as f64).round() as u32;
				let mut p = serde_json::json!({
					"start_x": sx,
					"start_y": y,
					"end_x": ex,
					"end_y": y,
					"duration": duration,
				});
				if let Some(obj) = params.as_object() { for (k, v) in obj { p[ k ] = v.clone(); } }
				("swipe".to_string(), p)
			} else {
				let (start, end) = match direction {
					"up" => ((50.0, 30.0), (50.0, 70.0)),
					"left" => ((30.0, 50.0), (70.0, 50.0)),
					"right" => ((70.0, 50.0), (30.0, 50.0)),
					_ => ((50.0, 70.0), (50.0, 30.0)), // down
				};
				let (sx, sy) = (
					((start.0 / 100.0) * metrics.width_px as f32).round() as u32,
					((start.1 / 100.0) * metrics.height_px as f32).round() as u32,
				);
				let (ex, ey) = (
					((end.0 / 100.0) * metrics.width_px as f32).round() as u32,
					((end.1 / 100.0) * metrics.height_px as f32).round() as u32,
				);
				let duration = params.get("speed_ms").and_then(|v| v.as_u64()).unwrap_or(300) as u32;
				let mut p = serde_json::json!({
					"start_x": sx,
					"start_y": sy,
					"end_x": ex,
					"end_y": ey,
					"duration": duration,
				});
				if let Some(obj) = params.as_object() { for (k, v) in obj { p[ k ] = v.clone(); } }
				("swipe".to_string(), p)
			}
		}
		// 兼容前端传入的基于边缘的返回手势（from_edge=true）参数，统一补齐坐标
		// 允许 step_type 为 swipe，但仅含方向与 from_edge 等提示字段
		"swipe" => {
			let has_coords = params.get("start_x").is_some() && params.get("start_y").is_some()
				&& params.get("end_x").is_some() && params.get("end_y").is_some();
			let from_edge = params.get("from_edge").and_then(|v| v.as_bool()).unwrap_or(false);
			if !has_coords && from_edge {
				let dir = params.get("direction").and_then(|v| v.as_str()).unwrap_or("right");
				let edge = params.get("edge").and_then(|v| v.as_str()).unwrap_or("left");
				let y_percent = params.get("y_percent").and_then(|v| v.as_f64()).unwrap_or(50.0).clamp(0.0, 100.0);
				let distance_percent = params.get("distance_percent").and_then(|v| v.as_f64()).unwrap_or(45.0).clamp(5.0, 95.0);
				let duration = params.get("duration").and_then(|v| v.as_u64()).unwrap_or(260) as u32;

				// 计算起止点（像素）
				let y = ((y_percent / 100.0) * metrics.height_px as f64).round() as u32;
				let (start_x_pct, end_x_pct) = match (edge, dir) {
					("left", "right") => (3.0, distance_percent),      // 3% → ~45%
					("right", "left") => (97.0, 100.0 - distance_percent), // 97% → ~55%
					// 兜底：保持与方向一致
					("left", _) => (3.0, distance_percent),
					("right", _) => (97.0, 100.0 - distance_percent),
					_ => (3.0, distance_percent),
				};
				let sx = ((start_x_pct / 100.0) * metrics.width_px as f64).round() as u32;
				let ex = ((end_x_pct / 100.0) * metrics.width_px as f64).round() as u32;

				let mut p = serde_json::json!({
					"start_x": sx,
					"start_y": y,
					"end_x": ex,
					"end_y": y,
					"duration": duration,
				});
				if let Some(obj) = params.as_object() { for (k, v) in obj { p[ k ] = v.clone(); } }
				("swipe".to_string(), p)
			} else {
				(t, params)
			}
		}
		_ => (t, params),
	}
}

