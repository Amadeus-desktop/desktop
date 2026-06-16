use super::*;
use crate::ocr::OcrContextClass;
use crate::trigger::core::{evaluate_trigger_with_ocr, evaluate_trigger_with_ocr_context};
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
fn suppresses_repeated_utterance_in_same_frontmost_app() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: true,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("repeated_app_utterance".to_string())
    );
}

#[test]
fn creates_deep_pause_for_multitask_work_cluster_idle() {
    let mut history = ProcessHistoryWindow::default();
    history.work_cluster_duration_ms = 12 * 60 * 1000;
    history.app_switch_count = 4;

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 2 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: Some(history),
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    let candidate = evaluation.candidate.expect("work cluster deep pause");
    assert_eq!(candidate.trigger_type, TriggerType::DeepPause);
    assert_eq!(candidate.reason, "work_cluster_idle_after_multitask");
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
fn ocr_blocked_candidate_message_does_not_reveal_screen_watching() {
    let evaluation = evaluate_trigger_with_ocr(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 70.0, 6 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
        Some("compile error failed cannot resolve module"),
    );

    let candidate = evaluation.candidate.expect("ocr deep pause candidate");
    assert_eq!(
        candidate.message,
        "잠깐 정리할 타이밍 같아. 지금은 한 가지만 같이 좁혀보자."
    );
    assert!(!candidate.message.contains("화면"));
    assert!(!candidate.message.contains("흔적"));
    assert!(!candidate.message.contains("보여"));
}

#[test]
fn unknown_context_does_not_promote_from_ocr_blocked_signal() {
    let evaluation = evaluate_trigger_with_ocr(
        TriggerInput {
            snapshot: snapshot(AppCategory::Unknown, 70.0, 6 * 60 * 1000),
            privacy: normal_privacy("Zeta AI Chat"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
        Some("compile error failed cannot resolve module"),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("no_trigger".to_string())
    );
}

#[test]
fn unknown_context_can_promote_from_work_like_ocr_class() {
    let evaluation = evaluate_trigger_with_ocr_context(
        TriggerInput {
            snapshot: snapshot(AppCategory::Unknown, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("Unknown Browser"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
        Some("planning document todo next steps"),
        Some(OcrContextClass::WorkDocument),
    );

    let candidate = evaluation
        .candidate
        .expect("unknown work-like OCR candidate");
    assert_eq!(candidate.trigger_type, TriggerType::DeepPause);
    assert_eq!(candidate.reason, "unknown_work_like_ocr_after_pause");
    assert_eq!(evaluation.action, TriggerAction::Bubble);
    assert!(evaluation.should_persist);
}

#[test]
fn unknown_context_does_not_promote_from_consumption_ocr_class() {
    let evaluation = evaluate_trigger_with_ocr_context(
        TriggerInput {
            snapshot: snapshot(AppCategory::Unknown, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("Unknown Browser"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
        Some("next episode comments play pause"),
        Some(OcrContextClass::VideoPlayer),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("no_trigger".to_string())
    );
}

#[test]
fn creates_milestone_conversation_for_long_work_session() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
fn creates_milestone_for_long_work_session_across_app_switches() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 12.0, 2 * 60 * 1000),
            privacy: normal_privacy("Terminal"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 75 * 60 * 1000,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    let candidate = evaluation.candidate.expect("work session milestone");
    assert_eq!(candidate.trigger_type, TriggerType::Milestone);
    assert_eq!(candidate.reason, "long_work_session_milestone");
    assert_eq!(evaluation.action, TriggerAction::Conversation);
    assert_eq!(evaluation.speakability_score, 82);
    assert!(evaluation.should_persist);
}

#[test]
fn suppresses_milestone_while_user_is_actively_inputting() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 1.0, 120 * 60 * 1000),
            privacy: normal_privacy("main.rs"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 120 * 60 * 1000,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("active_input_guard".to_string())
    );
}

#[test]
fn creates_drift_bubble_for_non_work_duration() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::NonWork, 4.0, 15 * 60 * 1000),
            privacy: normal_privacy("YouTube"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
fn suppresses_fullscreen_non_work_drift() {
    let mut snapshot = snapshot(AppCategory::NonWork, 4.0, 15 * 60 * 1000);
    snapshot.is_fullscreen = true;

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot,
            privacy: normal_privacy("YouTube"),
            history: None,
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(
        evaluation.suppression_reason,
        Some("fullscreen_non_work".to_string())
    );
}

#[test]
fn suppresses_recent_utterance_cooldown() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000),
            privacy: normal_privacy("report.hwp"),
            history: None,
            recent_utterance_minutes_ago: Some(12),
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
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
