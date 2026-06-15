use super::{CaptureGateInput, CaptureMetadata, GateDecision};

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
