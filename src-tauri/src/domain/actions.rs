use serde::{Deserialize, Serialize};

use super::coords::{Coord, Point};
use super::direction::Direction;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    Tap {
        x: Coord,
        y: Coord,
        #[serde(default)]
        duration_ms: Option<u32>,
    },
    Swipe {
        start: Point<Coord>,
        end: Point<Coord>,
        duration_ms: u32,
    },
    SmartScroll {
        direction: Direction,
        #[serde(default = "default_speed_ms")]
        speed_ms: u32,
        #[serde(default = "default_distance_px")]
        distance: u32,
    },
    InputText { text: String },
    KeyEvent { code: i32 },
    Wait { ms: u32 },
}

fn default_speed_ms() -> u32 { 300 }
fn default_distance_px() -> u32 { 600 }
