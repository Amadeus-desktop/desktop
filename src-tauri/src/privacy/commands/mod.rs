use tauri::State;

use crate::{
    macos_context::{read_current_snapshot, ContextBridgeState},
    timeline::{CreateContextEventInput, TimelineState},
};

use super::{
    assess_privacy, get_screen_capture_permission_status, CommandError, PrivacyCheckedContextEvent,
    PrivacyContext, RedactedContextSnapshot,
};

#[tauri::command]
pub fn assess_current_privacy_context(
    context_state: State<'_, ContextBridgeState>,
    keywords: Vec<String>,
) -> Result<PrivacyContext, CommandError> {
    let snapshot = read_current_snapshot(&context_state)?;
    let assessment = assess_privacy(&snapshot, &keywords);

    Ok(PrivacyContext {
        snapshot: RedactedContextSnapshot::from_assessment(&snapshot, &assessment),
        assessment,
        screen_capture_permission: get_screen_capture_permission_status(),
    })
}

#[tauri::command]
pub fn capture_privacy_checked_context_event(
    context_state: State<'_, ContextBridgeState>,
    timeline_state: State<'_, TimelineState>,
    keywords: Vec<String>,
) -> Result<PrivacyCheckedContextEvent, CommandError> {
    let snapshot = read_current_snapshot(&context_state)?;
    let assessment = assess_privacy(&snapshot, &keywords);
    let screen_capture_permission = get_screen_capture_permission_status();
    let metadata_json = serde_json::json!({
        "bundleIdentifier": snapshot.bundle_identifier,
        "processId": snapshot.process_id,
        "idleSeconds": snapshot.idle_seconds,
        "category": snapshot.category,
        "frontmostDurationMs": snapshot.frontmost_duration_ms,
        "browserContext": snapshot.browser_context.as_ref().map(|context| serde_json::json!({
            "browserName": context.browser_name,
            "urlHost": context.url_host,
            "urlClass": context.url_class,
            "source": context.source,
        })),
        "privacy": {
            "isSensitive": assessment.is_sensitive,
            "reason": assessment.reason,
            "matchedKeyword": assessment.matched_keyword,
            "shouldSuppressCapture": assessment.should_suppress_capture,
            "shouldSuppressUtterance": assessment.should_suppress_utterance,
        },
        "screenCapturePermission": screen_capture_permission,
    })
    .to_string();

    let mut repository = timeline_state
        .repository()
        .lock()
        .map_err(|_| CommandError::from("timeline repository lock was poisoned".to_string()))?;
    let context_event = repository
        .create_context_event(CreateContextEventInput {
            app_name: snapshot.app_name.clone(),
            window_title: assessment.redacted_window_title.clone(),
            event_type: if assessment.is_sensitive {
                "privacy_filter_applied".to_string()
            } else {
                "macos_context_snapshot".to_string()
            },
            metadata_json,
        })
        .map_err(|error| CommandError::from(error.to_string()))?;

    Ok(PrivacyCheckedContextEvent {
        snapshot: RedactedContextSnapshot::from_assessment(&snapshot, &assessment),
        assessment,
        screen_capture_permission,
        context_event,
    })
}
