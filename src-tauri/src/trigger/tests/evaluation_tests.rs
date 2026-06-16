use super::*;
use crate::trigger::core::evaluate_trigger_with_ocr;
use crate::trigger::scoring::apply_ocr_signal_to_evaluation;
use crate::{macos_context::AppCategory, settings::AppSettings};

#[test]
fn suppresses_sensitive_privacy_context() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: sensitive_privacy(),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(evaluation.suppression_reason, Some("privacy".to_string()));
}

#[test]
fn creates_deep_pause_bubble_for_work_idle() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("report.hwp"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    let candidate = evaluation.candidate.expect("deep pause candidate");
    assert_eq!(candidate.trigger_type, TriggerType::DeepPause);
    assert_eq!(evaluation.action, TriggerAction::Bubble);
    assert_eq!(evaluation.speakability_score, 72);
    assert!(evaluation.should_persist);
}

#[test]
fn ocr_blocked_signal_can_promote_deep_pause_to_conversation() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    let promoted = apply_ocr_signal_to_evaluation(
        evaluation,
        Some("compile error failed cannot resolve module"),
    );

    assert_eq!(promoted.action, TriggerAction::Conversation);
    assert_eq!(promoted.speakability_score, 80);
    assert!(promoted.should_persist);
}

#[test]
fn neutral_ocr_summary_does_not_change_trigger_score() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    let unchanged = apply_ocr_signal_to_evaluation(
        evaluation.clone(),
        Some("planning document next steps notes"),
    );

    assert_eq!(unchanged.speakability_score, evaluation.speakability_score);
    assert_eq!(unchanged.action, evaluation.action);
    assert_eq!(unchanged.should_persist, evaluation.should_persist);
}

#[test]
fn ocr_blocked_signal_can_create_deep_pause_candidate_before_idle_threshold() {
    let evaluation = evaluate_trigger_with_ocr(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 70.0, 6 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
        Some("compile error failed cannot resolve module"),
    );

    let candidate = evaluation.candidate.expect("ocr deep pause candidate");
    assert_eq!(candidate.trigger_type, TriggerType::DeepPause);
    assert_eq!(candidate.reason, "ocr_blocked_signal_after_sustained_work");
    assert_eq!(evaluation.action, TriggerAction::Conversation);
    assert_eq!(evaluation.speakability_score, 80);
    assert!(evaluation.should_persist);
}

#[test]
fn creates_milestone_conversation_for_long_work_session() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    let candidate = evaluation.candidate.expect("milestone candidate");
    assert_eq!(candidate.trigger_type, TriggerType::Milestone);
    assert_eq!(evaluation.action, TriggerAction::Conversation);
    assert_eq!(evaluation.speakability_score, 82);
    assert!(evaluation.should_persist);
}

#[test]
fn creates_drift_bubble_for_non_work_duration() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::NonWork, 4.0, 15 * 60 * 1000),
            privacy: normal_privacy("YouTube"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    let candidate = evaluation.candidate.expect("drift candidate");
    assert_eq!(candidate.trigger_type, TriggerType::Drift);
    assert_eq!(evaluation.action, TriggerAction::Bubble);
    assert_eq!(evaluation.speakability_score, 64);
    assert!(evaluation.should_persist);
}

#[test]
fn suppresses_recent_utterance_cooldown() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("report.hwp"),
            history: None,
            recent_utterance_minutes_ago: Some(12),
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(evaluation.suppression_reason, Some("cooldown".to_string()));
}

#[test]
fn dismissed_reactions_lower_action_intensity() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("report.hwp"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 2,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::StatusOnly);
    assert_eq!(evaluation.speakability_score, 52);
    assert!(!evaluation.should_persist);
}

#[test]
fn dismissed_reactions_can_suppress_bubble_persistence() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::NonWork, 4.0, 15 * 60 * 1000),
            privacy: normal_privacy("YouTube"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 3,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert_eq!(evaluation.speakability_score, 34);
    assert!(!evaluation.should_persist);
}

#[test]
fn suppresses_daily_utterance_limit() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 12,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("daily_limit".to_string())
    );
}

#[test]
fn suppresses_when_no_trigger_threshold_matches() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 4.0, 3 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("no_trigger".to_string())
    );
}

#[test]
fn deep_pause_takes_priority_over_milestone_when_idle_after_long_work() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 120 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

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
