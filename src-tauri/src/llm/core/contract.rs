use serde::{Deserialize, Serialize};

use super::redaction::{sanitize_prompt_field, sanitize_prompt_json};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmInputEnvelope {
    pub provider_grade: ProviderInputGrade,
    pub persona_summary: Option<String>,
    pub safe_memory_summary: Option<String>,
    pub trigger_type: String,
    pub trigger_reason: String,
    pub tone_hint: String,
    pub coarse_context_label: String,
    pub redacted_window_title: Option<String>,
    pub redacted_ocr_summary: Option<String>,
    pub score_summary: Option<PolicyScoreSummary>,
    pub fallback_message: String,
    #[serde(default = "default_locale")]
    pub locale: String,
}

fn default_locale() -> String {
    "ko".to_string()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProviderInputGrade {
    Template,
    ApiRedacted,
    LocalRedacted,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyScoreSummary {
    pub privacy_bucket: String,
    pub speakability_bucket: String,
}

impl LlmInputEnvelope {
    pub fn with_redacted_ocr_summary(mut self, summary: Option<String>) -> Self {
        self.redacted_ocr_summary = summary;
        self
    }

    pub fn for_provider(&self, provider_grade: ProviderInputGrade) -> Self {
        let mut envelope = self.clone();
        envelope.provider_grade = provider_grade;
        match provider_grade {
            ProviderInputGrade::Template => {
                envelope.persona_summary = None;
                envelope.safe_memory_summary = None;
                envelope.trigger_reason.clear();
                envelope.tone_hint.clear();
                envelope.coarse_context_label.clear();
                envelope.redacted_window_title = None;
                envelope.redacted_ocr_summary = None;
                envelope.score_summary = None;
            }
            ProviderInputGrade::ApiRedacted => {
                envelope.trigger_reason = public_trigger_reason(&envelope.trigger_reason);
                envelope.tone_hint.clear();
                envelope.redacted_window_title = None;
                envelope.redacted_ocr_summary = None;
                envelope.score_summary = None;
            }
            ProviderInputGrade::LocalRedacted => {}
        }
        envelope
    }
}

fn public_trigger_reason(reason: &str) -> String {
    let is_public_reason = !reason.is_empty()
        && reason.len() <= 80
        && reason.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '_'
        });
    if is_public_reason {
        reason.to_string()
    } else {
        String::new()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmChatRequest {
    pub messages: Vec<LlmChatMessage>,
    #[serde(default = "default_locale")]
    pub locale: String,
    pub persona_id: Option<String>,
    pub nickname: Option<String>,
    #[serde(default)]
    pub prompt_envelope: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmChatEnvelope {
    pub provider_grade: ProviderInputGrade,
    pub messages: Vec<LlmChatMessage>,
    #[serde(default = "default_locale")]
    pub locale: String,
    pub persona_id: Option<String>,
    pub nickname: Option<String>,
    #[serde(default)]
    pub prompt_envelope: Option<serde_json::Value>,
}

impl LlmChatEnvelope {
    pub fn from_request(request: LlmChatRequest) -> Self {
        Self {
            provider_grade: ProviderInputGrade::LocalRedacted,
            messages: request.messages,
            locale: request.locale,
            persona_id: request.persona_id,
            nickname: request.nickname,
            prompt_envelope: request.prompt_envelope,
        }
    }

    pub fn for_provider(&self, provider_grade: ProviderInputGrade) -> Self {
        let mut envelope = self.clone();
        envelope.provider_grade = provider_grade;
        envelope.messages = match provider_grade {
            ProviderInputGrade::Template => envelope
                .messages
                .iter()
                .rev()
                .find(|message| message.role == "user")
                .map(|message| {
                    vec![LlmChatMessage {
                        role: "user".to_string(),
                        content: sanitize_prompt_field(&message.content),
                    }]
                })
                .unwrap_or_default(),
            ProviderInputGrade::ApiRedacted | ProviderInputGrade::LocalRedacted => envelope
                .messages
                .into_iter()
                .map(|message| LlmChatMessage {
                    role: sanitize_prompt_field(&message.role),
                    content: sanitize_prompt_field(&message.content),
                })
                .collect(),
        };
        envelope.prompt_envelope = envelope.prompt_envelope.map(sanitize_prompt_json);
        envelope
    }
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
