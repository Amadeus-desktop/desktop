mod history;
mod scoring;

use serde::Serialize;
use std::{
    error::Error,
    fmt::{Display, Formatter},
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::State;

use crate::{
    llm::LlmState,
    macos_context::{
        read_current_snapshot, ContextBridgeState, MacosContextError, MacosContextSnapshot,
    },
    privacy::{assess_privacy, get_screen_capture_permission_status, PrivacyAssessment},
    timeline::{
        ContextEvent, CreateContextEventInput, CreateUtteranceEventInput, TimelineState,
        UtteranceEvent,
    },
};
pub use history::ProcessHistoryWindow;
use scoring::{
    action_for_score, exception_suppression, llm_gate_for_trigger, llm_request_for_trigger,
    select_candidate, suppressed,
};

const COOLDOWN_MINUTES: i64 = 30;
const DAILY_UTTERANCE_LIMIT: i64 = 12;
const AUTOMATIC_POLL_INTERVAL: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TriggerType {
    DeepPause,
    Milestone,
    Drift,
}

impl TriggerType {
    fn as_str(self) -> &'static str {
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

#[derive(Default)]
pub struct TriggerEngineState {
    runtime: Mutex<TriggerRuntimeState>,
}

impl TriggerEngineState {
    pub fn new() -> Self {
        Self::default()
    }
}

#[derive(Debug, Default)]
struct TriggerRuntimeState {
    last_utterance_at: Option<Instant>,
    last_automatic_evaluation_at: Option<Instant>,
    utterances_today: i64,
    dismissed_recent_count: i64,
    process_history: ProcessHistoryWindow,
}

impl TriggerRuntimeState {
    fn input_for(
        &mut self,
        snapshot: MacosContextSnapshot,
        privacy: PrivacyAssessment,
    ) -> TriggerInput {
        self.process_history.observe_snapshot(&snapshot, &privacy);
        TriggerInput {
            snapshot,
            privacy,
            history: Some(self.process_history.clone()),
            recent_utterance_minutes_ago: self.recent_utterance_minutes_ago(),
            dismissed_recent_count: self.dismissed_recent_count,
            utterances_today: self.utterances_today,
        }
    }

    fn record_persisted_utterance(&mut self) {
        self.last_utterance_at = Some(Instant::now());
        self.utterances_today += 1;
    }

    fn automatic_poll_decision(&self, minimum_interval: Duration) -> TriggerPollDecision {
        let Some(last_evaluation_at) = self.last_automatic_evaluation_at else {
            return TriggerPollDecision {
                ready: true,
                wait_seconds: 0,
                suppression_reason: None,
            };
        };

        let elapsed = last_evaluation_at.elapsed();
        if elapsed >= minimum_interval {
            return TriggerPollDecision {
                ready: true,
                wait_seconds: 0,
                suppression_reason: None,
            };
        }

        TriggerPollDecision {
            ready: false,
            wait_seconds: (minimum_interval - elapsed).as_secs().max(1) as i64,
            suppression_reason: Some("poll_cadence".to_string()),
        }
    }

    fn record_automatic_evaluation(&mut self) {
        self.last_automatic_evaluation_at = Some(Instant::now());
    }

    fn record_reaction(&mut self, reaction_type: &str) {
        match reaction_type {
            "dismissed" | "closed" | "ignored" => {
                self.dismissed_recent_count = (self.dismissed_recent_count + 1).min(5);
            }
            "opened" | "replied" => {
                self.dismissed_recent_count = 0;
            }
            _ => {}
        }
    }

    fn snapshot(&self) -> TriggerRuntimeSnapshot {
        TriggerRuntimeSnapshot {
            recent_utterance_minutes_ago: self.recent_utterance_minutes_ago(),
            dismissed_recent_count: self.dismissed_recent_count,
            utterances_today: self.utterances_today,
        }
    }

    fn recent_utterance_minutes_ago(&self) -> Option<i64> {
        self.last_utterance_at
            .map(|instant| (instant.elapsed().as_secs() / 60) as i64)
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl Display for CommandError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}", self.message)
    }
}

impl Error for CommandError {}

impl From<String> for CommandError {
    fn from(message: String) -> Self {
        Self { message }
    }
}

impl From<MacosContextError> for CommandError {
    fn from(error: MacosContextError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

#[tauri::command]
pub fn run_trigger_engine_once(
    context_state: State<'_, ContextBridgeState>,
    timeline_state: State<'_, TimelineState>,
    llm_state: State<'_, LlmState>,
    trigger_state: State<'_, TriggerEngineState>,
    keywords: Vec<String>,
) -> Result<TriggerRunResult, CommandError> {
    let snapshot = read_current_snapshot(&context_state)?;
    let privacy = assess_privacy(&snapshot, &keywords);
    let trigger_input = trigger_state
        .runtime
        .lock()
        .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?
        .input_for(snapshot.clone(), privacy.clone());
    let evaluation = evaluate_trigger(trigger_input);

    let (context_event, utterance_event) = if evaluation.should_persist {
        persist_trigger_events(
            &timeline_state,
            &llm_state,
            &snapshot,
            &privacy,
            &evaluation,
        )?
    } else {
        (None, None)
    };

    if utterance_event.is_some() {
        trigger_state
            .runtime
            .lock()
            .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?
            .record_persisted_utterance();
    }

    Ok(TriggerRunResult {
        snapshot,
        privacy,
        evaluation,
        context_event,
        utterance_event,
    })
}

#[tauri::command]
pub fn poll_trigger_engine(
    context_state: State<'_, ContextBridgeState>,
    timeline_state: State<'_, TimelineState>,
    llm_state: State<'_, LlmState>,
    trigger_state: State<'_, TriggerEngineState>,
    keywords: Vec<String>,
) -> Result<TriggerPollResult, CommandError> {
    let decision = {
        let mut runtime = trigger_state
            .runtime
            .lock()
            .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?;
        let decision = runtime.automatic_poll_decision(AUTOMATIC_POLL_INTERVAL);
        if decision.ready {
            runtime.record_automatic_evaluation();
        }
        decision
    };

    if !decision.ready {
        return Ok(TriggerPollResult {
            did_evaluate: false,
            decision,
            run_result: None,
        });
    }

    let run_result = run_trigger_engine_once(
        context_state,
        timeline_state,
        llm_state,
        trigger_state,
        keywords,
    )?;

    Ok(TriggerPollResult {
        did_evaluate: true,
        decision,
        run_result: Some(run_result),
    })
}

#[tauri::command]
pub fn record_trigger_reaction_for_scoring(
    trigger_state: State<'_, TriggerEngineState>,
    reaction_type: String,
) -> Result<TriggerRuntimeSnapshot, CommandError> {
    let mut runtime = trigger_state
        .runtime
        .lock()
        .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?;
    runtime.record_reaction(&reaction_type);
    Ok(runtime.snapshot())
}

pub fn evaluate_trigger(input: TriggerInput) -> TriggerEvaluation {
    if input.privacy.should_suppress_utterance {
        return suppressed("privacy");
    }

    if input.utterances_today >= DAILY_UTTERANCE_LIMIT {
        return suppressed("daily_limit");
    }

    if input
        .recent_utterance_minutes_ago
        .is_some_and(|minutes| minutes < COOLDOWN_MINUTES)
    {
        return suppressed("cooldown");
    }

    if let Some(reason) = exception_suppression(&input) {
        return suppressed(reason);
    }

    let Some(candidate) = select_candidate(&input.snapshot) else {
        return suppressed("no_trigger");
    };

    let speakability_score =
        (candidate.base_score - (input.dismissed_recent_count.max(0) * 10)).clamp(0, 100);
    let action = action_for_score(speakability_score);
    let should_persist = matches!(action, TriggerAction::Bubble | TriggerAction::Conversation);

    TriggerEvaluation {
        candidate: Some(candidate),
        speakability_score,
        action,
        should_persist,
        suppression_reason: None,
    }
}

fn persist_trigger_events(
    timeline_state: &State<'_, TimelineState>,
    llm_state: &State<'_, LlmState>,
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
) -> Result<(Option<ContextEvent>, Option<UtteranceEvent>), CommandError> {
    let candidate = evaluation
        .candidate
        .as_ref()
        .ok_or_else(|| CommandError::from("trigger evaluation has no candidate".to_string()))?;
    let metadata_json = trigger_context_metadata_json(snapshot, privacy, evaluation);
    let mut repository = timeline_state
        .repository()
        .lock()
        .map_err(|_| CommandError::from("timeline repository lock was poisoned".to_string()))?;
    let context_event = repository
        .create_context_event(CreateContextEventInput {
            app_name: snapshot.app_name.clone(),
            window_title: privacy.redacted_window_title.clone(),
            event_type: "trigger_context_snapshot".to_string(),
            metadata_json,
        })
        .map_err(|error| CommandError::from(error.to_string()))?;
    let llm_gate = llm_gate_for_trigger(snapshot, privacy, evaluation, candidate);
    if !llm_gate.allowed {
        return Ok((Some(context_event), None));
    }

    let generation = llm_state
        .generate_utterance(&llm_request_for_trigger(
            snapshot, privacy, evaluation, candidate,
        ))
        .map_err(|error| CommandError::from(error.to_string()))?;
    let utterance_event = repository
        .create_utterance_event(CreateUtteranceEventInput {
            trigger_type: candidate.trigger_type.as_str().to_string(),
            speakability_score: evaluation.speakability_score,
            message: generation.message,
            provider: generation.provider,
            context_event_id: Some(context_event.id.clone()),
        })
        .map_err(|error| CommandError::from(error.to_string()))?;

    Ok((Some(context_event), Some(utterance_event)))
}

fn trigger_context_metadata_json(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
) -> String {
    serde_json::json!({
        "bundleIdentifier": &snapshot.bundle_identifier,
        "processId": snapshot.process_id,
        "idleSeconds": snapshot.idle_seconds,
        "category": snapshot.category,
        "frontmostDurationMs": snapshot.frontmost_duration_ms,
        "privacy": {
            "isSensitive": privacy.is_sensitive,
            "reason": privacy.reason,
            "matchedKeyword": &privacy.matched_keyword,
            "shouldSuppressCapture": privacy.should_suppress_capture,
            "shouldSuppressUtterance": privacy.should_suppress_utterance,
        },
        "screenCapturePermission": get_screen_capture_permission_status(),
        "trigger": {
            "candidate": &evaluation.candidate,
            "speakabilityScore": evaluation.speakability_score,
            "action": evaluation.action,
        },
    })
    .to_string()
}

#[cfg(test)]
mod tests;
