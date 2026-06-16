mod evaluation_tests;
mod runtime_tests;
mod scenario_tests;
mod suppression_tests;

pub(super) use super::*;
use crate::{
    macos_context::{AppCategory, MacosContextSnapshot},
    privacy::PrivacyAssessment,
};

fn snapshot(
    category: AppCategory,
    idle_seconds: f64,
    frontmost_duration_ms: u128,
) -> MacosContextSnapshot {
    MacosContextSnapshot {
        app_name: "Visual Studio Code".to_string(),
        bundle_identifier: "com.microsoft.VSCode".to_string(),
        process_id: 100,
        window_title: "Amadeus".to_string(),
        idle_seconds,
        category,
        frontmost_duration_ms,
        is_fullscreen: false,
        browser_context: None,
    }
}

fn normal_privacy(window_title: &str) -> PrivacyAssessment {
    PrivacyAssessment {
        is_sensitive: false,
        reason: None,
        matched_keyword: None,
        should_suppress_capture: false,
        should_suppress_utterance: false,
        redacted_window_title: window_title.to_string(),
    }
}

fn sensitive_privacy() -> PrivacyAssessment {
    PrivacyAssessment {
        is_sensitive: true,
        reason: None,
        matched_keyword: None,
        should_suppress_capture: true,
        should_suppress_utterance: true,
        redacted_window_title: "[민감 창 숨김]".to_string(),
    }
}
