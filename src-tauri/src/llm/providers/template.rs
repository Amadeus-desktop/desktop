use crate::llm::{
    constants::{PROVIDER_ID_TEMPLATE, TEMPLATE_PROVIDER_HEALTH_DETAIL},
    prompt::{template_chat_empty, template_chat_reply, template_utterance},
    LlmChatEnvelope, LlmError, LlmGeneration, LlmInputEnvelope, LlmProvider, LlmProviderHealth,
    ProviderInputGrade,
};

pub struct TemplateLlmProvider;

impl LlmProvider for TemplateLlmProvider {
    fn id(&self) -> &'static str {
        PROVIDER_ID_TEMPLATE
    }

    fn health(&self) -> LlmProviderHealth {
        LlmProviderHealth {
            provider: self.id().to_string(),
            available: true,
            detail: TEMPLATE_PROVIDER_HEALTH_DETAIL.to_string(),
        }
    }

    fn generate_utterance(&self, request: &LlmInputEnvelope) -> Result<LlmGeneration, LlmError> {
        let request = request.for_provider(ProviderInputGrade::Template);
        let message = template_utterance(
            &request.locale,
            &request.trigger_type,
            request.fallback_message.as_str(),
        );

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }

    fn generate_chat_reply(&self, request: &LlmChatEnvelope) -> Result<LlmGeneration, LlmError> {
        let request = request.for_provider(ProviderInputGrade::Template);
        let last_user_message = request
            .messages
            .iter()
            .rev()
            .find(|message| message.role == "user")
            .map(|message| message.content.trim())
            .unwrap_or_default();
        let message = if last_user_message.is_empty() {
            template_chat_empty(&request.locale)
        } else {
            template_chat_reply(&request.locale)
        };

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }
}
