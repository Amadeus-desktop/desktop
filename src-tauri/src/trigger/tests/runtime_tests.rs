use super::*;
use crate::trigger::scoring::{
    should_capture_ocr_for_trigger, should_probe_unknown_ocr_for_context,
};
use crate::{
    macos_context::AppCategory,
    settings::{talk_frequency_trigger_sensitivity, AppSettings},
};
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
fn runtime_blocks_repeated_utterance_until_frontmost_app_changes() {
    let mut runtime = TriggerRuntimeState::default();

    let first_input = runtime.input_for(
        snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
        normal_privacy("main.rs"),
    );
    assert!(!first_input.repeated_app_utterance_blocked);

    runtime.record_persisted_utterance_for_snapshot(&first_input.snapshot);

    let same_app_input = runtime.input_for(
        snapshot(AppCategory::Work, 190.0, 13 * 60 * 1000),
        normal_privacy("main.rs"),
    );
    assert!(same_app_input.repeated_app_utterance_blocked);

    let mut changed_app = snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000);
    changed_app.bundle_identifier = "com.apple.Terminal".to_string();
    changed_app.app_name = "Terminal".to_string();

    let changed_app_input = runtime.input_for(changed_app, normal_privacy("Terminal"));
    assert!(!changed_app_input.repeated_app_utterance_blocked);
}

#[test]
fn runtime_tracks_work_session_across_work_app_switches_and_resets_outside_work() {
    let mut runtime = TriggerRuntimeState::default();

    let first_input = runtime.input_for(
        snapshot(AppCategory::Work, 12.0, 30 * 60 * 1000),
        normal_privacy("main.rs"),
    );
    assert_eq!(first_input.work_session_duration_ms, 30 * 60 * 1000);

    let mut terminal = snapshot(AppCategory::Work, 12.0, 2 * 60 * 1000);
    terminal.bundle_identifier = "com.apple.Terminal".to_string();
    terminal.app_name = "Terminal".to_string();

    runtime.started_at = Instant::now() - Duration::from_secs(75 * 60);
    let switched_work_input = runtime.input_for(terminal, normal_privacy("Terminal"));
    assert!(switched_work_input.work_session_duration_ms >= 75 * 60 * 1000);

    let non_work_input = runtime.input_for(
        snapshot(AppCategory::NonWork, 12.0, 10 * 60 * 1000),
        normal_privacy("YouTube"),
    );
    assert_eq!(non_work_input.work_session_duration_ms, 0);
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
        None,
    );

    assert_eq!(request.trigger_type, "milestone");
    assert_eq!(request.trigger_reason, "long_work_session_milestone");
    assert_eq!(request.fallback_message, "fallback");
    assert_eq!(request.coarse_context_label, "work");
    assert_eq!(request.redacted_window_title, None);
    assert_eq!(request.redacted_ocr_summary, None);
}

#[test]
fn trigger_utterance_request_includes_redacted_ocr_summary_when_available() {
    let snapshot = snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000);
    let privacy = normal_privacy("main.rs");
    let candidate = TriggerCandidate {
        trigger_type: TriggerType::DeepPause,
        message: "fallback".to_string(),
        reason: "work_idle_after_sustained_focus".to_string(),
        base_score: 72,
    };
    let evaluation = TriggerEvaluation {
        candidate: Some(candidate.clone()),
        speakability_score: 72,
        action: TriggerAction::Bubble,
        should_persist: true,
        suppression_reason: None,
    };

    let request = llm_request_for_trigger(
        &snapshot,
        &privacy,
        &evaluation,
        &candidate,
        &AppSettings::default(),
        Some("redacted error summary"),
    );

    assert_eq!(
        request.redacted_ocr_summary,
        Some("redacted error summary".to_string())
    );
}

#[test]
fn trigger_ocr_capture_runs_only_for_persistable_safe_context() {
    let persistable = TriggerEvaluation {
        candidate: Some(TriggerCandidate {
            trigger_type: TriggerType::DeepPause,
            message: "fallback".to_string(),
            reason: "work_idle_after_sustained_focus".to_string(),
            base_score: 72,
        }),
        speakability_score: 72,
        action: TriggerAction::Bubble,
        should_persist: true,
        suppression_reason: None,
    };
    let non_persistable = TriggerEvaluation {
        should_persist: false,
        ..persistable.clone()
    };

    assert!(should_capture_ocr_for_trigger(
        &normal_privacy("main.rs"),
        &persistable
    ));
    assert!(!should_capture_ocr_for_trigger(
        &normal_privacy("main.rs"),
        &non_persistable
    ));
    assert!(!should_capture_ocr_for_trigger(
        &sensitive_privacy(),
        &persistable
    ));
}

#[test]
fn unknown_safe_context_can_probe_ocr_before_candidate_exists() {
    let unknown = snapshot(AppCategory::Unknown, 1.0, 5_000);

    assert!(should_probe_unknown_ocr_for_context(
        &unknown,
        &normal_privacy("Ghostty"),
        talk_frequency_trigger_sensitivity("active")
    ));
    assert!(!should_probe_unknown_ocr_for_context(
        &unknown,
        &sensitive_privacy(),
        talk_frequency_trigger_sensitivity("active")
    ));
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
