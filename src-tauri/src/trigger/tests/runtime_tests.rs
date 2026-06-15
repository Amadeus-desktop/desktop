use super::*;
use crate::{macos_context::AppCategory, settings::AppSettings};
use std::time::Duration;

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

    let request = llm_request_for_trigger(
        &snapshot,
        &privacy,
        &evaluation,
        &candidate,
        &AppSettings::default(),
    );

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
