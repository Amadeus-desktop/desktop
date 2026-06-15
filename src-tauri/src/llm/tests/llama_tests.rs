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
