use tauri::State;

use super::{
    CommandError, LlmChatEnvelope, LlmChatRequest, LlmGeneration, LlmInputEnvelope,
    LlmProviderHealth, LlmState, ProviderInputGrade,
};

#[tauri::command]
pub fn get_llm_provider_health(
    state: State<'_, LlmState>,
) -> Result<Vec<LlmProviderHealth>, CommandError> {
    state.health().map_err(CommandError::from)
}

#[tauri::command]
pub fn generate_test_utterance(state: State<'_, LlmState>) -> Result<LlmGeneration, CommandError> {
    state
        .generate_utterance(&LlmInputEnvelope {
            provider_grade: ProviderInputGrade::LocalRedacted,
            persona_summary: None,
            safe_memory_summary: None,
            trigger_type: "milestone".to_string(),
            trigger_reason: "manual_test".to_string(),
            tone_hint: "calm".to_string(),
            coarse_context_label: "manual_test".to_string(),
            redacted_window_title: None,
            redacted_ocr_summary: None,
            score_summary: None,
            fallback_message: "조용히 오래 해내고 있었네.".to_string(),
        })
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn generate_chat_reply(
    state: State<'_, LlmState>,
    input: LlmChatRequest,
) -> Result<LlmGeneration, CommandError> {
    state
        .generate_chat_reply(&LlmChatEnvelope::from_request(input))
        .map_err(CommandError::from)
}
