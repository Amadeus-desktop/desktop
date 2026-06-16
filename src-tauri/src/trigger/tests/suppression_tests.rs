use super::*;
use crate::{macos_context::AppCategory, settings::AppSettings};

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
fn spotify_short_foreground_does_not_trigger_drift() {
    let mut snapshot = snapshot(AppCategory::NonWork, 4.0, 30_000);
    snapshot.app_name = "Spotify".to_string();
    snapshot.bundle_identifier = "com.spotify.client".to_string();
    let mut history = ProcessHistoryWindow::default();
    history.observe_snapshot_at(&snapshot, &normal_privacy("Spotify"), 30_000);

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot,
            privacy: normal_privacy("Spotify"),
            history: Some(history),
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert_eq!(
        evaluation.suppression_reason,
        Some("music_short_foreground".to_string())
    );
}

#[test]
fn meeting_app_suppresses_deep_pause() {
    let mut snapshot = snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000);
    snapshot.app_name = "Zoom".to_string();
    snapshot.bundle_identifier = "us.zoom.xos".to_string();
    let mut history = ProcessHistoryWindow::default();
    history.known_meeting_app_frontmost = true;

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot,
            privacy: normal_privacy("Zoom Meeting"),
            history: Some(history),
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert_eq!(evaluation.suppression_reason, Some("meeting".to_string()));
}

#[test]
fn work_cluster_app_switching_suppresses_short_non_work_detour() {
    let mut history = ProcessHistoryWindow::default();
    history.work_cluster_duration_ms = 12 * 60 * 1000;
    history.app_switch_count = 4;
    history.non_work_single_app_max_duration_ms = 3 * 60 * 1000;

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::NonWork, 4.0, 3 * 60 * 1000),
            privacy: normal_privacy("API docs"),
            history: Some(history),
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert_eq!(
        evaluation.suppression_reason,
        Some("work_cluster".to_string())
    );
}

#[test]
fn expired_meeting_segment_does_not_suppress_later_work() {
    let mut history = ProcessHistoryWindow::default();
    let mut meeting = snapshot(AppCategory::Work, 5.0, 60_000);
    meeting.app_name = "Zoom".to_string();
    meeting.bundle_identifier = "us.zoom.xos".to_string();
    history.observe_snapshot_at(&meeting, &normal_privacy("Zoom"), 60_000);

    let work = snapshot(AppCategory::Work, 180.0, 12 * 60 * 1000);
    history.observe_snapshot_at(&work, &normal_privacy("main.rs"), 12 * 60 * 1000 + 60_001);

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: work,
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

    assert_ne!(evaluation.suppression_reason, Some("meeting".to_string()));
    assert_eq!(evaluation.action, TriggerAction::Bubble);
}

#[test]
fn prior_short_music_foreground_does_not_suppress_youtube_drift() {
    let mut history = ProcessHistoryWindow::default();
    let mut spotify = snapshot(AppCategory::NonWork, 2.0, 30_000);
    spotify.app_name = "Spotify".to_string();
    spotify.bundle_identifier = "com.spotify.client".to_string();
    history.observe_snapshot_at(&spotify, &normal_privacy("Spotify"), 30_000);

    let mut youtube = snapshot(AppCategory::NonWork, 2.0, 15 * 60 * 1000);
    youtube.app_name = "Google Chrome".to_string();
    youtube.bundle_identifier = "com.google.Chrome".to_string();
    youtube.window_title = "YouTube".to_string();
    history.observe_snapshot_at(&youtube, &normal_privacy("YouTube"), 16 * 60 * 1000);

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: youtube,
            privacy: normal_privacy("YouTube"),
            history: Some(history),
            recent_utterance_minutes_ago: None,
            repeated_app_utterance_blocked: false,
            work_session_duration_ms: 0,
            dismissed_recent_count: 0,
            utterances_today: 0,
        },
        &AppSettings::default(),
    );

    assert_ne!(
        evaluation.suppression_reason,
        Some("music_short_foreground".to_string())
    );
    assert_eq!(evaluation.action, TriggerAction::Bubble);
}
