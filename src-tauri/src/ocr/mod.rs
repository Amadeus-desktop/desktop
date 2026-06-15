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

#[derive(Debug, Clone)]
struct RawOcrText {
    value: String,
}

impl RawOcrText {
    fn new_for_adapter(value: impl Into<String>) -> Self {
        Self {
            value: value.into(),
        }
    }
}

pub fn redacted_observation_from_adapter_text(
    raw_text: impl Into<String>,
    confidence: f64,
) -> OcrObservation {
    build_ocr_observation(RawOcrText::new_for_adapter(raw_text), confidence)
}

pub fn pre_capture_gate(input: CaptureGateInput) -> GateDecision {
    if input.privacy_risk_score >= 70 || input.sensitive_context {
        return denied("sensitive_context");
    }
    if !input.screen_capture_permission_granted {
        return denied("screen_capture_permission_missing");
    }
    if !input.user_screen_context_enabled {
        return denied("screen_context_disabled");
    }
    if input.known_meeting_app_frontmost {
        return denied("meeting_frontmost");
    }
    allowed()
}

pub fn pre_ocr_gate(capture: &CaptureMetadata, now_ms: u128) -> GateDecision {
    if !capture.approved {
        return denied("capture_not_approved");
    }
    if capture.sensitive_marker {
        return denied("capture_sensitive_marker");
    }
    if now_ms.saturating_sub(capture.captured_at_ms) > capture.ttl_ms {
        return denied("capture_expired");
    }
    allowed()
}

fn build_ocr_observation(raw: RawOcrText, confidence: f64) -> OcrObservation {
    let sensitive_hits = sensitive_hit_count(&raw.value);
    let text_summary_redacted = if sensitive_hits > 0 {
        "[redacted-sensitive-ocr]".to_string()
    } else {
        summarize_ocr_text(&raw.value)
    };

    OcrObservation {
        text_summary_redacted,
        visible_text_classes: visible_text_classes(&raw.value),
        content_kind: content_kind(&raw.value).to_string(),
        confidence: confidence.clamp(0.0, 1.0),
        sensitive_hits,
        source_ttl_ms: 30_000,
    }
}

fn allowed() -> GateDecision {
    GateDecision {
        allowed: true,
        reason: "allowed",
    }
}

fn denied(reason: &'static str) -> GateDecision {
    GateDecision {
        allowed: false,
        reason,
    }
}

fn sensitive_hit_count(value: &str) -> usize {
    value
        .split_whitespace()
        .filter(|part| is_sensitive_ocr_token(part))
        .count()
}

fn is_sensitive_ocr_token(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    value.contains('/')
        || value.contains('\\')
        || lower.contains("://")
        || lower.contains("token=")
        || lower.contains("password=")
        || lower.contains("api_key=")
        || lower.contains("secret=")
        || lower.contains(".xlsx")
        || lower.contains(".docx")
        || lower.contains(".pdf")
        || lower.contains(".hwp")
}

fn summarize_ocr_text(value: &str) -> String {
    value
        .split_whitespace()
        .take(12)
        .collect::<Vec<_>>()
        .join(" ")
}

fn visible_text_classes(value: &str) -> Vec<String> {
    let lower = value.to_ascii_lowercase();
    let mut classes = Vec::new();
    if lower.contains("http") {
        classes.push("url_like".to_string());
    }
    if lower.contains("todo") || lower.contains("planning") {
        classes.push("planning_text".to_string());
    }
    if classes.is_empty() {
        classes.push("plain_text".to_string());
    }
    classes
}

fn content_kind(value: &str) -> &'static str {
    let lower = value.to_ascii_lowercase();
    if lower.contains("planning") || lower.contains("document") {
        "document"
    } else if lower.contains("http") {
        "browser"
    } else {
        "unknown"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pre_capture_gate_blocks_sensitive_context() {
        let input = CaptureGateInput {
            privacy_risk_score: 80,
            sensitive_context: true,
            screen_capture_permission_granted: true,
            user_screen_context_enabled: true,
            known_meeting_app_frontmost: false,
        };

        let decision = pre_capture_gate(input);

        assert!(!decision.allowed);
        assert_eq!(decision.reason, "sensitive_context");
    }

    #[test]
    fn pre_ocr_gate_blocks_expired_capture() {
        let capture = CaptureMetadata {
            approved: true,
            captured_at_ms: 1_000,
            ttl_ms: 500,
            sensitive_marker: false,
        };

        let decision = pre_ocr_gate(&capture, 1_600);

        assert!(!decision.allowed);
        assert_eq!(decision.reason, "capture_expired");
    }

    #[test]
    fn raw_ocr_text_never_leaves_adapter() {
        let observation = redacted_observation_from_adapter_text(
            "secret token=abc123 /Users/user/private.docx",
            0.91,
        );

        let serialized = serde_json::to_string(&observation).expect("observation serializes");
        assert!(!serialized.contains("token=abc123"));
        assert!(!serialized.contains("/Users/user/private.docx"));
        assert_eq!(observation.sensitive_hits, 2);
    }

    #[test]
    fn ocr_observation_has_no_raw_text_field() {
        let observation = redacted_observation_from_adapter_text("plain planning document", 0.82);
        let value = serde_json::to_value(&observation).expect("observation json");

        assert!(value.get("rawText").is_none());
        assert!(value.get("text").is_none());
        assert!(value.get("textSummaryRedacted").is_some());
    }

    #[test]
    fn ocr_state_reports_central_adapter_status() {
        let state = OcrState::new(Box::new(DisabledOcrAdapter::new("test-disabled")));

        let status = state.status();

        assert_eq!(status.provider, "disabled");
        assert!(!status.available);
        assert_eq!(status.detail, "test-disabled");
    }

    #[test]
    fn ocr_state_routes_bytes_through_adapter_without_raw_text_escape() {
        let state = OcrState::new(Box::new(FakeOcrAdapter));

        let observation = state
            .recognize_image_bytes(vec![1, 2, 3])
            .expect("fake adapter returns observation");
        let serialized = serde_json::to_string(&observation).expect("observation serializes");

        assert_eq!(observation.text_summary_redacted, "[redacted-sensitive-ocr]");
        assert!(!serialized.contains("token=abc123"));
        assert!(!serialized.contains("/Users/user/private.pdf"));
    }

    struct FakeOcrAdapter;

    impl OcrAdapter for FakeOcrAdapter {
        fn id(&self) -> &'static str {
            "fake"
        }

        fn status(&self) -> OcrProviderStatus {
            OcrProviderStatus {
                provider: self.id().to_string(),
                available: true,
                detail: "fake adapter".to_string(),
            }
        }

        fn recognize_image_bytes(&self, _image_bytes: Vec<u8>) -> Result<OcrObservation, OcrError> {
            Ok(redacted_observation_from_adapter_text(
                "token=abc123 /Users/user/private.pdf",
                0.9,
            ))
        }
    }
}
