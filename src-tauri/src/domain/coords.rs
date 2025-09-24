use serde::{Deserialize, Serialize};

/// Coordinate value can be absolute pixels or percentage of the screen.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "unit", content = "value", rename_all = "snake_case")]
pub enum Coord {
    Px(u32),
    Percent(f32),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Point<T> {
    pub x: T,
    pub y: T,
}

impl<T> Point<T> {
    pub fn new(x: T, y: T) -> Self { Self { x, y } }
}
