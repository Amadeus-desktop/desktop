use super::*;

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
fn extracts_llama_chat_completion_content() {
    let body = r#"{"choices":[{"message":{"content":"괜찮아. 천천히 하자."}}]}"#;

    let response: LlamaChatCompletionResponse = serde_json::from_str(body).expect("valid json");
    let content = normalize_llama_chat_content(response).expect("content is parsed");

    assert_eq!(content, "괜찮아. 천천히 하자.");
}

#[test]
fn rejects_empty_llama_chat_completion_content() {
    let body = r#"{"choices":[{"message":{"content":"   "}}]}"#;

    let response: LlamaChatCompletionResponse = serde_json::from_str(body).expect("valid json");

    assert!(normalize_llama_chat_content(response).is_err());
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
fn builds_llama_chat_completions_url() {
    assert_eq!(
        llama_chat_completions_url("http://127.0.0.1:8080").expect("valid endpoint"),
        "http://127.0.0.1:8080/v1/chat/completions"
    );
    assert_eq!(
        llama_chat_completions_url("http://127.0.0.1:8080/").expect("valid endpoint"),
        "http://127.0.0.1:8080/v1/chat/completions"
    );
    assert!(llama_chat_completions_url("https://127.0.0.1:8080").is_err());
    assert!(llama_chat_completions_url("http://127.0.0.1:8080/api").is_err());
}

#[test]
fn qwen_chat_payload_uses_phase_05_sampling_defaults() {
    let payload = qwen_chat_completion_payload(
        vec![LlmChatMessage {
            role: "user".to_string(),
            content: "/no_think\n안녕".to_string(),
        }],
        "deep",
    )
    .expect("payload builds");

    assert_eq!(payload["max_tokens"], 900);
    assert_eq!(payload["temperature"], 0.7);
    assert_eq!(payload["top_p"], 0.8);
    assert_eq!(payload["top_k"], 20);
    assert_eq!(payload["presence_penalty"], 1.5);
    assert_eq!(payload["stream"], false);
}

#[test]
fn qwen_input_budget_rejects_oversized_nudge_input() {
    let oversized = "가".repeat(4_900);
    let result = qwen_chat_completion_payload(
        vec![LlmChatMessage {
            role: "user".to_string(),
            content: oversized,
        }],
        "nudge",
    );

    assert!(result.is_err());
    assert!(result
        .expect_err("oversized nudge input should fail")
        .to_string()
        .contains("qwen input budget exceeded"));
}

#[test]
fn protocol_errors_do_not_use_legacy_completion_fallback() {
    assert!(!local_llama_should_fallback_to_completion(
        &LlmError::Protocol("qwen input budget exceeded".to_string())
    ));
    assert!(local_llama_should_fallback_to_completion(
        &LlmError::Unavailable("chat endpoint unavailable".to_string())
    ));
}
