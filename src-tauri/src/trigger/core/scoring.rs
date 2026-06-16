use crate::{
    llm::{LlmInputEnvelope, PolicyScoreSummary, ProviderInputGrade},
    macos_context::{AppCategory, MacosContextSnapshot},
    ocr::OcrContextClass,
    policy::{LlmGateDecision, PolicyScores},
    privacy::PrivacyAssessment,
    settings::{AppSettings, TriggerSensitivityPolicy},
};

use super::{
    history::{is_known_meeting_app, is_known_music_app},
    ProcessHistoryWindow, TriggerAction, TriggerCandidate, TriggerEvaluation, TriggerInput,
    TriggerType,
};

const MINUTE_MS: u128 = 60 * 1000;
const DEEP_PAUSE_MIN_WORK_CLUSTER_MS: u128 = 10 * MINUTE_MS;
const DEEP_PAUSE_MIN_WORK_CLUSTER_SWITCHES: u32 = 3;
const MILESTONE_MAX_IDLE_SECONDS: f64 = 600.0;
const ACTIVE_INPUT_MAX_IDLE_SECONDS: f64 = 5.0;
const AWAY_IDLE_MIN_SECONDS: f64 = 600.0;
const DRIFT_MIN_FRONTMOST_MS: u128 = 10 * MINUTE_MS;

