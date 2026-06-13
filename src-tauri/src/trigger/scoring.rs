use crate::{
    llm::{LlmInputEnvelope, PolicyScoreSummary, ProviderInputGrade},
    macos_context::{AppCategory, MacosContextSnapshot},
    policy::{LlmGateDecision, PolicyScores},
    privacy::PrivacyAssessment,
};

use super::{
    history::{is_known_meeting_app, is_known_music_app},
    ProcessHistoryWindow, TriggerAction, TriggerCandidate, TriggerEvaluation, TriggerInput,
    TriggerType,
};

const MINUTE_MS: u128 = 60 * 1000;
const DEEP_PAUSE_MIN_FRONTMOST_MS: u128 = 10 * MINUTE_MS;
const DEEP_PAUSE_MIN_IDLE_SECONDS: f64 = 120.0;
const MILESTONE_MIN_FRONTMOST_MS: u128 = 60 * MINUTE_MS;
const MILESTONE_MAX_IDLE_SECONDS: f64 = 600.0;
const DRIFT_MIN_FRONTMOST_MS: u128 = 10 * MINUTE_MS;

pub(super) fn llm_gate_for_trigger(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
    candidate: &TriggerCandidate,
) -> LlmGateDecision {
    LlmGateDecision::from_scores(policy_scores_for_trigger(
        snapshot, privacy, evaluation, candidate,
    ))
}

fn policy_scores_for_trigger(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
    candidate: &TriggerCandidate,
) -> PolicyScores {
    PolicyScores {
        privacy_risk_score: if privacy.should_suppress_utterance || privacy.is_sensitive {
            70
        } else {
            20
        },
        context_confidence_score: if snapshot.category == AppCategory::Unknown {
            40
        } else {
            70
        },
        attention_stability_score: candidate.base_score.clamp(0, 100),
        capture_value_score: 0,
        speakability_score: evaluation.speakability_score,
    }
}

pub(super) fn llm_request_for_trigger(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
    candidate: &TriggerCandidate,
) -> LlmInputEnvelope {
    let redacted_window_title = privacy
        .is_sensitive
        .then(|| privacy.redacted_window_title.clone());

    LlmInputEnvelope {
        provider_grade: ProviderInputGrade::LocalRedacted,
        persona_summary: None,
        safe_memory_summary: None,
        trigger_type: candidate.trigger_type.as_str().to_string(),
        trigger_reason: candidate.reason.clone(),
        tone_hint: "calm".to_string(),
        coarse_context_label: category_label(snapshot.category).to_string(),
        redacted_window_title,
        redacted_ocr_summary: None,
        score_summary: Some(PolicyScoreSummary {
            privacy_bucket: if privacy.is_sensitive { "high" } else { "low" }.to_string(),
            speakability_bucket: score_bucket(evaluation.speakability_score).to_string(),
        }),
        fallback_message: candidate.message.clone(),
    }
}

pub(super) fn select_candidate(snapshot: &MacosContextSnapshot) -> Option<TriggerCandidate> {
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

pub(super) fn exception_suppression(input: &TriggerInput) -> Option<&'static str> {
    let Some(history) = input.history.as_ref() else {
        return None;
    };

    if history.known_meeting_app_frontmost || is_known_meeting_app(&input.snapshot) {
        return Some("meeting");
    }

    if suppress_music_drift(&input.snapshot, history) {
        return Some("music_short_foreground");
    }

    if suppress_work_cluster_drift(&input.snapshot, history) {
        return Some("work_cluster");
    }

    None
}

fn suppress_music_drift(snapshot: &MacosContextSnapshot, history: &ProcessHistoryWindow) -> bool {
    is_known_music_app(snapshot)
        && snapshot.category == AppCategory::NonWork
        && history.known_music_app_frontmost_ms < 60_000
}

fn suppress_work_cluster_drift(
    snapshot: &MacosContextSnapshot,
    history: &ProcessHistoryWindow,
) -> bool {
    snapshot.category == AppCategory::NonWork
        && history.work_cluster_duration_ms >= 10 * MINUTE_MS
        && history.app_switch_count >= 3
        && history.non_work_single_app_max_duration_ms < 10 * MINUTE_MS
}

pub(super) fn action_for_score(score: i64) -> TriggerAction {
    match score {
        80..=100 => TriggerAction::Conversation,
        60..=79 => TriggerAction::Bubble,
        40..=59 => TriggerAction::StatusOnly,
        _ => TriggerAction::NoAction,
    }
}

fn score_bucket(score: i64) -> &'static str {
    match score {
        80..=100 => "high",
        60..=79 => "medium",
        40..=59 => "low",
        _ => "blocked",
    }
}

fn category_label(category: AppCategory) -> &'static str {
    match category {
        AppCategory::Work => "work",
        AppCategory::NonWork => "non_work",
        AppCategory::Unknown => "unknown",
    }
}

pub(super) fn suppressed(reason: &str) -> TriggerEvaluation {
    TriggerEvaluation {
        candidate: None,
        speakability_score: 0,
        action: TriggerAction::NoAction,
        should_persist: false,
        suppression_reason: Some(reason.to_string()),
    }
}
