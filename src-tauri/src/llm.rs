use serde::{Deserialize, Serialize};
use std::{
    error::Error,
    fmt::{Display, Formatter},
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    sync::Mutex,
    time::Duration,
};
use tauri::State;

const DEFAULT_LLAMA_URL: &str = "http://127.0.0.1:8080";
const LLAMA_TIMEOUT: Duration = Duration::from_secs(3);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmUtteranceRequest {
    pub trigger_type: String,
    pub trigger_reason: String,
    pub app_name: String,
    pub window_title: String,
    pub fallback_message: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmChatRequest {
    pub messages: Vec<LlmChatMessage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmGeneration {
    pub message: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmProviderHealth {
    pub provider: String,
    pub available: bool,
    pub detail: String,
}

#[derive(Debug)]
pub enum LlmError {
    Unavailable(String),
    InvalidEndpoint(String),
    InvalidRoute(String),
    Io(std::io::Error),
    Protocol(String),
    Json(serde_json::Error),
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
    fn generate_utterance(&self, request: &LlmUtteranceRequest) -> Result<LlmGeneration, LlmError>;
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

    fn generate_utterance(&self, request: &LlmUtteranceRequest) -> Result<LlmGeneration, LlmError> {
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

    fn generate_utterance(
        &self,
        _request: &LlmUtteranceRequest,
    ) -> Result<LlmGeneration, LlmError> {
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
}

impl LocalLlamaProvider {
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    fn complete(&self, prompt: String) -> Result<String, LlmError> {
        let endpoint = parse_http_endpoint(&self.endpoint)?;
        let body = serde_json::json!({
            "prompt": prompt,
            "n_predict": 80,
            "temperature": 0.7,
            "stop": ["\n"],
        })
        .to_string();
        let response = post_json(&endpoint, "/completion", &body)?;
        extract_llama_content(&response)
    }
}

impl LlmProvider for LocalLlamaProvider {
    fn id(&self) -> &'static str {
        "local-llama"
    }

    fn health(&self) -> LlmProviderHealth {
        match parse_http_endpoint(&self.endpoint)
            .and_then(|endpoint| connect(&endpoint).map(|_| ()))
        {
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

    fn generate_utterance(&self, request: &LlmUtteranceRequest) -> Result<LlmGeneration, LlmError> {
        let prompt = format!(
            "너는 조용하고 다정한 데스크톱 companion이다. 한 문장으로만 말해라.\n트리거: {}\n이유: {}\n앱: {}\n창: {}\n말:",
            request.trigger_type, request.trigger_reason, request.app_name, request.window_title
        );
        Ok(LlmGeneration {
            message: self.complete(prompt)?,
            provider: self.id().to_string(),
        })
    }

    fn generate_chat_reply(&self, request: &LlmChatRequest) -> Result<LlmGeneration, LlmError> {
        let conversation = request
            .messages
            .iter()
            .map(|message| format!("{}: {}", message.role, message.content))
            .collect::<Vec<_>>()
            .join("\n");
        let prompt = format!(
            "너는 조용하고 다정한 데스크톱 companion이다. 짧게 한두 문장으로 답해라.\n{conversation}\ncompanion:"
        );

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

    pub fn generate_utterance(&self, request: &LlmUtteranceRequest) -> LlmGeneration {
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
        let _supported_routes = [
            LlmProviderRoute::Template,
            LlmProviderRoute::LocalLlama,
            LlmProviderRoute::Api,
        ];
        vec![
            self.template.health(),
            self.local.health(),
            self.api.health(),
        ]
    }

    fn try_generate_utterance(
        &self,
        request: &LlmUtteranceRequest,
    ) -> Result<LlmGeneration, LlmError> {
        match self.route {
            LlmProviderRoute::Template => self.template.generate_utterance(request),
            LlmProviderRoute::LocalLlama => self
                .local
                .generate_utterance(request)
                .or_else(|error| self.fallback_utterance(request, error)),
            LlmProviderRoute::Api => self
                .api
                .generate_utterance(request)
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
        request: &LlmUtteranceRequest,
        error: LlmError,
    ) -> Result<LlmGeneration, LlmError> {
        if self.fallback_enabled {
            self.template.generate_utterance(request)
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
        request: &LlmUtteranceRequest,
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
pub fn set_llm_provider_route(
    state: State<'_, LlmState>,
    model_route: String,
    fallback_enabled: bool,
) -> Result<(), CommandError> {
    state
        .set_route(&model_route, fallback_enabled)
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn generate_test_utterance(state: State<'_, LlmState>) -> Result<LlmGeneration, CommandError> {
    state
        .generate_utterance(&LlmUtteranceRequest {
            trigger_type: "milestone".to_string(),
            trigger_reason: "manual_test".to_string(),
            app_name: "Amadeus".to_string(),
            window_title: "LLM Test".to_string(),
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

#[derive(Debug, Clone)]
struct HttpEndpoint {
    host: String,
    port: u16,
}

fn parse_http_endpoint(endpoint: &str) -> Result<HttpEndpoint, LlmError> {
    let endpoint = endpoint.strip_prefix("http://").ok_or_else(|| {
        LlmError::InvalidEndpoint("only http:// endpoints are supported".to_string())
    })?;
    let authority = endpoint.split('/').next().unwrap_or(endpoint);
    let (host, port) = authority.rsplit_once(':').ok_or_else(|| {
        LlmError::InvalidEndpoint("endpoint must include host and port".to_string())
    })?;
    let port = port
        .parse::<u16>()
        .map_err(|_| LlmError::InvalidEndpoint("endpoint port must be a number".to_string()))?;

    Ok(HttpEndpoint {
        host: host.to_string(),
        port,
    })
}

fn connect(endpoint: &HttpEndpoint) -> Result<TcpStream, LlmError> {
    let address = (endpoint.host.as_str(), endpoint.port)
        .to_socket_addrs()?
        .next()
        .ok_or_else(|| LlmError::InvalidEndpoint("endpoint address did not resolve".to_string()))?;
    let stream = TcpStream::connect_timeout(&address, LLAMA_TIMEOUT)?;
    stream.set_read_timeout(Some(LLAMA_TIMEOUT))?;
    stream.set_write_timeout(Some(LLAMA_TIMEOUT))?;
    Ok(stream)
}

fn post_json(endpoint: &HttpEndpoint, path: &str, body: &str) -> Result<String, LlmError> {
    let mut stream = connect(endpoint)?;
    let request = format!(
        "POST {path} HTTP/1.1\r\nHost: {}:{}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        endpoint.host,
        endpoint.port,
        body.len(),
        body
    );
    stream.write_all(request.as_bytes())?;

    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    let (headers, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| LlmError::Protocol("http response had no body".to_string()))?;
    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        return Err(LlmError::Protocol(
            "llama server returned non-200 response".to_string(),
        ));
    }

    Ok(body.to_string())
}

pub fn extract_llama_content(body: &str) -> Result<String, LlmError> {
    let value: serde_json::Value = serde_json::from_str(body)?;
    let content = value
        .get("content")
        .and_then(|content| content.as_str())
        .ok_or_else(|| LlmError::Protocol("llama response did not include content".to_string()))?;

    Ok(content.trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn template_generates_trigger_specific_utterance() {
        let provider = TemplateLlmProvider;
        let result = provider
            .generate_utterance(&LlmUtteranceRequest {
                trigger_type: "milestone".to_string(),
                trigger_reason: "long_work_session_milestone".to_string(),
                app_name: "Visual Studio Code".to_string(),
                window_title: "main.rs".to_string(),
                fallback_message: "fallback".to_string(),
            })
            .expect("template generation succeeds");

        assert_eq!(result.provider, "template");
        assert_eq!(result.message, "조용히 오래 해내고 있었네.");
    }

    #[test]
    fn extracts_llama_completion_content() {
        let body = r#"{"content":"잠깐 쉬어도 괜찮아.","stop":true}"#;

        let content = extract_llama_content(body).expect("content is parsed");

        assert_eq!(content, "잠깐 쉬어도 괜찮아.");
    }

    #[test]
    fn maps_saved_model_routes_to_provider_routes() {
        assert_eq!(
            LlmProviderRoute::from_model_route("api-first").expect("api route"),
            LlmProviderRoute::Api
        );
        assert_eq!(
            LlmProviderRoute::from_model_route("local-first").expect("local route"),
            LlmProviderRoute::LocalLlama
        );
        assert!(LlmProviderRoute::from_model_route("unknown").is_err());
    }
}
