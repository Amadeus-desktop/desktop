mod contract;
mod llama_http;
mod prompt;

pub use contract::{
    LlmChatRequest, LlmGeneration, LlmInputEnvelope, LlmProviderHealth, PolicyScoreSummary,
    ProviderInputGrade,
};
use llama_http::{llama_completion_url, normalize_llama_content};
use prompt::{local_chat_prompt, local_utterance_prompt};

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    error::Error,
    fmt::{Display, Formatter},
    sync::Mutex,
    time::Duration,
};
use tauri::State;

const DEFAULT_LLAMA_URL: &str = "http://127.0.0.1:8080";
const LLAMA_TIMEOUT: Duration = Duration::from_secs(3);

#[derive(Debug)]
pub enum LlmError {
    Unavailable(String),
    InvalidEndpoint(String),
    InvalidRoute(String),
    Io(std::io::Error),
    Protocol(String),
    Json(serde_json::Error),
    Http(Box<ureq::Error>),
    State(String),
}

impl Display for LlmError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unavailable(message) => write!(formatter, "llm unavailable: {message}"),
            Self::InvalidEndpoint(message) => write!(formatter, "invalid endpoint: {message}"),
            Self::InvalidRoute(message) => write!(formatter, "invalid route: {message}"),
            Self::Io(error) => write!(formatter, "llm io error: {error}"),
            Self::Protocol(message) => write!(formatter, "llm protocol error: {message}"),
            Self::Json(error) => write!(formatter, "llm json error: {error}"),
            Self::Http(error) => write!(formatter, "llm http error: {error}"),
            Self::State(message) => write!(formatter, "llm state error: {message}"),
        }
    }
}

impl Error for LlmError {}

impl From<std::io::Error> for LlmError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<serde_json::Error> for LlmError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

impl From<ureq::Error> for LlmError {
    fn from(error: ureq::Error) -> Self {
        Self::Http(Box::new(error))
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<LlmError> for CommandError {
    fn from(error: LlmError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

pub trait LlmProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn health(&self) -> LlmProviderHealth;
    fn generate_utterance(&self, request: &LlmInputEnvelope) -> Result<LlmGeneration, LlmError>;
    fn generate_chat_reply(&self, request: &LlmChatRequest) -> Result<LlmGeneration, LlmError>;
}

pub struct TemplateLlmProvider;

impl LlmProvider for TemplateLlmProvider {
    fn id(&self) -> &'static str {
        "template"
    }

    fn health(&self) -> LlmProviderHealth {
        LlmProviderHealth {
            provider: self.id().to_string(),
            available: true,
            detail: "template provider is always available".to_string(),
        }
    }

    fn generate_utterance(&self, request: &LlmInputEnvelope) -> Result<LlmGeneration, LlmError> {
        let request = request.for_provider(ProviderInputGrade::Template);
        let message = match request.trigger_type.as_str() {
            "deep_pause" => "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.",
            "milestone" => "조용히 오래 해내고 있었네.",
            "drift" => "쉬는 중이면 괜찮아. 돌아가고 싶어지면 내가 옆에 있을게.",
            _ => request.fallback_message.as_str(),
        };

        Ok(LlmGeneration {
            message: message.to_string(),
            provider: self.id().to_string(),
        })
    }

    fn generate_chat_reply(&self, request: &LlmChatRequest) -> Result<LlmGeneration, LlmError> {
        let last_user_message = request
            .messages
            .iter()
            .rev()
            .find(|message| message.role == "user")
            .map(|message| message.content.trim())
            .unwrap_or_default();
        let message = if last_user_message.is_empty() {
            "응. 나 여기 있어.".to_string()
        } else {
            "응. 천천히 해도 괜찮아. 나 여기 있어.".to_string()
        };

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }
}

pub struct ApiLlmProvider;

impl LlmProvider for ApiLlmProvider {
    fn id(&self) -> &'static str {
        "api"
    }

    fn health(&self) -> LlmProviderHealth {
        LlmProviderHealth {
            provider: self.id().to_string(),
            available: false,
            detail: "api provider is not configured in MVP".to_string(),
        }
    }

    fn generate_utterance(&self, _request: &LlmInputEnvelope) -> Result<LlmGeneration, LlmError> {
        Err(LlmError::Unavailable(
            "api provider is not configured".to_string(),
        ))
    }

    fn generate_chat_reply(&self, _request: &LlmChatRequest) -> Result<LlmGeneration, LlmError> {
        Err(LlmError::Unavailable(
            "api provider is not configured".to_string(),
        ))
    }
}

pub struct LocalLlamaProvider {
    endpoint: String,
    model_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LlamaCompletionResponse {
    content: String,
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
                "local model path is not configured".to_string(),
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
                "n_predict": 80,
                "temperature": 0.7,
                "stop": ["\n"],
            }))?
            .into_json::<LlamaCompletionResponse>()?;

        normalize_llama_content(response.content)
    }
}

