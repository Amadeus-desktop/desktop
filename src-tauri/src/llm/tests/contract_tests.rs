use super::*;

#[test]
fn template_provider_envelope_excludes_context() {
    let mut source = policy_envelope();
    source.trigger_reason = "raw-file-/Users/user/private/spec.md".to_string();
    let envelope = source.for_provider(ProviderInputGrade::Template);

    assert_eq!(envelope.provider_grade, ProviderInputGrade::Template);
    assert_eq!(envelope.trigger_type, "milestone");
    assert_eq!(envelope.trigger_reason, "");
    assert_eq!(envelope.tone_hint, "");
    assert_eq!(envelope.fallback_message, "fallback");
    assert_eq!(envelope.persona_summary, None);
    assert_eq!(envelope.safe_memory_summary, None);
    assert_eq!(envelope.coarse_context_label, "");
    assert_eq!(envelope.redacted_window_title, None);
    assert_eq!(envelope.redacted_ocr_summary, None);
    assert_eq!(envelope.score_summary, None);
}

#[test]
fn api_provider_envelope_excludes_ocr_and_title() {
    let mut source = policy_envelope();
    source.trigger_reason = "raw-file-/Users/user/private/spec.md".to_string();
    let envelope = source.for_provider(ProviderInputGrade::ApiRedacted);

    assert_eq!(envelope.provider_grade, ProviderInputGrade::ApiRedacted);
    assert_eq!(
        envelope.persona_summary,
        Some("quiet companion".to_string())
    );
    assert_eq!(
        envelope.safe_memory_summary,
        Some("prefers concise support".to_string())
    );
    assert_eq!(envelope.coarse_context_label, "work");
    assert_eq!(envelope.trigger_reason, "");
    assert_eq!(envelope.tone_hint, "");
    assert_eq!(envelope.redacted_window_title, None);
    assert_eq!(envelope.redacted_ocr_summary, None);
    assert_eq!(envelope.score_summary, None);
    assert!(!format!("{envelope:?}").contains("/Users/user/private/spec.md"));
}

#[test]
fn chat_envelope_filters_provider_input() {
    let request = chat_request(vec![LlmChatMessage {
        role: "user".to_string(),
        content: "token=abc123 open example.com?token=abc and /Users/user/private.txt".to_string(),
    }]);

    let envelope =
        LlmChatEnvelope::from_request(request).for_provider(ProviderInputGrade::ApiRedacted);

    assert_eq!(envelope.provider_grade, ProviderInputGrade::ApiRedacted);
    assert_eq!(envelope.messages.len(), 1);
    assert!(!envelope.messages[0].content.contains("token=abc123"));
    assert!(!envelope.messages[0]
        .content
        .contains("example.com?token=abc"));
    assert!(!envelope.messages[0]
        .content
        .contains("/Users/user/private.txt"));
    assert!(envelope.messages[0].content.contains("[redacted]"));
}

#[test]
fn chat_envelope_preserves_and_redacts_prompt_envelope_for_local_qwen() {
    let mut request = chat_request(vec![LlmChatMessage {
        role: "user".to_string(),
        content: "오늘은 짧게 말해줘.".to_string(),
    }]);
    request.prompt_envelope = Some(serde_json::json!({
        "mode": "deep",
        "personaStatic": {
            "identity": {"name": "한서연"},
            "privacyContract": {"desktop_context": "원문 인용 금지"}
        },
        "currentContext": {
            "summary": "문서 작업 중",
            "raw_ocr_text": "token=abc123 /Users/user/private.pdf"
        }
    }));

    let envelope =
        LlmChatEnvelope::from_request(request).for_provider(ProviderInputGrade::LocalRedacted);
    let serialized = serde_json::to_string(&envelope.prompt_envelope).expect("json serializes");

    assert!(serialized.contains("한서연"));
    assert!(!serialized.contains("raw_ocr_text"));
    assert!(!serialized.contains("token=abc123"));
    assert!(!serialized.contains("/Users/user/private.pdf"));
}
