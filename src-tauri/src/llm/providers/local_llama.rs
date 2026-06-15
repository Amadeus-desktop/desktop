use serde_json::json;

use super::llama_types::{
    normalize_llama_chat_content, LlamaChatCompletionResponse, LlamaCompletionResponse,
};
use crate::llm::{
    constants::{
        LLAMA_TIMEOUT, LOCAL_COMPLETION_MAX_TOKENS, LOCAL_COMPLETION_TEMPERATURE,
        LOCAL_HEALTH_MAX_TOKENS, LOCAL_HEALTH_TEMPERATURE, LOCAL_MODEL_PATH_MISSING_ERROR,
        LOCAL_STOP_SEQUENCE, PROVIDER_ID_LOCAL_LLAMA, QWEN_DEEP_INPUT_TOKEN_CAP,
        QWEN_DEEP_OUTPUT_TOKEN_CAP, QWEN_NUDGE_INPUT_TOKEN_CAP, QWEN_NUDGE_OUTPUT_TOKEN_CAP,
        QWEN_POCKET_INPUT_TOKEN_CAP, QWEN_POCKET_OUTPUT_TOKEN_CAP, QWEN_PRESENCE_PENALTY,
        QWEN_TEMPERATURE, QWEN_TOP_K, QWEN_TOP_P,
    },
    llama_http::{llama_chat_completions_url, llama_completion_url, normalize_llama_content},
    prompt::{
        local_chat_prompt, local_utterance_prompt, qwen_local_chat_messages,
        utterance_system_prompt,
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

    fn complete_chat(&self, messages: Vec<LlmChatMessage>, mode: &str) -> Result<String, LlmError> {
        self.require_model_file()?;
        let url = llama_chat_completions_url(&self.endpoint)?;
        let response = ureq::post(&url)
            .timeout(LLAMA_TIMEOUT)
            .send_json(qwen_chat_completion_payload(messages, mode)?)?
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
        let message = self.complete_chat(messages, "nudge").or_else(|error| {
            if local_llama_should_fallback_to_completion(&error) {
                self.complete(prompt)
            } else {
                Err(error)
            }
        })?;

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }

    fn generate_chat_reply(&self, request: &LlmChatEnvelope) -> Result<LlmGeneration, LlmError> {
        let request = request.for_provider(ProviderInputGrade::LocalRedacted);
        let prompt = local_chat_prompt(&request);
        let mode = qwen_prompt_mode(&request);
        let messages = qwen_local_chat_messages(&request)?;
        let message = self.complete_chat(messages, &mode).or_else(|error| {
            if local_llama_should_fallback_to_completion(&error) {
                self.complete(prompt)
            } else {
                Err(error)
            }
        })?;

        Ok(LlmGeneration {
            message,
            provider: self.id().to_string(),
        })
    }
}

pub(crate) fn qwen_chat_completion_payload(
    messages: Vec<LlmChatMessage>,
    mode: &str,
) -> Result<serde_json::Value, LlmError> {
    reject_over_budget(&messages, mode)?;
    Ok(json!({
        "messages": messages,
        "max_tokens": qwen_output_token_cap(mode),
        "temperature": QWEN_TEMPERATURE,
        "top_p": QWEN_TOP_P,
        "top_k": QWEN_TOP_K,
        "presence_penalty": QWEN_PRESENCE_PENALTY,
        "stream": false,
    }))
}

pub(crate) fn local_llama_should_fallback_to_completion(error: &LlmError) -> bool {
    !matches!(error, LlmError::Protocol(_) | LlmError::Json(_))
}

fn qwen_prompt_mode(request: &LlmChatEnvelope) -> String {
    request
        .prompt_envelope
        .as_ref()
        .and_then(|value| value.get("mode"))
        .and_then(|value| value.as_str())
        .filter(|mode| matches!(*mode, "nudge" | "pocket" | "deep"))
        .unwrap_or("deep")
        .to_string()
}

fn qwen_output_token_cap(mode: &str) -> u16 {
    match mode {
        "nudge" => QWEN_NUDGE_OUTPUT_TOKEN_CAP,
        "pocket" => QWEN_POCKET_OUTPUT_TOKEN_CAP,
        _ => QWEN_DEEP_OUTPUT_TOKEN_CAP,
    }
}

fn qwen_input_token_cap(mode: &str) -> usize {
    match mode {
        "nudge" => QWEN_NUDGE_INPUT_TOKEN_CAP,
        "pocket" => QWEN_POCKET_INPUT_TOKEN_CAP,
        _ => QWEN_DEEP_INPUT_TOKEN_CAP,
    }
}

fn reject_over_budget(messages: &[LlmChatMessage], mode: &str) -> Result<(), LlmError> {
    let estimated_tokens = messages
        .iter()
        .map(|message| estimate_tokens(&message.role) + estimate_tokens(&message.content))
        .sum::<usize>();
    let cap = qwen_input_token_cap(mode);
    if estimated_tokens > cap {
        return Err(LlmError::Protocol(format!(
            "qwen input budget exceeded for mode {mode}: estimated {estimated_tokens} > {cap}"
        )));
    }
    Ok(())
}

fn estimate_tokens(value: &str) -> usize {
    value.chars().count().div_ceil(4)
}
