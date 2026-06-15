use crate::macos_context::MacosContextSnapshot;

use super::{PrivacyAssessment, SensitiveReason};

const REDACTED_WINDOW_TITLE: &str = "[민감 창 숨김]";

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
        redacted_window_title: REDACTED_WINDOW_TITLE.to_string(),
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
