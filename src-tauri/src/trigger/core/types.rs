use serde::Serialize;

use crate::{
    macos_context::MacosContextSnapshot,
    privacy::PrivacyAssessment,
    timeline::{ContextEvent, UtteranceEvent},
};

use super::ProcessHistoryWindow;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TriggerType {
    DeepPause,
    Milestone,
    Drift,
}

impl TriggerType {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::DeepPause => "deep_pause",
            Self::Milestone => "milestone",
            Self::Drift => "drift",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TriggerAction {
    NoAction,
    StatusOnly,
    Bubble,
    Conversation,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerCandidate {
    pub trigger_type: TriggerType,
    pub message: String,
    pub reason: String,
    pub base_score: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerEvaluation {
    pub candidate: Option<TriggerCandidate>,
    pub speakability_score: i64,
    pub action: TriggerAction,
    pub should_persist: bool,
    pub suppression_reason: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TriggerInput {
    pub snapshot: MacosContextSnapshot,
    pub privacy: PrivacyAssessment,
    pub history: Option<ProcessHistoryWindow>,
    pub recent_utterance_minutes_ago: Option<i64>,
    pub dismissed_recent_count: i64,
    pub utterances_today: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerRunResult {
    pub snapshot: MacosContextSnapshot,
    pub privacy: PrivacyAssessment,
    pub evaluation: TriggerEvaluation,
    pub context_event: Option<ContextEvent>,
    pub utterance_event: Option<UtteranceEvent>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerPollDecision {
    pub ready: bool,
    pub wait_seconds: i64,
    pub suppression_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerPollResult {
    pub did_evaluate: bool,
    pub decision: TriggerPollDecision,
    pub run_result: Option<TriggerRunResult>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerRuntimeSnapshot {
    pub recent_utterance_minutes_ago: Option<i64>,
    pub dismissed_recent_count: i64,
    pub utterances_today: i64,
}
