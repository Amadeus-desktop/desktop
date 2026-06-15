mod commands;
mod core;
mod prompt;
mod providers;

pub use commands::{generate_chat_reply, generate_test_utterance, get_llm_provider_health};
pub use core::{
    LlmChatEnvelope, LlmChatMessage, LlmChatRequest, LlmGeneration, LlmInputEnvelope,
    LlmProviderHealth, PolicyScoreSummary, ProviderInputGrade,
};
pub use core::{LlmService, LlmState};
pub use prompt::persona_summary;

pub(crate) use core::{
    constants, llama_http, redaction, CommandError, LlmError, LlmProvider, LlmProviderRoute,
};

#[cfg(test)]
pub(crate) use llama_http::{
    llama_chat_completions_url, llama_completion_url, normalize_llama_content,
};
#[cfg(test)]
pub(crate) use prompt::{local_chat_prompt, local_utterance_prompt, qwen_local_chat_messages};
#[cfg(test)]
pub(crate) use providers::{
    local_llama_should_fallback_to_completion, normalize_llama_chat_content,
    qwen_chat_completion_payload, LlamaChatCompletionResponse, LlamaCompletionResponse,
    LocalLlamaProvider, TemplateLlmProvider,
};

#[cfg(test)]
mod tests;
