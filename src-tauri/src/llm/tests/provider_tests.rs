use super::*;

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
            locale: "ko".to_string(),
        })
        .expect("template generation succeeds");

    assert_eq!(result.provider, "template");
    assert_eq!(result.message, "조용히 오래 해내고 있었네.");
}

#[test]
fn template_generates_locale_specific_utterance() {
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
            locale: "en".to_string(),
        })
        .expect("template generation succeeds");

    assert_eq!(
        result.message,
        "You have been quietly at this for a long time."
    );
}

#[test]
fn template_chat_fallback_keeps_persona_hint() {
    let provider = TemplateLlmProvider;
    let mut request = chat_request(vec![LlmChatMessage {
        role: "user".to_string(),
        content: "오늘 작업 정리해줘.".to_string(),
    }]);
    request.persona_id = Some("makise-kurisu".to_string());
    request.prompt_envelope = Some(serde_json::json!({
        "personaStatic": {"identity": {"name": "마키세 크리스"}}
    }));

    let result = provider
        .generate_chat_reply(&LlmChatEnvelope::from_request(request))
        .expect("template chat succeeds");

    assert_eq!(result.provider, "template");
    assert!(result.message.contains("사실"));
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

#[test]
fn service_respects_disabled_fallback_for_generation() {
    let mut service = LlmService::default();
    service.set_route(LlmProviderRoute::LocalLlama, false);

    let result = service.generate_utterance(&policy_envelope());

    assert!(result.is_err());
}
