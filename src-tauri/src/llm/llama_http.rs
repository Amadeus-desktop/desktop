use super::LlmError;

pub(super) fn llama_completion_url(endpoint: &str) -> Result<String, LlmError> {
    llama_endpoint_url(endpoint, "/completion")
}

pub(super) fn llama_chat_completions_url(endpoint: &str) -> Result<String, LlmError> {
    llama_endpoint_url(endpoint, "/v1/chat/completions")
}

fn llama_endpoint_url(endpoint: &str, path: &str) -> Result<String, LlmError> {
    let endpoint = endpoint.trim_end_matches('/');
    if !endpoint.starts_with("http://") {
        return Err(LlmError::InvalidEndpoint(
            "only http:// endpoints are supported".to_string(),
        ));
    }
    let authority = endpoint.trim_start_matches("http://");
    if authority.is_empty() {
        return Err(LlmError::InvalidEndpoint(
            "endpoint must include host".to_string(),
        ));
    }
    if authority.contains('/') {
        return Err(LlmError::InvalidEndpoint(
            "endpoint must not include a path".to_string(),
        ));
    }

    Ok(format!("{endpoint}{path}"))
}

pub(super) fn normalize_llama_content(content: String) -> Result<String, LlmError> {
    let content = content.trim();
    if content.is_empty() {
        return Err(LlmError::Protocol(
            "llama response content was empty".to_string(),
        ));
    }

    Ok(content.to_string())
}
