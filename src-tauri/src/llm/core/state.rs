use std::sync::Mutex;

use crate::llm::{
    LlmChatEnvelope, LlmError, LlmGeneration, LlmInputEnvelope, LlmProviderHealth,
    LlmProviderRoute, LlmService,
};

pub struct LlmState {
    service: Mutex<LlmService>,
}

impl LlmState {
    pub fn new(service: LlmService) -> Self {
        Self {
            service: Mutex::new(service),
        }
    }

    pub fn generate_utterance(
        &self,
        request: &LlmInputEnvelope,
    ) -> Result<LlmGeneration, LlmError> {
        let service = self
            .service
            .lock()
            .map_err(|_| LlmError::State("llm service lock was poisoned".to_string()))?;
        service.generate_utterance(request)
    }

    pub fn generate_chat_reply(
        &self,
        request: &LlmChatEnvelope,
    ) -> Result<LlmGeneration, LlmError> {
        let service = self
            .service
            .lock()
            .map_err(|_| LlmError::State("llm service lock was poisoned".to_string()))?;
        service.generate_chat_reply(request)
    }

    pub fn health(&self) -> Result<Vec<LlmProviderHealth>, LlmError> {
        let service = self
            .service
            .lock()
            .map_err(|_| LlmError::State("llm service lock was poisoned".to_string()))?;
        Ok(service.health())
    }

    pub fn set_route(&self, model_route: &str, fallback_enabled: bool) -> Result<(), LlmError> {
        let route = LlmProviderRoute::from_model_route(model_route)?;
        let mut service = self
            .service
            .lock()
            .map_err(|_| LlmError::State("llm service lock was poisoned".to_string()))?;
        service.set_route(route, fallback_enabled);
        Ok(())
    }

    pub fn configure_local(
        &self,
        endpoint: impl Into<String>,
        model_path: Option<String>,
    ) -> Result<(), LlmError> {
        let mut service = self
            .service
            .lock()
            .map_err(|_| LlmError::State("llm service lock was poisoned".to_string()))?;
        service.configure_local(endpoint, model_path);
        Ok(())
    }
}
