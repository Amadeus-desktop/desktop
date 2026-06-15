use serde::Deserialize;

use crate::llm::{
    constants::LLAMA_CHAT_NO_CHOICES_ERROR, llama_http::normalize_llama_content, LlmError,
};

#[derive(Debug, Deserialize)]
pub(crate) struct LlamaCompletionResponse {
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct LlamaChatCompletionResponse {
    choices: Vec<LlamaChatChoice>,
}

#[derive(Debug, Deserialize)]
struct LlamaChatChoice {
    message: LlamaChatMessageContent,
}

#[derive(Debug, Deserialize)]
struct LlamaChatMessageContent {
    content: String,
}

pub(crate) fn normalize_llama_chat_content(
    response: LlamaChatCompletionResponse,
) -> Result<String, LlmError> {
    let content = response
        .choices
        .into_iter()
        .next()
        .map(|choice| choice.message.content)
        .ok_or_else(|| LlmError::Protocol(LLAMA_CHAT_NO_CHOICES_ERROR.to_string()))?;

    normalize_llama_content(content)
}
