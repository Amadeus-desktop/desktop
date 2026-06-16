use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub context_class: OcrContextClass,
    pub visible_text_classes: Vec<String>,
    pub content_kind: String,
    pub confidence: f64,
    pub sensitive_hits: usize,
    pub source_ttl_ms: u128,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OcrContextClass {
    WorkDocument,
    CodeError,
    VideoPlayer,
    AiChatCompanion,
    PrivateChat,
    Game,
    Unknown,
}

impl OcrContextClass {
    pub fn can_promote_unknown_to_work_like(self) -> bool {
        matches!(self, Self::WorkDocument | Self::CodeError)
    }

    pub fn blocks_non_work_drift(self) -> bool {
        matches!(
            self,
            Self::VideoPlayer
                | Self::AiChatCompanion
                | Self::PrivateChat
                | Self::Game
                | Self::Unknown
        )
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrProviderStatus {
    pub provider: String,
    pub available: bool,
    pub detail: String,
}
