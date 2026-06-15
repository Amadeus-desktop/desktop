use crate::{
    macos_context::MacosContextSnapshot,
    privacy::{get_screen_capture_permission_status, PrivacyAssessment},
};

use super::super::TriggerEvaluation;

pub(super) fn trigger_context_metadata_json(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
) -> String {
    serde_json::json!({
        "bundleIdentifier": &snapshot.bundle_identifier,
        "processId": snapshot.process_id,
        "idleSeconds": snapshot.idle_seconds,
        "category": snapshot.category,
        "frontmostDurationMs": snapshot.frontmost_duration_ms,
        "privacy": {
            "isSensitive": privacy.is_sensitive,
            "reason": privacy.reason,
            "matchedKeyword": &privacy.matched_keyword,
            "shouldSuppressCapture": privacy.should_suppress_capture,
            "shouldSuppressUtterance": privacy.should_suppress_utterance,
        },
        "screenCapturePermission": get_screen_capture_permission_status(),
        "trigger": {
            "candidate": &evaluation.candidate,
            "speakabilityScore": evaluation.speakability_score,
            "action": evaluation.action,
        },
    })
    .to_string()
}