pub(crate) fn llm_gate_for_trigger(
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

pub(crate) fn llm_request_for_trigger(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
    candidate: &TriggerCandidate,
    settings: &AppSettings,
    redacted_ocr_summary: Option<&str>,
) -> LlmInputEnvelope {
    let redacted_window_title = privacy
        .is_sensitive
        .then(|| privacy.redacted_window_title.clone());

    LlmInputEnvelope {
        provider_grade: ProviderInputGrade::LocalRedacted,
        persona_summary: Some(crate::llm::persona_summary(
            &settings.locale,
            &settings.nickname,
        )),
        safe_memory_summary: None,
        trigger_type: candidate.trigger_type.as_str().to_string(),
        trigger_reason: candidate.reason.clone(),
        tone_hint: "calm".to_string(),
        coarse_context_label: category_label(snapshot.category).to_string(),
        redacted_window_title,
        redacted_ocr_summary: redacted_ocr_summary.map(str::to_string),
        score_summary: Some(PolicyScoreSummary {
            privacy_bucket: if privacy.is_sensitive { "high" } else { "low" }.to_string(),
            speakability_bucket: score_bucket(evaluation.speakability_score).to_string(),
        }),
        fallback_message: candidate.message.clone(),
        locale: settings.locale.clone(),
    }
    .with_redacted_ocr_summary(redacted_ocr_summary.map(str::to_string))
}

pub(crate) fn should_capture_ocr_for_trigger(
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
) -> bool {
    evaluation.should_persist && !privacy.should_suppress_capture && !privacy.is_sensitive
}

pub(crate) fn should_probe_unknown_ocr_for_candidate(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    sensitivity: TriggerSensitivityPolicy,
) -> bool {
    snapshot.category == AppCategory::Unknown
        && snapshot.frontmost_duration_ms >= sensitivity.deep_pause_min_frontmost
        && snapshot.idle_seconds >= sensitivity.deep_pause_min_idle_seconds
        && snapshot.idle_seconds <= AWAY_IDLE_MIN_SECONDS
        && !privacy.should_suppress_capture
        && !privacy.is_sensitive
}

pub(crate) fn should_probe_unknown_ocr_for_context(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    sensitivity: TriggerSensitivityPolicy,
) -> bool {
    snapshot.category == AppCategory::Unknown
        && snapshot.frontmost_duration_ms >= sensitivity.unknown_ocr_probe_min_frontmost
        && snapshot.idle_seconds <= AWAY_IDLE_MIN_SECONDS
        && !privacy.should_suppress_capture
        && !privacy.is_sensitive
}

pub(crate) fn should_suppress_active_input_milestone(
    input: &TriggerInput,
    sensitivity: TriggerSensitivityPolicy,
) -> bool {
    input.snapshot.category == AppCategory::Work
        && input.snapshot.idle_seconds < ACTIVE_INPUT_MAX_IDLE_SECONDS
        && (input.snapshot.frontmost_duration_ms >= sensitivity.milestone_min_frontmost
            || input.work_session_duration_ms >= sensitivity.milestone_min_frontmost)
}

pub(crate) fn should_suppress_away_idle(input: &TriggerInput) -> bool {
    matches!(
        input.snapshot.category,
        AppCategory::Work | AppCategory::Unknown
    ) && input.snapshot.idle_seconds > AWAY_IDLE_MIN_SECONDS
}

pub(crate) fn apply_ocr_signal_to_evaluation(
    mut evaluation: TriggerEvaluation,
    redacted_ocr_summary: Option<&str>,
) -> TriggerEvaluation {
    if !evaluation.should_persist || !is_blocked_ocr_signal(redacted_ocr_summary) {
        return evaluation;
    }

    evaluation.speakability_score = (evaluation.speakability_score + 8).clamp(0, 100);
    evaluation.action = action_for_score(evaluation.speakability_score);
    evaluation.should_persist = matches!(
        evaluation.action,
        TriggerAction::Bubble | TriggerAction::Conversation
    );
    evaluation
}

pub(crate) fn select_unknown_ocr_candidate(
    snapshot: &MacosContextSnapshot,
    context_class: Option<OcrContextClass>,
    history: Option<&ProcessHistoryWindow>,
    sensitivity: TriggerSensitivityPolicy,
) -> Option<TriggerCandidate> {
    let context_class = context_class?;
    if let Some(candidate) =
        select_unknown_video_drift_candidate(snapshot, context_class, history, sensitivity)
    {
        return Some(candidate);
    }

    if snapshot.category != AppCategory::Unknown
        || !context_class.can_promote_unknown_to_work_like()
        || snapshot.frontmost_duration_ms < sensitivity.deep_pause_min_frontmost
    {
        return None;
    }

    if snapshot.idle_seconds < MILESTONE_MAX_IDLE_SECONDS
        && snapshot.frontmost_duration_ms >= sensitivity.milestone_min_frontmost
    {
        return Some(TriggerCandidate {
            trigger_type: TriggerType::Milestone,
            message: "조용히 오래 해내고 있었네.".to_string(),
            reason: "unknown_work_like_ocr_milestone".to_string(),
            base_score: 82,
        });
    }

    if snapshot.idle_seconds < sensitivity.deep_pause_min_idle_seconds {
        return None;
    }

    Some(TriggerCandidate {
        trigger_type: TriggerType::DeepPause,
        message: "잠깐 정리할 타이밍 같아. 이어갈 한 가지만 같이 잡아보자.".to_string(),
        reason: "unknown_work_like_ocr_after_pause".to_string(),
        base_score: 72,
    })
}

fn select_unknown_video_drift_candidate(
    snapshot: &MacosContextSnapshot,
    context_class: OcrContextClass,
    history: Option<&ProcessHistoryWindow>,
    sensitivity: TriggerSensitivityPolicy,
) -> Option<TriggerCandidate> {
    let history = history?;
    if snapshot.category != AppCategory::Unknown
        || context_class != OcrContextClass::VideoPlayer
        || history.work_cluster_duration_ms < sensitivity.deep_pause_min_frontmost
        || history.app_switch_count == 0
        || (snapshot.idle_seconds < sensitivity.deep_pause_min_idle_seconds
            && snapshot.frontmost_duration_ms < sensitivity.deep_pause_min_frontmost)
    {
        return None;
    }

    Some(TriggerCandidate {
        trigger_type: TriggerType::Drift,
        message: "쉬는 중이면 괜찮아. 돌아가고 싶어지면 내가 옆에 있을게.".to_string(),
        reason: "unknown_video_ocr_after_work".to_string(),
        base_score: 64,
    })
}

pub(crate) fn is_blocked_ocr_signal(redacted_ocr_summary: Option<&str>) -> bool {
    let Some(summary) = redacted_ocr_summary else {
        return false;
    };
    let summary = summary.to_ascii_lowercase();
    [
        "error",
        "failed",
        "failure",
        "exception",
        "panic",
        "traceback",
        "cannot",
        "can't",
        "unresolved",
        "오류",
        "에러",
        "실패",
        "안됨",
        "안 돼",
    ]
    .iter()
    .any(|keyword| summary.contains(keyword))
}

pub(super) fn select_candidate(
    snapshot: &MacosContextSnapshot,
    sensitivity: TriggerSensitivityPolicy,
) -> Option<TriggerCandidate> {
    if snapshot.category == AppCategory::Work
        && snapshot.frontmost_duration_ms >= sensitivity.deep_pause_min_frontmost
        && snapshot.idle_seconds >= sensitivity.deep_pause_min_idle_seconds
    {
        return Some(TriggerCandidate {
            trigger_type: TriggerType::DeepPause,
            message: "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.".to_string(),
            reason: "work_idle_after_sustained_focus".to_string(),
            base_score: 72,
        });
    }

    if snapshot.category == AppCategory::Work
        && snapshot.frontmost_duration_ms >= sensitivity.milestone_min_frontmost
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

pub(super) fn select_work_cluster_candidate(
    snapshot: &MacosContextSnapshot,
    history: Option<&ProcessHistoryWindow>,
    sensitivity: TriggerSensitivityPolicy,
) -> Option<TriggerCandidate> {
    let history = history?;
    if snapshot.category == AppCategory::Work
        && snapshot.idle_seconds >= sensitivity.deep_pause_min_idle_seconds
        && history.work_cluster_duration_ms >= DEEP_PAUSE_MIN_WORK_CLUSTER_MS
        && history.app_switch_count >= DEEP_PAUSE_MIN_WORK_CLUSTER_SWITCHES
    {
        return Some(TriggerCandidate {
            trigger_type: TriggerType::DeepPause,
            message: "작업 흐름이 잠깐 멈춘 것 같아. 이어갈 실마리만 같이 잡아보자.".to_string(),
            reason: "work_cluster_idle_after_multitask".to_string(),
            base_score: 72,
        });
    }

    None
}

pub(super) fn select_work_session_milestone_candidate(
    snapshot: &MacosContextSnapshot,
    work_session_duration_ms: u128,
    sensitivity: TriggerSensitivityPolicy,
) -> Option<TriggerCandidate> {
    if snapshot.category == AppCategory::Work
        && work_session_duration_ms >= sensitivity.milestone_min_frontmost
        && snapshot.idle_seconds < MILESTONE_MAX_IDLE_SECONDS
    {
        return Some(TriggerCandidate {
            trigger_type: TriggerType::Milestone,
            message: "조용히 오래 해내고 있었네.".to_string(),
            reason: "long_work_session_milestone".to_string(),
            base_score: 82,
        });
    }

    None
}

pub(super) fn exception_suppression(input: &TriggerInput) -> Option<&'static str> {
    if suppress_fullscreen_non_work(&input.snapshot) {
        return Some("fullscreen_non_work");
    }

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

fn suppress_fullscreen_non_work(snapshot: &MacosContextSnapshot) -> bool {
    snapshot.category == AppCategory::NonWork && snapshot.is_fullscreen
}

pub(crate) fn action_for_score(score: i64) -> TriggerAction {
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

pub(crate) fn suppressed(reason: &str) -> TriggerEvaluation {
    TriggerEvaluation {
        candidate: None,
        speakability_score: 0,
        action: TriggerAction::NoAction,
        should_persist: false,
        suppression_reason: Some(reason.to_string()),
    }
}
