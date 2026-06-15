use crate::llm::{
    constants::{
        API_PROVIDER_UNCONFIGURED_DETAIL, API_PROVIDER_UNCONFIGURED_ERROR, PROVIDER_ID_API,
    },
    LlmChatEnvelope, LlmError, LlmGeneration, LlmInputEnvelope, LlmProvider, LlmProviderHealth,
};

pub struct ApiLlmProvider;

impl LlmProvider for ApiLlmProvider {
    fn id(&self) -> &'static str {
        PROVIDER_ID_API
    }

    fn health(&self) -> LlmProviderHealth {
        LlmProviderHealth {
            provider: self.id().to_string(),
            available: false,
            detail: API_PROVIDER_UNCONFIGURED_DETAIL.to_string(),
        }
    }

    fn generate_utterance(&self, _request: &LlmInputEnvelope) -> Result<LlmGeneration, LlmError> {
        Err(LlmError::Unavailable(
            API_PROVIDER_UNCONFIGURED_ERROR.to_string(),
        ))
    }

    fn generate_chat_reply(&self, _request: &LlmChatEnvelope) -> Result<LlmGeneration, LlmError> {
        Err(LlmError::Unavailable(
            API_PROVIDER_UNCONFIGURED_ERROR.to_string(),
        ))
    }
}
