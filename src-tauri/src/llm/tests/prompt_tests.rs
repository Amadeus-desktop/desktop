use super::*;
use crate::ocr::redacted_observation_from_adapter_text;

#[test]
fn local_provider_prompt_uses_redacted_envelope_only() {
    let mut envelope = policy_envelope();
    envelope.trigger_reason = "raw-file-/Users/user/secret/report.xlsx".to_string();

    let prompt = local_utterance_prompt(&envelope.for_provider(ProviderInputGrade::LocalRedacted));

    assert!(prompt.contains("[redacted-title]"));
    assert!(prompt.contains("[redacted-ocr-summary]"));
    assert!(!prompt.contains("/Users/user/secret/report.xlsx"));
    assert!(!prompt.contains("raw screenshot"));
    assert!(!prompt.contains("raw OCR"));
}

#[test]
fn local_utterance_prompt_is_structured_json_with_persona_rules() {
    let mut envelope = policy_envelope();
    envelope.trigger_reason = "open /Users/user/secret/report.xlsx".to_string();

    let prompt = local_utterance_prompt(&envelope.for_provider(ProviderInputGrade::LocalRedacted));
    let value: serde_json::Value = serde_json::from_str(&prompt).expect("prompt is json");

    assert_eq!(value["task"], "companion_utterance");
    assert_eq!(value["persona"]["role"], "local_desktop_companion");
    assert!(value["persona"]["privacyRules"]
        .as_array()
        .expect("privacy rules")
        .iter()
        .any(|rule| rule
            == "never infer or reveal unredacted OCR, file paths, URLs, tokens, or passwords"));
    assert_eq!(value["outputContract"]["maxSentences"], 1);
    assert!(!prompt.contains("/Users/user/secret/report.xlsx"));
}

#[test]
fn local_chat_prompt_redacts_path_and_url_content() {
    let request = chat_request(vec![LlmChatMessage {
        role: "user".to_string(),
        content: "open /Users/user/secret/report.xlsx and https://example.test/token".to_string(),
    }]);

    let prompt = local_chat_prompt(&LlmChatEnvelope::from_request(request));

    assert!(!prompt.contains("/Users/user/secret/report.xlsx"));
    assert!(!prompt.contains("https://example.test/token"));
    assert!(prompt.contains("[redacted]"));
}

#[test]
fn local_chat_prompt_redacts_token_like_content_without_slashes() {
    let request = chat_request(vec![LlmChatMessage {
        role: "user".to_string(),
        content: "token=abc123 password=hunter2".to_string(),
    }]);

    let prompt = local_chat_prompt(&LlmChatEnvelope::from_request(request));

    assert!(!prompt.contains("token=abc123"));
    assert!(!prompt.contains("password=hunter2"));
    assert!(prompt.contains("[redacted]"));
}

#[test]
fn ocr_observation_attaches_only_redacted_summary_to_local_envelope() {
    let observation = redacted_observation_from_adapter_text(
        "planning token=abc123 /Users/user/private.pdf",
        0.91,
    );

    let envelope = policy_envelope()
        .with_redacted_ocr_summary(Some(observation.text_summary_redacted.clone()));
    let serialized = serde_json::to_string(&envelope).expect("envelope serializes");

    assert_eq!(
        envelope.redacted_ocr_summary.as_deref(),
        Some("[redacted-sensitive-ocr]")
    );
    assert!(!serialized.contains("token=abc123"));
    assert!(!serialized.contains("/Users/user/private.pdf"));
}

#[test]
fn qwen_user_facing_chat_messages_include_no_think_and_prompt_envelope() {
    let mut request = chat_request(vec![LlmChatMessage {
        role: "user".to_string(),
        content: "오늘 힘들었어.".to_string(),
    }]);
    request.prompt_envelope = Some(serde_json::json!({
        "mode": "deep",
        "personaStatic": {"identity": {"name": "한서연"}},
        "semanticMemories": [{"id": "m1", "content": "짧은 위로 선호"}]
    }));

    let envelope = LlmChatEnvelope::from_request(request);
    let messages = qwen_local_chat_messages(&envelope).expect("qwen messages build");
    let serialized = serde_json::to_string(&messages).expect("messages serialize");

    assert!(serialized.contains("/no_think"));
    assert!(serialized.contains("promptEnvelope"));
    assert!(serialized.contains("한서연"));
    assert!(serialized.contains("짧은 위로 선호"));
}

#[test]
fn qwen_chat_messages_normalize_companion_history_to_assistant_role() {
    let request = chat_request(vec![
        LlmChatMessage {
            role: "companion".to_string(),
            content: "여기 있어.".to_string(),
        },
        LlmChatMessage {
            role: "user".to_string(),
            content: "고마워.".to_string(),
        },
    ]);

    let envelope = LlmChatEnvelope::from_request(request);
    let messages = qwen_local_chat_messages(&envelope).expect("qwen messages build");

    assert_eq!(messages[1].role, "assistant");
    assert_eq!(messages[2].role, "user");
}

#[test]
fn prompt_envelope_redaction_removes_camel_case_forbidden_keys() {
    let mut request = chat_request(vec![LlmChatMessage {
        role: "user".to_string(),
        content: "확인해줘.".to_string(),
    }]);
    request.prompt_envelope = Some(serde_json::json!({
        "mode": "deep",
        "currentContext": {
            "rawOcrText": "plain confidential project text",
            "screenshotPath": "/Users/user/private/screen.png",
            "fullUrl": "https://example.test/path?token=abc"
        }
    }));

    let envelope =
        LlmChatEnvelope::from_request(request).for_provider(ProviderInputGrade::LocalRedacted);
    let serialized = serde_json::to_string(&envelope.prompt_envelope).expect("json serializes");

    assert!(!serialized.contains("rawOcrText"));
    assert!(!serialized.contains("screenshotPath"));
    assert!(!serialized.contains("fullUrl"));
    assert!(!serialized.contains("plain confidential project text"));
    assert!(!serialized.contains("/Users/user/private/screen.png"));
    assert!(!serialized.contains("token=abc"));
}
