use serde::Serialize;
use std::{
    error::Error,
    fmt::{Display, Formatter},
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::State;

use crate::{
    llm::{LlmState, LlmUtteranceRequest},
    macos_context::{
        read_current_snapshot, AppCategory, ContextBridgeState, MacosContextError,
        MacosContextSnapshot,
    },
    privacy::{assess_privacy, get_screen_capture_permission_status, PrivacyAssessment},
    timeline::{
        ContextEvent, CreateContextEventInput, CreateUtteranceEventInput, TimelineState,
        UtteranceEvent,
    },
};

const MINUTE_MS: u128 = 60 * 1000;
const DEEP_PAUSE_MIN_FRONTMOST_MS: u128 = 10 * MINUTE_MS;
const DEEP_PAUSE_MIN_IDLE_SECONDS: f64 = 120.0;
const MILESTONE_MIN_FRONTMOST_MS: u128 = 60 * MINUTE_MS;
const MILESTONE_MAX_IDLE_SECONDS: f64 = 600.0;
const DRIFT_MIN_FRONTMOST_MS: u128 = 10 * MINUTE_MS;
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
}

impl TriggerRuntimeState {
    fn input_for(
        &self,
        snapshot: MacosContextSnapshot,
        privacy: PrivacyAssessment,
    ) -> TriggerInput {
        TriggerInput {
            snapshot,
            privacy,
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
        persist_trigger_events(&timeline_state, &llm_state, &snapshot, &privacy, &evaluation)?
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

    let Some(candidate) = select_candidate(&input.snapshot) else {
        return suppressed("no_trigger");
    };

    let speakability_score = (candidate.base_score - (input.dismissed_recent_count.max(0) * 10))
        .clamp(0, 100);
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
    let generation = llm_state
        .generate_utterance(&llm_request_for_trigger(snapshot, candidate))
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

fn llm_request_for_trigger(
    snapshot: &MacosContextSnapshot,
    candidate: &TriggerCandidate,
) -> LlmUtteranceRequest {
    LlmUtteranceRequest {
        trigger_type: candidate.trigger_type.as_str().to_string(),
        trigger_reason: candidate.reason.clone(),
        app_name: snapshot.app_name.clone(),
        window_title: snapshot.window_title.clone(),
        fallback_message: candidate.message.clone(),
    }
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

fn select_candidate(snapshot: &MacosContextSnapshot) -> Option<TriggerCandidate> {
    if snapshot.category == AppCategory::Work
        && snapshot.frontmost_duration_ms >= DEEP_PAUSE_MIN_FRONTMOST_MS
        && snapshot.idle_seconds >= DEEP_PAUSE_MIN_IDLE_SECONDS
    {
        return Some(TriggerCandidate {
            trigger_type: TriggerType::DeepPause,
            message: "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.".to_string(),
            reason: "work_idle_after_sustained_focus".to_string(),
            base_score: 72,
        });
    }

    if snapshot.category == AppCategory::Work
        && snapshot.frontmost_duration_ms >= MILESTONE_MIN_FRONTMOST_MS
        && snapshot.idle_seconds < MILESTONE_MAX_IDLE_SECONDS
    {
        return Some(TriggerCandidate {
            trigger_type: TriggerType::Milestone,
            message: "조용히 오래 해내고 있었네.".to_string(),
            reason: "long_work_session_milestone".to_string(),
            base_score: 82,
        });
    }

    if snapshot.category == AppCategory::NonWork
        && snapshot.frontmost_duration_ms >= DRIFT_MIN_FRONTMOST_MS
    {
        return Some(TriggerCandidate {
            trigger_type: TriggerType::Drift,
            message: "쉬는 중이면 괜찮아. 돌아가고 싶어지면 내가 옆에 있을게.".to_string(),
            reason: "non_work_duration_detected".to_string(),
            base_score: 64,
        });
    }

    None
}

fn action_for_score(score: i64) -> TriggerAction {
    match score {
        80..=100 => TriggerAction::Conversation,
        60..=79 => TriggerAction::Bubble,
        40..=59 => TriggerAction::StatusOnly,
        _ => TriggerAction::NoAction,
    }
}

fn suppressed(reason: &str) -> TriggerEvaluation {
    TriggerEvaluation {
        candidate: None,
        speakability_score: 0,
        action: TriggerAction::NoAction,
        should_persist: false,
        suppression_reason: Some(reason.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        macos_context::{AppCategory, MacosContextSnapshot},
        privacy::PrivacyAssessment,
    };
    use std::time::Duration;

    #[test]
    fn suppresses_sensitive_privacy_context() {
        let evaluation = evaluate_trigger(TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: sensitive_privacy(),
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        });

        assert_eq!(evaluation.action, TriggerAction::NoAction);
        assert!(!evaluation.should_persist);
        assert_eq!(evaluation.suppression_reason, Some("privacy".to_string()));
    }

    #[test]
    fn creates_deep_pause_bubble_for_work_idle() {
        let evaluation = evaluate_trigger(TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("report.hwp"),
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        });

        let candidate = evaluation.candidate.expect("deep pause candidate");
        assert_eq!(candidate.trigger_type, TriggerType::DeepPause);
        assert_eq!(evaluation.action, TriggerAction::Bubble);
        assert_eq!(evaluation.speakability_score, 72);
        assert!(evaluation.should_persist);
    }

    #[test]
    fn creates_milestone_conversation_for_long_work_session() {
        let evaluation = evaluate_trigger(TriggerInput {
            snapshot: snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        });

        let candidate = evaluation.candidate.expect("milestone candidate");
        assert_eq!(candidate.trigger_type, TriggerType::Milestone);
        assert_eq!(evaluation.action, TriggerAction::Conversation);
        assert_eq!(evaluation.speakability_score, 82);
        assert!(evaluation.should_persist);
    }

    #[test]
    fn creates_drift_bubble_for_non_work_duration() {
        let evaluation = evaluate_trigger(TriggerInput {
            snapshot: snapshot(AppCategory::NonWork, 4.0, 15 * 60 * 1000),
            privacy: normal_privacy("YouTube"),
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        });

        let candidate = evaluation.candidate.expect("drift candidate");
        assert_eq!(candidate.trigger_type, TriggerType::Drift);
        assert_eq!(evaluation.action, TriggerAction::Bubble);
        assert_eq!(evaluation.speakability_score, 64);
        assert!(evaluation.should_persist);
    }

    #[test]
    fn suppresses_recent_utterance_cooldown() {
        let evaluation = evaluate_trigger(TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("report.hwp"),
            recent_utterance_minutes_ago: Some(12),
            dismissed_recent_count: 0,
            utterances_today: 0,
        });

        assert_eq!(evaluation.action, TriggerAction::NoAction);
        assert!(!evaluation.should_persist);
        assert_eq!(evaluation.suppression_reason, Some("cooldown".to_string()));
    }

    #[test]
    fn dismissed_reactions_lower_action_intensity() {
        let evaluation = evaluate_trigger(TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("report.hwp"),
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 2,
            utterances_today: 0,
        });

        assert_eq!(evaluation.action, TriggerAction::StatusOnly);
        assert_eq!(evaluation.speakability_score, 52);
        assert!(!evaluation.should_persist);
    }

    #[test]
    fn runtime_tracks_recent_utterance_minutes() {
        let mut runtime = TriggerRuntimeState::default();
        runtime.last_utterance_at = Some(Instant::now() - Duration::from_secs(12 * 60));

        let input = runtime.input_for(
            snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            normal_privacy("report.hwp"),
        );

        assert_eq!(input.recent_utterance_minutes_ago, Some(12));
    }

    #[test]
    fn runtime_reaction_scoring_recovers_after_engagement() {
        let mut runtime = TriggerRuntimeState::default();

        runtime.record_reaction("dismissed");
        runtime.record_reaction("closed");
        assert_eq!(runtime.snapshot().dismissed_recent_count, 2);

        runtime.record_reaction("opened");
        assert_eq!(runtime.snapshot().dismissed_recent_count, 0);
    }

    #[test]
    fn runtime_counts_ignored_as_negative_feedback() {
        let mut runtime = TriggerRuntimeState::default();

        runtime.record_reaction("ignored");

        assert_eq!(runtime.snapshot().dismissed_recent_count, 1);
    }

    #[test]
    fn trigger_utterance_request_uses_candidate_context() {
        let snapshot = snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000);
        let candidate = TriggerCandidate {
            trigger_type: TriggerType::Milestone,
            message: "fallback".to_string(),
            reason: "long_work_session_milestone".to_string(),
            base_score: 82,
        };

        let request = llm_request_for_trigger(&snapshot, &candidate);

        assert_eq!(request.trigger_type, "milestone");
        assert_eq!(request.trigger_reason, "long_work_session_milestone");
        assert_eq!(request.fallback_message, "fallback");
        assert_eq!(request.app_name, "Visual Studio Code");
    }

