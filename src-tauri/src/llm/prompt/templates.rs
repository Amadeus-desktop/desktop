use serde_json::json;

use super::{
    chat_instruction,
    persona::{PERSONA_BOUNDARY_RULE, PERSONA_PRIVACY_RULE, PERSONA_ROLE, PERSONA_STYLE_RULE},
    utterance_instruction,
};
use crate::llm::{redaction::sanitize_prompt_field, LlmChatEnvelope, LlmInputEnvelope};

pub(crate) fn local_utterance_prompt(request: &LlmInputEnvelope) -> String {
    json!({
        "task": "companion_utterance",
        "locale": sanitize_prompt_field(&request.locale),
        "persona": persona_json(request.persona_summary.as_deref()),
        "context": {
            "triggerType": sanitize_prompt_field(&request.trigger_type),
            "triggerReason": sanitize_prompt_field(&request.trigger_reason),
            "coarseContextLabel": sanitize_prompt_field(&request.coarse_context_label),
            "toneHint": sanitize_prompt_field(&request.tone_hint),
            "redactedWindowTitle": request.redacted_window_title.as_deref().map(sanitize_prompt_field),
            "redactedOcrSummary": request.redacted_ocr_summary.as_deref().map(sanitize_prompt_field),
            "safeMemorySummary": request.safe_memory_summary.as_deref().map(sanitize_prompt_field),
            "scoreSummary": request.score_summary,
        },
        "instruction": utterance_instruction(&request.locale),
        "outputContract": {
            "maxSentences": 1,
            "format": "plain_text",
            "forbidden": ["json", "markdown_table", "raw_metadata"]
        }
    })
    .to_string()
}

pub(crate) fn local_chat_prompt(request: &LlmChatEnvelope) -> String {
    let messages = request
        .messages
        .iter()
        .map(|message| {
            json!({
                "role": sanitize_prompt_field(&message.role),
                "content": sanitize_prompt_field(&message.content),
            })
        })
        .collect::<Vec<_>>();

    json!({
        "task": "companion_chat_reply",
        "locale": sanitize_prompt_field(&request.locale),
        "persona": persona_json(request.nickname.as_deref()),
        "messages": messages,
        "instruction": chat_instruction(&request.locale),
        "outputContract": {
            "maxSentences": 2,
            "format": "plain_text",
            "forbidden": ["json", "markdown_table", "raw_metadata"]
        }
    })
    .to_string()
}

fn persona_json(summary: Option<&str>) -> serde_json::Value {
    json!({
        "role": PERSONA_ROLE,
        "summary": summary.map(sanitize_prompt_field),
        "styleRules": [PERSONA_STYLE_RULE],
        "privacyRules": [PERSONA_PRIVACY_RULE, PERSONA_BOUNDARY_RULE],
    })
}
