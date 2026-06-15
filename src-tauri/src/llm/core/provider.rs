use super::{LlmChatEnvelope, LlmError, LlmGeneration, LlmInputEnvelope, LlmProviderHealth};

pub trait LlmProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn health(&self) -> LlmProviderHealth;
    fn generate_utterance(&self, request: &LlmInputEnvelope) -> Result<LlmGeneration, LlmError>;
    fn generate_chat_reply(&self, request: &LlmChatEnvelope) -> Result<LlmGeneration, LlmError>;
}
