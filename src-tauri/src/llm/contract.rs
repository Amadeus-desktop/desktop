use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
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
                envelope.trigger_reason.clear();
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
