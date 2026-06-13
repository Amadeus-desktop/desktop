use super::{LlmChatRequest, LlmInputEnvelope};

pub(super) fn local_utterance_prompt(request: &LlmInputEnvelope) -> String {
    let sanitized_reason = sanitize_prompt_field(&request.trigger_reason);
    let mut lines = vec![
        "너는 조용하고 다정한 데스크톱 companion이다. 한 문장으로만 말해라.".to_string(),
        format!("트리거: {}", sanitize_prompt_field(&request.trigger_type)),
        format!("이유: {sanitized_reason}"),
        format!(
            "맥락: {}",
            sanitize_prompt_field(&request.coarse_context_label)
        ),
        format!("톤: {}", sanitize_prompt_field(&request.tone_hint)),
    ];

    if let Some(title) = request.redacted_window_title.as_deref() {
        lines.push(format!("창 단서: {}", sanitize_prompt_field(title)));
    }
    if let Some(ocr_summary) = request.redacted_ocr_summary.as_deref() {
        lines.push(format!("화면 요약: {}", sanitize_prompt_field(ocr_summary)));
    }
    lines.push("말:".to_string());
    lines.join("\n")
}

pub(super) fn local_chat_prompt(request: &LlmChatRequest) -> String {
    let conversation = request
        .messages
        .iter()
        .map(|message| {
            format!(
                "{}: {}",
                sanitize_prompt_field(&message.role),
                sanitize_prompt_field(&message.content)
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "너는 조용하고 다정한 데스크톱 companion이다. 짧게 한두 문장으로 답해라.\n{conversation}\ncompanion:"
    )
}

fn sanitize_prompt_field(value: &str) -> String {
    value
        .split_whitespace()
        .map(|part| {
            if part.contains('/') || part.contains('\\') || part.contains("://") {
                "[redacted]"
            } else {
                part
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
