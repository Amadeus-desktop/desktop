use super::*;
use crate::macos_context::{AppCategory, MacosContextSnapshot};

#[test]
fn marks_password_manager_as_sensitive() {
    let snapshot = snapshot("1Password", "com.1password.1password", "Vault");
    let assessment = assess_privacy(&snapshot, &[]);

    assert!(assessment.is_sensitive);
    assert_eq!(assessment.reason, Some(SensitiveReason::PasswordManager));
    assert!(assessment.should_suppress_capture);
    assert!(assessment.should_suppress_utterance);
    assert_eq!(assessment.redacted_window_title, "[민감 창 숨김]");
}

#[test]
fn marks_sensitive_window_title_as_sensitive() {
    let snapshot = snapshot("Safari", "com.apple.Safari", "정부24 주민등록등본");
    let assessment = assess_privacy(&snapshot, &[]);

    assert!(assessment.is_sensitive);
    assert_eq!(assessment.reason, Some(SensitiveReason::Government));
}

#[test]
fn marks_custom_keyword_as_sensitive() {
    let snapshot = snapshot("Notes", "com.apple.Notes", "Acme 인사평가");
    let assessment = assess_privacy(&snapshot, &["인사평가".to_string()]);

    assert!(assessment.is_sensitive);
    assert_eq!(assessment.reason, Some(SensitiveReason::CustomKeyword));
    assert_eq!(assessment.matched_keyword, Some("인사평가".to_string()));
}

#[test]
fn leaves_normal_work_context_unmasked() {
    let snapshot = snapshot("Visual Studio Code", "com.microsoft.VSCode", "main.rs");
    let assessment = assess_privacy(&snapshot, &[]);

    assert!(!assessment.is_sensitive);
    assert_eq!(assessment.reason, None);
    assert!(!assessment.should_suppress_capture);
    assert!(!assessment.should_suppress_utterance);
    assert_eq!(assessment.redacted_window_title, "main.rs");
}

#[test]
fn redacted_snapshot_never_exposes_raw_sensitive_title() {
    let snapshot = snapshot("Safari", "com.apple.Safari", "정부24 주민등록등본");
    let assessment = assess_privacy(&snapshot, &[]);

    let redacted = RedactedContextSnapshot::from_assessment(&snapshot, &assessment);

    assert_eq!(redacted.window_title, "[민감 창 숨김]");
    assert_ne!(redacted.window_title, snapshot.window_title);
    assert_eq!(redacted.app_name, "Safari");
}

fn snapshot(app_name: &str, bundle_identifier: &str, window_title: &str) -> MacosContextSnapshot {
    MacosContextSnapshot {
        app_name: app_name.to_string(),
        bundle_identifier: bundle_identifier.to_string(),
        process_id: 100,
        window_title: window_title.to_string(),
        idle_seconds: 0.0,
        category: AppCategory::Work,
        frontmost_duration_ms: 1000,
        is_fullscreen: false,
        browser_context: None,
    }
}
