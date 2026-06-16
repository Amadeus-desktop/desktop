use serde_json::json;

use super::{
    chat_instruction,
    persona::{PERSONA_BOUNDARY_RULE, PERSONA_PRIVACY_RULE, PERSONA_ROLE, PERSONA_STYLE_RULE},
    utterance_instruction,
};
use crate::llm::{
    redaction::sanitize_prompt_field, LlmChatEnvelope, LlmChatMessage, LlmError, LlmInputEnvelope,
    ProviderInputGrade,
};

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
        "personaId": request.persona_id.as_deref().map(sanitize_prompt_field),
        "promptEnvelope": request.prompt_envelope.clone().map(sanitize_prompt_json),
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

pub(crate) fn qwen_local_chat_messages(
    request: &LlmChatEnvelope,
) -> Result<Vec<LlmChatMessage>, LlmError> {
    let request = request.for_provider(ProviderInputGrade::LocalRedacted);
    let prompt_envelope = request
        .prompt_envelope
        .as_ref()
        .map(serde_json::to_string)
        .transpose()?
        .unwrap_or_else(|| local_chat_prompt(&request));

    let mut messages = vec![LlmChatMessage {
        role: "system".to_string(),
        content: [
            "/no_think",
            "You are the local Qwen persona runtime for Amadeus.",
            "Use promptEnvelope as the already-assembled source of truth.",
            "Do not rebuild persona, memory, or desktop context outside this envelope.",
            "Never claim access to hidden raw screen/OCR/file/URL/token data.",
            &format!(
                "personaId: {}",
                request.persona_id.as_deref().unwrap_or("unknown")
            ),
            &format!("promptEnvelope: {prompt_envelope}"),
        ]
        .join("\n"),
    }];
    messages.extend(request.messages.into_iter().map(|message| LlmChatMessage {
        role: normalize_chat_role(&message.role),
        content: message.content,
    }));
    Ok(messages)
}

fn normalize_chat_role(role: &str) -> String {
    match role {
        "assistant" | "companion" => "assistant".to_string(),
        "system" => "system".to_string(),
        _ => "user".to_string(),
    }
}

fn persona_json(summary: Option<&str>) -> serde_json::Value {
    json!({
        "role": PERSONA_ROLE,
        "summary": summary.map(sanitize_prompt_field),
        "styleRules": [PERSONA_STYLE_RULE],
        "privacyRules": [PERSONA_PRIVACY_RULE, PERSONA_BOUNDARY_RULE],
    })
}
