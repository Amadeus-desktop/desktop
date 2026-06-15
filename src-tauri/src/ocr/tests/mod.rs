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

    assert_eq!(
        observation.text_summary_redacted,
        "[redacted-sensitive-ocr]"
    );
    assert!(!serialized.contains("token=abc123"));
    assert!(!serialized.contains("/Users/user/private.pdf"));
}

#[test]
fn ocr_state_recognizes_only_approved_fresh_capture() {
    let state = OcrState::new(Box::new(FakeOcrAdapter));
    let capture = CaptureMetadata {
        approved: true,
        captured_at_ms: 1_000,
        ttl_ms: 1_000,
        sensitive_marker: false,
    };

    let observation = state
        .recognize_captured_image(vec![1, 2, 3], capture, 1_500)
        .expect("fresh capture routes through adapter");

    assert_eq!(observation.source_ttl_ms, 30_000);
    assert_eq!(observation.sensitive_hits, 2);
}

#[test]
fn ocr_state_blocks_expired_capture_before_adapter() {
    let state = OcrState::new(Box::new(FakeOcrAdapter));
    let capture = CaptureMetadata {
        approved: true,
        captured_at_ms: 1_000,
        ttl_ms: 250,
        sensitive_marker: false,
    };

    let error = state
        .recognize_captured_image(vec![1, 2, 3], capture, 1_500)
        .expect_err("expired capture is denied before OCR");

    assert_eq!(error.to_string(), "ocr denied: capture_expired");
}

#[test]
fn screen_ocr_workflow_captures_then_recognizes_when_gate_allows() {
    let ocr = OcrState::new(Box::new(PlainOcrAdapter));
    let capture = ScreenCaptureState::new(Box::new(FakeScreenCaptureAdapter));
    let gate = CaptureGateInput {
        privacy_risk_score: 10,
        sensitive_context: false,
        screen_capture_permission_granted: true,
        user_screen_context_enabled: true,
        known_meeting_app_frontmost: false,
    };

    let observation = capture
        .capture_and_recognize(&ocr, gate, 2_000)
        .expect("allowed screen capture reaches OCR");

    assert_eq!(observation.text_summary_redacted, "planning document");
}

#[test]
fn screen_ocr_workflow_blocks_capture_before_adapter_when_gate_denies() {
    let ocr = OcrState::new(Box::new(PlainOcrAdapter));
    let capture = ScreenCaptureState::new(Box::new(FakeScreenCaptureAdapter));
    let gate = CaptureGateInput {
        privacy_risk_score: 80,
        sensitive_context: false,
        screen_capture_permission_granted: true,
        user_screen_context_enabled: true,
        known_meeting_app_frontmost: false,
    };

    let error = capture
        .capture_and_recognize(&ocr, gate, 2_000)
        .expect_err("privacy hard-deny blocks screen capture");

    assert_eq!(error.to_string(), "ocr denied: sensitive_context");
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

struct PlainOcrAdapter;

impl OcrAdapter for PlainOcrAdapter {
    fn id(&self) -> &'static str {
        "plain"
    }

    fn status(&self) -> OcrProviderStatus {
        OcrProviderStatus {
            provider: self.id().to_string(),
            available: true,
            detail: "plain adapter".to_string(),
        }
    }

    fn recognize_image_bytes(&self, _image_bytes: Vec<u8>) -> Result<OcrObservation, OcrError> {
        Ok(redacted_observation_from_adapter_text("planning document", 0.9))
    }
}

struct FakeScreenCaptureAdapter;

impl ScreenCaptureAdapter for FakeScreenCaptureAdapter {
    fn capture_primary_display(&self, now_ms: u128) -> Result<CapturedImage, OcrError> {
        Ok(CapturedImage {
            image_bytes: vec![1, 2, 3],
            metadata: CaptureMetadata {
                approved: true,
                captured_at_ms: now_ms,
                ttl_ms: 1_000,
                sensitive_marker: false,
            },
        })
    }
}
