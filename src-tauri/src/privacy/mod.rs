use serde::Serialize;
use tauri::State;

use crate::{
    macos_context::{
        read_current_snapshot, AppCategory, ContextBridgeState, MacosContextError,
        MacosContextSnapshot,
    },
    timeline::{ContextEvent, CreateContextEventInput, TimelineState},
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<String> for CommandError {
    fn from(message: String) -> Self {
        Self { message }
    }
}

impl From<MacosContextError> for CommandError {
    fn from(error: MacosContextError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

#[tauri::command]
pub fn get_screen_capture_permission_status() -> ScreenCapturePermissionStatus {
    screen_capture_permission_status()
}

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
        screen_capture_permission: screen_capture_permission_status(),
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
    let screen_capture_permission = screen_capture_permission_status();
    let metadata_json = serde_json::json!({
        "bundleIdentifier": snapshot.bundle_identifier,
        "processId": snapshot.process_id,
        "idleSeconds": snapshot.idle_seconds,
        "category": snapshot.category,
        "frontmostDurationMs": snapshot.frontmost_duration_ms,
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

pub fn assess_privacy(
    snapshot: &MacosContextSnapshot,
    custom_keywords: &[String],
) -> PrivacyAssessment {
    let haystack = format!(
        "{} {} {}",
        snapshot.app_name, snapshot.bundle_identifier, snapshot.window_title
    )
    .to_ascii_lowercase();

    if let Some(keyword) = custom_keywords
        .iter()
        .map(|keyword| keyword.trim())
        .filter(|keyword| !keyword.is_empty())
        .find(|keyword| haystack.contains(&keyword.to_ascii_lowercase()))
    {
        return sensitive(SensitiveReason::CustomKeyword, Some(keyword.to_string()));
    }

    for rule in SENSITIVE_RULES {
        if rule
            .keywords
            .iter()
            .any(|keyword| haystack.contains(keyword))
        {
            return sensitive(rule.reason, None);
        }
    }

    PrivacyAssessment {
        is_sensitive: false,
        reason: None,
        matched_keyword: None,
        should_suppress_capture: false,
        should_suppress_utterance: false,
        redacted_window_title: snapshot.window_title.clone(),
    }
}

fn sensitive(reason: SensitiveReason, matched_keyword: Option<String>) -> PrivacyAssessment {
    PrivacyAssessment {
        is_sensitive: true,
        reason: Some(reason),
        matched_keyword,
        should_suppress_capture: true,
        should_suppress_utterance: true,
        redacted_window_title: "[민감 창 숨김]".to_string(),
    }
}

struct SensitiveRule {
    reason: SensitiveReason,
    keywords: &'static [&'static str],
}

const SENSITIVE_RULES: &[SensitiveRule] = &[
    SensitiveRule {
        reason: SensitiveReason::PasswordManager,
        keywords: &[
            "1password",
            "bitwarden",
            "lastpass",
            "keychain",
            "password manager",
        ],
    },
    SensitiveRule {
        reason: SensitiveReason::Finance,
        keywords: &[
            "bank",
            "banking",
            "card",
            "paypal",
            "toss",
            "kakaobank",
            "결제",
            "은행",
        ],
    },
    SensitiveRule {
        reason: SensitiveReason::Messaging,
        keywords: &[
            "kakaotalk",
            "messages",
            "telegram",
            "slack",
            "discord",
            "메신저",
        ],
    },
    SensitiveRule {
        reason: SensitiveReason::Email,
        keywords: &["mail", "gmail", "outlook", "email", "이메일"],
    },
    SensitiveRule {
        reason: SensitiveReason::Government,
        keywords: &["정부24", "hometax", "민원", "주민등록", "등본", "인증서"],
    },
    SensitiveRule {
        reason: SensitiveReason::Authentication,
        keywords: &[
            "login",
            "signin",
            "otp",
            "2fa",
            "인증",
            "비밀번호",
            "password",
        ],
    },
];

#[cfg(target_os = "macos")]
fn screen_capture_permission_status() -> ScreenCapturePermissionStatus {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGPreflightScreenCaptureAccess() -> bool;
    }

    ScreenCapturePermissionStatus {
        platform: "macos".to_string(),
        granted: unsafe { CGPreflightScreenCaptureAccess() },
        can_request: true,
    }
}

#[cfg(not(target_os = "macos"))]
fn screen_capture_permission_status() -> ScreenCapturePermissionStatus {
    ScreenCapturePermissionStatus {
        platform: "unsupported".to_string(),
        granted: false,
        can_request: false,
    }
}

#[cfg(test)]
mod tests {
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

    fn snapshot(
        app_name: &str,
        bundle_identifier: &str,
        window_title: &str,
    ) -> MacosContextSnapshot {
        MacosContextSnapshot {
            app_name: app_name.to_string(),
            bundle_identifier: bundle_identifier.to_string(),
            process_id: 100,
            window_title: window_title.to_string(),
            idle_seconds: 0.0,
            category: AppCategory::Work,
            frontmost_duration_ms: 1000,
        }
    }
}
