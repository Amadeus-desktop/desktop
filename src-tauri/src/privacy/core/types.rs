use serde::Serialize;

use crate::{
    macos_context::{AppCategory, MacosContextSnapshot},
    timeline::ContextEvent,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SensitiveReason {
    PasswordManager,
    Finance,
    Messaging,
    Email,
    Government,
    Authentication,
    CustomKeyword,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyAssessment {
    pub is_sensitive: bool,
    pub reason: Option<SensitiveReason>,
    pub matched_keyword: Option<String>,
    pub should_suppress_capture: bool,
    pub should_suppress_utterance: bool,
    pub redacted_window_title: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenCapturePermissionStatus {
    pub platform: String,
    pub granted: bool,
    pub can_request: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RedactedContextSnapshot {
    pub app_name: String,
    pub bundle_identifier: String,
    pub process_id: i32,
    pub window_title: String,
    pub idle_seconds: f64,
    pub category: AppCategory,
    pub frontmost_duration_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyContext {
    pub snapshot: RedactedContextSnapshot,
    pub assessment: PrivacyAssessment,
    pub screen_capture_permission: ScreenCapturePermissionStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyCheckedContextEvent {
    pub snapshot: RedactedContextSnapshot,
    pub assessment: PrivacyAssessment,
    pub screen_capture_permission: ScreenCapturePermissionStatus,
    pub context_event: ContextEvent,
}

impl RedactedContextSnapshot {
    pub fn from_assessment(
        snapshot: &MacosContextSnapshot,
        assessment: &PrivacyAssessment,
    ) -> Self {
        Self {
            app_name: snapshot.app_name.clone(),
            bundle_identifier: snapshot.bundle_identifier.clone(),
            process_id: snapshot.process_id,
            window_title: assessment.redacted_window_title.clone(),
            idle_seconds: snapshot.idle_seconds,
            category: snapshot.category,
            frontmost_duration_ms: snapshot.frontmost_duration_ms,
        }
    }
}
