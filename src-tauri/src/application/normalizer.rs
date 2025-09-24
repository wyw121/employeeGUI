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
		_ => (t, params),
	}
}

