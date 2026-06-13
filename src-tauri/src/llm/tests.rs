use super::*;
use crate::llm::contract::LlmChatMessage;

fn policy_envelope() -> LlmInputEnvelope {
    LlmInputEnvelope {
        provider_grade: ProviderInputGrade::LocalRedacted,
        persona_summary: Some("quiet companion".to_string()),
        safe_memory_summary: Some("prefers concise support".to_string()),
        trigger_type: "milestone".to_string(),
        trigger_reason: "long_work_session_milestone".to_string(),
        tone_hint: "calm".to_string(),
        coarse_context_label: "work".to_string(),
        redacted_window_title: Some("[redacted-title]".to_string()),
        redacted_ocr_summary: Some("[redacted-ocr-summary]".to_string()),
        score_summary: Some(PolicyScoreSummary {
            privacy_bucket: "low".to_string(),
            speakability_bucket: "high".to_string(),
        }),
        fallback_message: "fallback".to_string(),
    }
}

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
fn local_chat_prompt_redacts_path_and_url_content() {
    let request = LlmChatRequest {
        messages: vec![LlmChatMessage {
            role: "user".to_string(),
            content: "open /Users/user/secret/report.xlsx and https://example.test/token"
                .to_string(),
        }],
    };

    let prompt = local_chat_prompt(&LlmChatEnvelope::from_request(request));

    assert!(!prompt.contains("/Users/user/secret/report.xlsx"));
    assert!(!prompt.contains("https://example.test/token"));
    assert!(prompt.contains("[redacted]"));
}

#[test]
fn chat_envelope_filters_provider_input() {
    let request = LlmChatRequest {
        messages: vec![LlmChatMessage {
            role: "user".to_string(),
            content: "token=abc123 open example.com?token=abc and /Users/user/private.txt"
                .to_string(),
        }],
    };

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
fn local_chat_prompt_redacts_token_like_content_without_slashes() {
    let request = LlmChatRequest {
        messages: vec![LlmChatMessage {
            role: "user".to_string(),
            content: "token=abc123 password=hunter2".to_string(),
        }],
    };

    let prompt = local_chat_prompt(&LlmChatEnvelope::from_request(request));

    assert!(!prompt.contains("token=abc123"));
    assert!(!prompt.contains("password=hunter2"));
    assert!(prompt.contains("[redacted]"));
}

#[test]
fn template_generates_trigger_specific_utterance() {
    let provider = TemplateLlmProvider;
    let result = provider
        .generate_utterance(&LlmInputEnvelope {
            provider_grade: ProviderInputGrade::Template,
            persona_summary: None,
            safe_memory_summary: None,
            trigger_type: "milestone".to_string(),
            trigger_reason: "long_work_session_milestone".to_string(),
            tone_hint: "calm".to_string(),
            coarse_context_label: "work".to_string(),
            redacted_window_title: None,
            redacted_ocr_summary: None,
            score_summary: None,
            fallback_message: "fallback".to_string(),
        })
        .expect("template generation succeeds");

    assert_eq!(result.provider, "template");
    assert_eq!(result.message, "조용히 오래 해내고 있었네.");
}

#[test]
fn extracts_llama_completion_content() {
    let body = r#"{"content":"잠깐 쉬어도 괜찮아.","stop":true}"#;

    let response: LlamaCompletionResponse = serde_json::from_str(body).expect("valid json");
    let content = normalize_llama_content(response.content).expect("content is parsed");

    assert_eq!(content, "잠깐 쉬어도 괜찮아.");
}

#[test]
fn rejects_empty_llama_completion_content() {
    let response: LlamaCompletionResponse =
        serde_json::from_str(r#"{"content":"   ","stop":true}"#).expect("valid json");

    assert!(normalize_llama_content(response.content).is_err());
}

#[test]
fn builds_llama_completion_url() {
    assert_eq!(
        llama_completion_url("http://127.0.0.1:8080").expect("valid endpoint"),
        "http://127.0.0.1:8080/completion"
    );
    assert_eq!(
        llama_completion_url("http://127.0.0.1:8080/").expect("valid endpoint"),
        "http://127.0.0.1:8080/completion"
    );
    assert!(llama_completion_url("https://127.0.0.1:8080").is_err());
    assert!(llama_completion_url("http://127.0.0.1:8080/api").is_err());
}

#[test]
fn local_provider_requires_model_path() {
    let provider = LocalLlamaProvider::new("http://127.0.0.1:8080");

    let health = provider.health();

    assert!(!health.available);
    assert!(health.detail.contains("local model path is not configured"));
}

#[test]
fn maps_saved_model_routes_to_provider_routes() {
    assert_eq!(
        LlmProviderRoute::from_model_route("api-first").expect("api route"),
        LlmProviderRoute::Api
    );
    assert_eq!(
        LlmProviderRoute::from_model_route("local-first").expect("local route"),
        LlmProviderRoute::LocalLlama
    );
    assert!(LlmProviderRoute::from_model_route("unknown").is_err());
}
