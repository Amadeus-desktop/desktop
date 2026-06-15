mod contract_tests;
mod llama_tests;
mod prompt_tests;
mod provider_tests;

pub(super) use super::*;

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
        locale: "ko".to_string(),
    }
}

fn chat_request(messages: Vec<LlmChatMessage>) -> LlmChatRequest {
    LlmChatRequest {
        messages,
        locale: "ko".to_string(),
        persona_id: None,
        nickname: None,
    }
}