    #[test]
    fn automatic_poll_allows_first_evaluation() {
        let runtime = TriggerRuntimeState::default();

        let decision = runtime.automatic_poll_decision(Duration::from_secs(60));

        assert!(decision.ready);
        assert_eq!(decision.wait_seconds, 0);
        assert_eq!(decision.suppression_reason, None);
    }

    #[test]
    fn automatic_poll_suppresses_immediate_recheck() {
        let mut runtime = TriggerRuntimeState::default();
        runtime.record_automatic_evaluation();

        let decision = runtime.automatic_poll_decision(Duration::from_secs(60));

        assert!(!decision.ready);
        assert!(decision.wait_seconds > 0);
        assert_eq!(
            decision.suppression_reason,
            Some("poll_cadence".to_string())
        );
    }

    #[test]
    fn automatic_poll_allows_after_interval() {
        let mut runtime = TriggerRuntimeState::default();
        runtime.last_automatic_evaluation_at = Some(Instant::now() - Duration::from_secs(61));

        let decision = runtime.automatic_poll_decision(Duration::from_secs(60));

        assert!(decision.ready);
        assert_eq!(decision.wait_seconds, 0);
    }

    fn snapshot(
        category: AppCategory,
        idle_seconds: f64,
        frontmost_duration_ms: u128,
    ) -> MacosContextSnapshot {
        MacosContextSnapshot {
            app_name: "Visual Studio Code".to_string(),
            bundle_identifier: "com.microsoft.VSCode".to_string(),
            process_id: 100,
            window_title: "Amadeus".to_string(),
            idle_seconds,
            category,
            frontmost_duration_ms,
        }
    }

    fn normal_privacy(window_title: &str) -> PrivacyAssessment {
        PrivacyAssessment {
            is_sensitive: false,
            reason: None,
            matched_keyword: None,
            should_suppress_capture: false,
            should_suppress_utterance: false,
            redacted_window_title: window_title.to_string(),
        }
    }

    fn sensitive_privacy() -> PrivacyAssessment {
        PrivacyAssessment {
            is_sensitive: true,
            reason: None,
            matched_keyword: None,
            should_suppress_capture: true,
            should_suppress_utterance: true,
            redacted_window_title: "[민감 창 숨김]".to_string(),
        }
    }
}
