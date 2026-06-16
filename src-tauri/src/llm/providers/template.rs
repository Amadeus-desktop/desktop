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
        let persona_hint = template_persona_hint(&request);
        let message = if last_user_message.is_empty() {
            template_chat_empty(&request.locale, persona_hint.as_deref())
        } else {
            template_chat_reply(&request.locale, persona_hint.as_deref())
        };

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }
}

fn template_persona_hint(request: &LlmChatEnvelope) -> Option<String> {
    if let Some(persona_id) = request.persona_id.as_deref().filter(|value| !value.is_empty()) {
        return Some(persona_id.to_string());
    }

    let envelope = request.prompt_envelope.as_ref()?;
    envelope
        .pointer("/personaStatic/identity/name")
        .and_then(|value| value.as_str())
        .or_else(|| {
            envelope
                .pointer("/personaStatic/identity/id")
                .and_then(|value| value.as_str())
        })
        .map(ToString::to_string)
}
