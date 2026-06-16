use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppCategory {
    Work,
    NonWork,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BrowserUrlClass {
    Work,
    Video,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserTabContext {
    pub browser_name: String,
    pub url_host: Option<String>,
    pub url_class: BrowserUrlClass,
    pub source: String,
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
    pub browser_context: Option<BrowserTabContext>,
}
