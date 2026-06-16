use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppCategory {
    Work,
    NonWork,
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MacosContextSnapshot {
    pub app_name: String,
    pub bundle_identifier: String,
    pub process_id: i32,
    pub window_title: String,
    pub idle_seconds: f64,
    pub category: AppCategory,
    pub frontmost_duration_ms: u128,
    pub is_fullscreen: bool,
}
