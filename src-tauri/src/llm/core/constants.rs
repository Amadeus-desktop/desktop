use std::time::Duration;

pub const DEFAULT_LLAMA_URL: &str = "http://127.0.0.1:8080";
pub const LLAMA_TIMEOUT: Duration = Duration::from_secs(3);

pub const PROVIDER_ID_TEMPLATE: &str = "template";
pub const PROVIDER_ID_API: &str = "api";
pub const PROVIDER_ID_LOCAL_LLAMA: &str = "local-llama";

pub const LOCAL_COMPLETION_MAX_TOKENS: u16 = 80;
pub const LOCAL_COMPLETION_TEMPERATURE: f32 = 0.7;
pub const LOCAL_HEALTH_MAX_TOKENS: u8 = 1;
pub const LOCAL_HEALTH_TEMPERATURE: f32 = 0.0;
pub const LOCAL_STOP_SEQUENCE: &str = "\n";

pub const TEMPLATE_PROVIDER_HEALTH_DETAIL: &str = "template provider is always available";
pub const API_PROVIDER_UNCONFIGURED_DETAIL: &str = "api provider is not configured in MVP";
pub const API_PROVIDER_UNCONFIGURED_ERROR: &str = "api provider is not configured";
pub const LOCAL_MODEL_PATH_MISSING_ERROR: &str = "local model path is not configured";
pub const LLAMA_CHAT_NO_CHOICES_ERROR: &str = "llama chat response had no choices";
