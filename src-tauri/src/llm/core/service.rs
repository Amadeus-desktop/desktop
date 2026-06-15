use crate::llm::{
    constants::DEFAULT_LLAMA_URL,
    providers::{ApiLlmProvider, LocalLlamaProvider, TemplateLlmProvider},
    LlmChatEnvelope, LlmError, LlmGeneration, LlmInputEnvelope, LlmProvider, LlmProviderHealth,
    ProviderInputGrade,
};
use crate::shared::constants::{
    MODEL_ROUTE_API_FIRST, MODEL_ROUTE_LOCAL_FIRST, MODEL_ROUTE_TEMPLATE,
};

pub struct LlmService {
    template: TemplateLlmProvider,
    local: LocalLlamaProvider,
    api: ApiLlmProvider,
    route: LlmProviderRoute,
    fallback_enabled: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LlmProviderRoute {
    Template,
    LocalLlama,
    Api,
}

impl LlmProviderRoute {
    pub(crate) fn from_model_route(value: &str) -> Result<Self, LlmError> {
        match value {
            MODEL_ROUTE_API_FIRST => Ok(Self::Api),
            MODEL_ROUTE_LOCAL_FIRST => Ok(Self::LocalLlama),
            MODEL_ROUTE_TEMPLATE => Ok(Self::Template),
            other => Err(LlmError::InvalidRoute(format!(
                "unsupported model route '{other}'"
            ))),
        }
    }
}

impl Default for LlmService {
    fn default() -> Self {
        Self {
            template: TemplateLlmProvider,
            local: LocalLlamaProvider::new(DEFAULT_LLAMA_URL),
            api: ApiLlmProvider,
            route: LlmProviderRoute::Template,
            fallback_enabled: true,
        }
    }
}

impl LlmService {
    pub fn set_route(&mut self, route: LlmProviderRoute, fallback_enabled: bool) {
        self.route = route;
        self.fallback_enabled = fallback_enabled;
    }

    pub fn configure_local(&mut self, endpoint: impl Into<String>, model_path: Option<String>) {
        self.local.configure(endpoint, model_path);
    }

    pub fn generate_utterance(
        &self,
        request: &LlmInputEnvelope,
    ) -> Result<LlmGeneration, LlmError> {
        self.try_generate_utterance(request)
    }

    pub fn generate_chat_reply(
        &self,
        request: &LlmChatEnvelope,
    ) -> Result<LlmGeneration, LlmError> {
        self.try_generate_chat_reply(request)
    }

    pub(crate) fn health(&self) -> Vec<LlmProviderHealth> {
        vec![
            self.template.health(),
            self.local.health(),
            self.api.health(),
        ]
    }

    fn try_generate_utterance(
        &self,
        request: &LlmInputEnvelope,
    ) -> Result<LlmGeneration, LlmError> {
        match self.route {
            LlmProviderRoute::Template => self
                .template
                .generate_utterance(&request.for_provider(ProviderInputGrade::Template)),
            LlmProviderRoute::LocalLlama => self
                .local
                .generate_utterance(&request.for_provider(ProviderInputGrade::LocalRedacted))
                .or_else(|error| self.fallback_utterance(request, error)),
            LlmProviderRoute::Api => self
                .api
                .generate_utterance(&request.for_provider(ProviderInputGrade::ApiRedacted))
                .or_else(|error| self.fallback_utterance(request, error)),
        }
    }

    fn try_generate_chat_reply(
        &self,
        request: &LlmChatEnvelope,
    ) -> Result<LlmGeneration, LlmError> {
        match self.route {
            LlmProviderRoute::Template => self
                .template
                .generate_chat_reply(&request.for_provider(ProviderInputGrade::Template)),
            LlmProviderRoute::LocalLlama => self
                .local
                .generate_chat_reply(&request.for_provider(ProviderInputGrade::LocalRedacted))
                .or_else(|error| self.fallback_chat_reply(request, error)),
            LlmProviderRoute::Api => self
                .api
                .generate_chat_reply(&request.for_provider(ProviderInputGrade::ApiRedacted))
                .or_else(|error| self.fallback_chat_reply(request, error)),
        }
    }

    fn fallback_utterance(
        &self,
        request: &LlmInputEnvelope,
        error: LlmError,
    ) -> Result<LlmGeneration, LlmError> {
        if self.fallback_enabled {
            self.template
                .generate_utterance(&request.for_provider(ProviderInputGrade::Template))
        } else {
            Err(error)
        }
    }

    fn fallback_chat_reply(
        &self,
        request: &LlmChatEnvelope,
        error: LlmError,
    ) -> Result<LlmGeneration, LlmError> {
        if self.fallback_enabled {
            self.template
                .generate_chat_reply(&request.for_provider(ProviderInputGrade::Template))
        } else {
            Err(error)
        }
    }
}
