mod api;
mod llama_types;
mod local_llama;
mod template;

pub use api::ApiLlmProvider;
#[cfg(test)]
pub(crate) use llama_types::{
    normalize_llama_chat_content, LlamaChatCompletionResponse, LlamaCompletionResponse,
};
pub use local_llama::LocalLlamaProvider;
#[cfg(test)]
pub(crate) use local_llama::{
    local_llama_should_fallback_to_completion, qwen_chat_completion_payload,
};
pub use template::TemplateLlmProvider;
