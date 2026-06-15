use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CaptureGateInput {
    pub privacy_risk_score: i64,
    pub sensitive_context: bool,
    pub screen_capture_permission_granted: bool,
    pub user_screen_context_enabled: bool,
    pub known_meeting_app_frontmost: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GateDecision {
    pub allowed: bool,
    pub reason: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CaptureMetadata {
    pub approved: bool,
    pub captured_at_ms: u128,
    pub ttl_ms: u128,
    pub sensitive_marker: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrObservation {
    pub text_summary_redacted: String,
    pub visible_text_classes: Vec<String>,
    pub content_kind: String,
    pub confidence: f64,
    pub sensitive_hits: usize,
    pub source_ttl_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrProviderStatus {
    pub provider: String,
    pub available: bool,
    pub detail: String,
}