impl LlmProvider for LocalLlamaProvider {
    fn id(&self) -> &'static str {
        "local-llama"
    }

    fn health(&self) -> LlmProviderHealth {
        match self.require_model_file().and_then(|_| {
            llama_completion_url(&self.endpoint).and_then(|url| {
                ureq::post(&url)
                    .timeout(LLAMA_TIMEOUT)
                    .send_json(json!({
                        "prompt": "health",
                        "n_predict": 1,
                        "temperature": 0.0,
                        "stop": ["\n"],
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
        Ok(LlmGeneration {
            message: self.complete(prompt)?,
            provider: self.id().to_string(),
        })
    }

    fn generate_chat_reply(&self, request: &LlmChatRequest) -> Result<LlmGeneration, LlmError> {
        let prompt = local_chat_prompt(request);

        Ok(LlmGeneration {
            message: self.complete(prompt)?,
            provider: self.id().to_string(),
        })
    }
}

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
    fn from_model_route(value: &str) -> Result<Self, LlmError> {
        match value {
            "api-first" => Ok(Self::Api),
            "local-first" => Ok(Self::LocalLlama),
            "template" => Ok(Self::Template),
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

    pub fn generate_utterance(&self, request: &LlmInputEnvelope) -> LlmGeneration {
        self.try_generate_utterance(request).unwrap_or_else(|_| {
            self.template
                .generate_utterance(request)
                .expect("template provider cannot fail")
        })
    }

    pub fn generate_chat_reply(&self, request: &LlmChatRequest) -> LlmGeneration {
        self.try_generate_chat_reply(request).unwrap_or_else(|_| {
            self.template
                .generate_chat_reply(request)
                .expect("template provider cannot fail")
        })
    }

    fn health(&self) -> Vec<LlmProviderHealth> {
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

    fn try_generate_chat_reply(&self, request: &LlmChatRequest) -> Result<LlmGeneration, LlmError> {
        match self.route {
            LlmProviderRoute::Template => self.template.generate_chat_reply(request),
            LlmProviderRoute::LocalLlama => self
                .local
                .generate_chat_reply(request)
                .or_else(|error| self.fallback_chat_reply(request, error)),
            LlmProviderRoute::Api => self
                .api
                .generate_chat_reply(request)
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
        request: &LlmChatRequest,
        error: LlmError,
    ) -> Result<LlmGeneration, LlmError> {
        if self.fallback_enabled {
            self.template.generate_chat_reply(request)
        } else {
            Err(error)
        }
    }
}

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
        Ok(service.generate_utterance(request))
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

#[tauri::command]
pub fn get_llm_provider_health(
    state: State<'_, LlmState>,
) -> Result<Vec<LlmProviderHealth>, CommandError> {
    let service = state.service.lock().map_err(|_| {
        CommandError::from(LlmError::State("llm service lock was poisoned".to_string()))
    })?;
    Ok(service.health())
}

#[tauri::command]
pub fn generate_test_utterance(state: State<'_, LlmState>) -> Result<LlmGeneration, CommandError> {
    state
        .generate_utterance(&LlmInputEnvelope {
            provider_grade: ProviderInputGrade::LocalRedacted,
            persona_summary: None,
            safe_memory_summary: None,
            trigger_type: "milestone".to_string(),
            trigger_reason: "manual_test".to_string(),
            tone_hint: "calm".to_string(),
            coarse_context_label: "manual_test".to_string(),
            redacted_window_title: None,
            redacted_ocr_summary: None,
            score_summary: None,
            fallback_message: "조용히 오래 해내고 있었네.".to_string(),
        })
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn generate_chat_reply(
    state: State<'_, LlmState>,
    input: LlmChatRequest,
) -> Result<LlmGeneration, CommandError> {
    let service = state.service.lock().map_err(|_| {
        CommandError::from(LlmError::State("llm service lock was poisoned".to_string()))
    })?;
    Ok(service.generate_chat_reply(&input))
}

#[cfg(test)]
mod tests;
