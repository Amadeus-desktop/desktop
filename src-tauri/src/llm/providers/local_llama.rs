use serde_json::json;

use super::llama_types::{
    normalize_llama_chat_content, LlamaChatCompletionResponse, LlamaCompletionResponse,
};
use crate::llm::{
    constants::{
        LLAMA_TIMEOUT, LOCAL_COMPLETION_MAX_TOKENS, LOCAL_COMPLETION_TEMPERATURE,
        LOCAL_HEALTH_MAX_TOKENS, LOCAL_HEALTH_TEMPERATURE, LOCAL_MODEL_PATH_MISSING_ERROR,
        LOCAL_STOP_SEQUENCE, PROVIDER_ID_LOCAL_LLAMA,
    },
    llama_http::{llama_chat_completions_url, llama_completion_url, normalize_llama_content},
    prompt::{
        chat_system_prompt, local_chat_prompt, local_utterance_prompt, utterance_system_prompt,
    },
    LlmChatEnvelope, LlmChatMessage, LlmError, LlmGeneration, LlmInputEnvelope, LlmProvider,
    LlmProviderHealth, ProviderInputGrade,
};

pub struct LocalLlamaProvider {
    endpoint: String,
    model_path: Option<String>,
}

impl LocalLlamaProvider {
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
            model_path: None,
        }
    }

    pub fn configure(&mut self, endpoint: impl Into<String>, model_path: Option<String>) {
        self.endpoint = endpoint.into();
        self.model_path = model_path;
    }

    fn require_model_file(&self) -> Result<(), LlmError> {
        let Some(model_path) = self.model_path.as_deref().filter(|path| !path.is_empty()) else {
            return Err(LlmError::Unavailable(
                LOCAL_MODEL_PATH_MISSING_ERROR.to_string(),
            ));
        };
        if !std::path::Path::new(model_path).is_file() {
            return Err(LlmError::Unavailable(format!(
                "local model file does not exist: {model_path}"
            )));
        }
        Ok(())
    }

    fn complete(&self, prompt: String) -> Result<String, LlmError> {
        self.require_model_file()?;
        let url = llama_completion_url(&self.endpoint)?;
        let response = ureq::post(&url)
            .timeout(LLAMA_TIMEOUT)
            .send_json(json!({
                "prompt": prompt,
                "n_predict": LOCAL_COMPLETION_MAX_TOKENS,
                "temperature": LOCAL_COMPLETION_TEMPERATURE,
                "stop": [LOCAL_STOP_SEQUENCE],
            }))?
            .into_json::<LlamaCompletionResponse>()?;

        normalize_llama_content(response.content)
    }

    fn complete_chat(&self, messages: Vec<LlmChatMessage>) -> Result<String, LlmError> {
        self.require_model_file()?;
        let url = llama_chat_completions_url(&self.endpoint)?;
        let response = ureq::post(&url)
            .timeout(LLAMA_TIMEOUT)
            .send_json(json!({
                "messages": messages,
                "max_tokens": LOCAL_COMPLETION_MAX_TOKENS,
                "temperature": LOCAL_COMPLETION_TEMPERATURE,
                "stream": false,
            }))?
            .into_json::<LlamaChatCompletionResponse>()?;

        normalize_llama_chat_content(response)
    }
}

impl LlmProvider for LocalLlamaProvider {
    fn id(&self) -> &'static str {
        PROVIDER_ID_LOCAL_LLAMA
    }

    fn health(&self) -> LlmProviderHealth {
        match self.require_model_file().and_then(|_| {
            llama_completion_url(&self.endpoint).and_then(|url| {
                ureq::post(&url)
                    .timeout(LLAMA_TIMEOUT)
                    .send_json(json!({
                        "prompt": "health",
                        "n_predict": LOCAL_HEALTH_MAX_TOKENS,
                        "temperature": LOCAL_HEALTH_TEMPERATURE,
                        "stop": [LOCAL_STOP_SEQUENCE],
                    }))
                    .map(|_| ())
                    .map_err(LlmError::from)
            })
        }) {
            Ok(()) => LlmProviderHealth {
                provider: self.id().to_string(),
                available: true,
                detail: self.endpoint.clone(),
            },
            Err(error) => LlmProviderHealth {
                provider: self.id().to_string(),
                available: false,
                detail: error.to_string(),
            },
        }
    }

    fn generate_utterance(&self, request: &LlmInputEnvelope) -> Result<LlmGeneration, LlmError> {
        let request = request.for_provider(ProviderInputGrade::LocalRedacted);
        let prompt = local_utterance_prompt(&request);
        let messages = vec![
            LlmChatMessage {
                role: "system".to_string(),
                content: utterance_system_prompt(&request.locale).to_string(),
            },
            LlmChatMessage {
                role: "user".to_string(),
                content: prompt.clone(),
            },
        ];
        let message = match self.complete_chat(messages) {
            Ok(message) => message,
            Err(_) => self.complete(prompt)?,
        };

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }

    fn generate_chat_reply(&self, request: &LlmChatEnvelope) -> Result<LlmGeneration, LlmError> {
        let request = request.for_provider(ProviderInputGrade::LocalRedacted);
        let prompt = local_chat_prompt(&request);
        let mut messages = vec![LlmChatMessage {
            role: "system".to_string(),
            content: chat_system_prompt(&request.locale, request.persona_id.as_deref()),
        }];
        messages.extend(request.messages.clone());
        let message = match self.complete_chat(messages) {
            Ok(message) => message,
            Err(_) => self.complete(prompt)?,
        };

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }
}
