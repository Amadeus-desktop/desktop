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
fn llm_gate_blocks_high_privacy_policy_scores() {
    let snapshot = snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000);
    let privacy = sensitive_privacy();
    let candidate = TriggerCandidate {
        trigger_type: TriggerType::Milestone,
        message: "fallback".to_string(),
        reason: "long_work_session_milestone".to_string(),
        base_score: 82,
    };
    let evaluation = TriggerEvaluation {
        candidate: Some(candidate.clone()),
        speakability_score: 82,
        action: TriggerAction::Conversation,
        should_persist: true,
        suppression_reason: None,
    };

    let decision = llm_gate_for_trigger(&snapshot, &privacy, &evaluation, &candidate);

    assert!(!decision.allowed);
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
fn dismissed_reactions_can_suppress_bubble_persistence() {
    let evaluation = evaluate_trigger(TriggerInput {
        snapshot: snapshot(AppCategory::NonWork, 4.0, 15 * 60 * 1000),
        privacy: normal_privacy("YouTube"),
        recent_utterance_minutes_ago: None,
        dismissed_recent_count: 3,
        utterances_today: 0,
    });

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert_eq!(evaluation.speakability_score, 34);
    assert!(!evaluation.should_persist);
}

#[test]
fn suppresses_daily_utterance_limit() {
    let evaluation = evaluate_trigger(TriggerInput {
        snapshot: snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000),
        privacy: normal_privacy("main.rs"),
        recent_utterance_minutes_ago: None,
        dismissed_recent_count: 0,
        utterances_today: 12,
    });

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("daily_limit".to_string())
    );
}

#[test]
fn suppresses_when_no_trigger_threshold_matches() {
    let evaluation = evaluate_trigger(TriggerInput {
        snapshot: snapshot(AppCategory::Work, 4.0, 3 * 60 * 1000),
        privacy: normal_privacy("main.rs"),
        recent_utterance_minutes_ago: None,
        dismissed_recent_count: 0,
        utterances_today: 0,
    });

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("no_trigger".to_string())
    );
}

#[test]
fn deep_pause_takes_priority_over_milestone_when_idle_after_long_work() {
    let evaluation = evaluate_trigger(TriggerInput {
        snapshot: snapshot(AppCategory::Work, 180.0, 120 * 60 * 1000),
        privacy: normal_privacy("main.rs"),
        recent_utterance_minutes_ago: None,
        dismissed_recent_count: 0,
        utterances_today: 0,
    });

    let candidate = evaluation.candidate.expect("deep pause candidate");
    assert_eq!(candidate.trigger_type, TriggerType::DeepPause);
    assert_eq!(evaluation.action, TriggerAction::Bubble);
    assert_eq!(evaluation.speakability_score, 72);
}

#[test]
fn action_bands_follow_score_policy() {
    assert_eq!(action_for_score(100), TriggerAction::Conversation);
    assert_eq!(action_for_score(80), TriggerAction::Conversation);
    assert_eq!(action_for_score(79), TriggerAction::Bubble);
    assert_eq!(action_for_score(60), TriggerAction::Bubble);
    assert_eq!(action_for_score(59), TriggerAction::StatusOnly);
    assert_eq!(action_for_score(40), TriggerAction::StatusOnly);
    assert_eq!(action_for_score(39), TriggerAction::NoAction);
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
fn trigger_utterance_request_uses_policy_envelope_without_raw_title() {
    let snapshot = snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000);
    let privacy = normal_privacy("Amadeus");
    let candidate = TriggerCandidate {
        trigger_type: TriggerType::Milestone,
        message: "fallback".to_string(),
        reason: "long_work_session_milestone".to_string(),
        base_score: 82,
    };
    let evaluation = TriggerEvaluation {
        candidate: Some(candidate.clone()),
        speakability_score: 82,
        action: TriggerAction::Conversation,
        should_persist: true,
        suppression_reason: None,
    };

    let request = llm_request_for_trigger(&snapshot, &privacy, &evaluation, &candidate);

    assert_eq!(request.trigger_type, "milestone");
    assert_eq!(request.trigger_reason, "long_work_session_milestone");
    assert_eq!(request.fallback_message, "fallback");
    assert_eq!(request.coarse_context_label, "work");
    assert_eq!(request.redacted_window_title, None);
    assert_eq!(request.redacted_ocr_summary, None);
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
