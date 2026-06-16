use super::*;
use crate::{
    macos_context::classify_app,
    ocr::OcrContextClass,
    settings::{talk_frequency_trigger_sensitivity, AppSettings},
    trigger::core::{evaluate_trigger_with_ocr, evaluate_trigger_with_ocr_context},
    trigger::scoring::should_probe_unknown_ocr_for_candidate,
};

const MINUTE_MS: u128 = 60 * 1000;

fn input(snapshot: MacosContextSnapshot) -> TriggerInput {
    TriggerInput {
        snapshot,
        privacy: normal_privacy("scenario"),
        history: None,
        recent_utterance_minutes_ago: None,
        repeated_app_utterance_blocked: false,
        work_session_duration_ms: 0,
        dismissed_recent_count: 0,
        utterances_today: 0,
    }
}

fn evaluate(snapshot: MacosContextSnapshot) -> TriggerEvaluation {
    evaluate_trigger(input(snapshot), &AppSettings::default())
}

fn quiet_settings() -> AppSettings {
    AppSettings {
        talk_frequency: "quiet".to_string(),
        ..AppSettings::default()
    }
}

fn assert_suppressed(evaluation: &TriggerEvaluation, reason: &str) {
    assert_eq!(evaluation.action, TriggerAction::NoAction);
    assert!(!evaluation.should_persist);
    assert_eq!(evaluation.suppression_reason.as_deref(), Some(reason));
}

fn assert_candidate(
    evaluation: &TriggerEvaluation,
    trigger_type: TriggerType,
    action: TriggerAction,
    reason: &str,
) {
    let candidate = evaluation.candidate.as_ref().expect("trigger candidate");
    assert_eq!(candidate.trigger_type, trigger_type);
    assert_eq!(candidate.reason, reason);
    assert_eq!(evaluation.action, action);
    assert!(evaluation.should_persist);
}

fn app_snapshot(
    category: AppCategory,
    app_name: &str,
    bundle_identifier: &str,
    window_title: &str,
    idle_seconds: f64,
    frontmost_duration_ms: u128,
) -> MacosContextSnapshot {
    let mut snapshot = snapshot(category, idle_seconds, frontmost_duration_ms);
    snapshot.app_name = app_name.to_string();
    snapshot.bundle_identifier = bundle_identifier.to_string();
    snapshot.window_title = window_title.to_string();
    snapshot
}

#[test]
fn docs_scenario_01_work_idle_after_ten_minutes_creates_deep_pause_bubble() {
    let evaluation = evaluate(snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS));

    assert_candidate(
        &evaluation,
        TriggerType::DeepPause,
        TriggerAction::Bubble,
        "work_idle_after_sustained_focus",
    );
}

#[test]
fn docs_scenario_02_youtube_drift_waits_until_non_work_reaches_ten_minutes() {
    let short_youtube = evaluate(snapshot(AppCategory::NonWork, 4.0, 2 * MINUTE_MS));
    assert_suppressed(&short_youtube, "no_trigger");

    let long_youtube = evaluate(snapshot(AppCategory::NonWork, 4.0, 10 * MINUTE_MS));
    assert_candidate(
        &long_youtube,
        TriggerType::Drift,
        TriggerAction::Bubble,
        "non_work_duration_detected",
    );
}

#[test]
fn docs_scenario_03_multitask_work_uses_cluster_and_work_session_fallbacks() {
    let mut history = ProcessHistoryWindow::default();
    history.work_cluster_duration_ms = 12 * MINUTE_MS;
    history.app_switch_count = 4;

    let cluster = evaluate_trigger(
        TriggerInput {
            history: Some(history),
            ..input(snapshot(AppCategory::Work, 180.0, 2 * MINUTE_MS))
        },
        &AppSettings::default(),
    );
    assert_candidate(
        &cluster,
        TriggerType::DeepPause,
        TriggerAction::Bubble,
        "work_cluster_idle_after_multitask",
    );

    let milestone = evaluate_trigger(
        TriggerInput {
            work_session_duration_ms: 75 * MINUTE_MS,
            ..input(snapshot(AppCategory::Work, 12.0, 2 * MINUTE_MS))
        },
        &AppSettings::default(),
    );
    assert_candidate(
        &milestone,
        TriggerType::Milestone,
        TriggerAction::Conversation,
        "long_work_session_milestone",
    );
}

#[test]
fn docs_scenario_04_background_music_does_not_affect_frontmost_work_decision() {
    let evaluation = evaluate(snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS));

    assert_candidate(
        &evaluation,
        TriggerType::DeepPause,
        TriggerAction::Bubble,
        "work_idle_after_sustained_focus",
    );
}

#[test]
fn docs_scenario_05_long_work_creates_milestone_when_idle_is_not_deep_pause() {
    let evaluation = evaluate(snapshot(AppCategory::Work, 12.0, 60 * MINUTE_MS));

    assert_candidate(
        &evaluation,
        TriggerType::Milestone,
        TriggerAction::Conversation,
        "long_work_session_milestone",
    );
}

#[test]
fn docs_scenario_06_work_ocr_blocked_signal_alone_stays_silent() {
    let evaluation = evaluate_trigger_with_ocr(
        input(snapshot(AppCategory::Work, 70.0, 6 * MINUTE_MS)),
        &quiet_settings(),
        Some("compile error failed cannot resolve module"),
    );

    assert_suppressed(&evaluation, "no_trigger");
}

#[test]
fn docs_scenario_07_meeting_frontmost_suppresses_deep_pause() {
    let mut history = ProcessHistoryWindow::default();
    history.known_meeting_app_frontmost = true;

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: app_snapshot(
                AppCategory::Work,
                "Zoom",
                "us.zoom.xos",
                "Zoom",
                180.0,
                12 * MINUTE_MS,
            ),
            history: Some(history),
            ..input(snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS))
        },
        &AppSettings::default(),
    );

    assert_suppressed(&evaluation, "meeting");
}

#[test]
fn docs_scenario_08_short_spotify_foreground_is_suppressed() {
    let spotify = app_snapshot(
        AppCategory::NonWork,
        "Spotify",
        "com.spotify.client",
        "Spotify",
        4.0,
        30_000,
    );
    let mut history = ProcessHistoryWindow::default();
    history.observe_snapshot_at(&spotify, &normal_privacy("Spotify"), 30_000);

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: spotify,
            history: Some(history),
            ..input(snapshot(AppCategory::NonWork, 4.0, 30_000))
        },
        &AppSettings::default(),
    );

    assert_suppressed(&evaluation, "music_short_foreground");
}

#[test]
fn docs_scenario_09_short_non_work_detour_inside_work_cluster_is_suppressed() {
    let mut history = ProcessHistoryWindow::default();
    history.work_cluster_duration_ms = 12 * MINUTE_MS;
    history.app_switch_count = 4;
    history.non_work_single_app_max_duration_ms = 3 * MINUTE_MS;

    let evaluation = evaluate_trigger(
        TriggerInput {
            history: Some(history),
            ..input(snapshot(AppCategory::NonWork, 4.0, 3 * MINUTE_MS))
        },
        &AppSettings::default(),
    );

    assert_suppressed(&evaluation, "work_cluster");
}

#[test]
fn docs_scenario_10_browser_work_titles_are_work_but_generic_safari_is_unknown() {
    assert_eq!(
        classify_app("com.apple.Safari", "Stack Overflow - Safari"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.apple.Safari", "Plain Article - Safari"),
        AppCategory::Unknown
    );

    let generic_safari = evaluate(app_snapshot(
        AppCategory::Unknown,
        "Safari",
        "com.apple.Safari",
        "Plain Article - Safari",
        180.0,
        12 * MINUTE_MS,
    ));
    assert_suppressed(&generic_safari, "no_trigger");
}

#[test]
fn docs_scenario_11_chrome_title_decides_work_or_non_work() {
    assert_eq!(
        classify_app("com.google.Chrome", "Notion Roadmap - Google Chrome"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.google.Chrome", "YouTube - Google Chrome"),
        AppCategory::NonWork
    );
}

#[test]
fn docs_scenario_12_collaboration_and_design_apps_are_work() {
    assert_eq!(
        classify_app("com.tinyspeck.slackmacgap", "Slack"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.figma.Desktop", "Figma"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.hnc.Discord", "Discord"),
        AppCategory::Work
    );
}

#[test]
fn docs_scenario_13_fullscreen_non_work_suppresses_drift() {
    let mut fullscreen = snapshot(AppCategory::NonWork, 4.0, 15 * MINUTE_MS);
    fullscreen.is_fullscreen = true;

    let evaluation = evaluate(fullscreen);

    assert_suppressed(&evaluation, "fullscreen_non_work");
}

#[test]
fn docs_scenario_14_games_are_currently_unknown_and_silent() {
    assert_eq!(
        classify_app("com.valvesoftware.steam", "Steam"),
        AppCategory::Unknown
    );

    let evaluation = evaluate(app_snapshot(
        AppCategory::Unknown,
        "Steam",
        "com.valvesoftware.steam",
        "Steam",
        0.0,
        15 * MINUTE_MS,
    ));

    assert_suppressed(&evaluation, "no_trigger");
}

#[test]
fn docs_scenario_15_keynote_presentation_is_unknown_and_silent() {
    assert_eq!(
        classify_app("com.apple.iWork.Keynote", "Keynote"),
        AppCategory::Unknown
    );

    let evaluation = evaluate(app_snapshot(
        AppCategory::Unknown,
        "Keynote",
        "com.apple.iWork.Keynote",
        "Presentation",
        30.0,
        20 * MINUTE_MS,
    ));

    assert_suppressed(&evaluation, "no_trigger");
}

#[test]
fn docs_scenario_16_same_app_repeated_utterance_is_blocked_until_app_changes() {
    let mut runtime = TriggerRuntimeState::default();
    let work = snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS);
    runtime.record_persisted_utterance_for_snapshot(&work);

    let same_app = runtime.input_for(work, normal_privacy("main.rs"));
    assert!(same_app.repeated_app_utterance_blocked);

    let changed = app_snapshot(
        AppCategory::Work,
        "Terminal",
        "com.apple.Terminal",
        "Terminal",
        180.0,
        12 * MINUTE_MS,
    );
    let changed_app = runtime.input_for(changed, normal_privacy("Terminal"));
    assert!(!changed_app.repeated_app_utterance_blocked);
}

#[test]
fn docs_scenario_17_daily_limit_suppresses_otherwise_valid_work() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            utterances_today: 12,
            ..input(snapshot(AppCategory::Work, 12.0, 60 * MINUTE_MS))
        },
        &AppSettings::default(),
    );

    assert_suppressed(&evaluation, "daily_limit");
}

#[test]
fn docs_scenario_18_recent_utterance_cooldown_suppresses_otherwise_valid_work() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            recent_utterance_minutes_ago: Some(12),
            ..input(snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS))
        },
        &AppSettings::default(),
    );

    assert_suppressed(&evaluation, "cooldown");
}

#[test]
fn docs_scenario_19_no_time_of_day_policy_exists_yet() {
    let evaluation = evaluate(snapshot(AppCategory::Work, 12.0, 60 * MINUTE_MS));

    assert_candidate(
        &evaluation,
        TriggerType::Milestone,
        TriggerAction::Conversation,
        "long_work_session_milestone",
    );
}

#[test]
fn docs_scenario_20_active_input_guard_suppresses_milestone() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            work_session_duration_ms: 120 * MINUTE_MS,
            ..input(snapshot(AppCategory::Work, 1.0, 120 * MINUTE_MS))
        },
        &AppSettings::default(),
    );

    assert_suppressed(&evaluation, "active_input_guard");
}

#[test]
fn docs_scenario_21_sensitive_privacy_context_suppresses_trigger() {
    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS),
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

    assert_suppressed(&evaluation, "privacy");
}

#[test]
fn docs_scenario_22_after_meeting_expires_work_can_trigger_again() {
    let mut history = ProcessHistoryWindow::default();
    let meeting = app_snapshot(
        AppCategory::Work,
        "Zoom",
        "us.zoom.xos",
        "Zoom",
        5.0,
        MINUTE_MS,
    );
    history.observe_snapshot_at(&meeting, &normal_privacy("Zoom"), MINUTE_MS);

    let work = snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS);
    history.observe_snapshot_at(&work, &normal_privacy("main.rs"), 13 * MINUTE_MS + 1);

    let evaluation = evaluate_trigger(
        TriggerInput {
            snapshot: work,
            history: Some(history),
            ..input(snapshot(AppCategory::Work, 180.0, 12 * MINUTE_MS))
        },
        &AppSettings::default(),
    );

    assert_candidate(
        &evaluation,
        TriggerType::DeepPause,
        TriggerAction::Bubble,
        "work_idle_after_sustained_focus",
    );
}

#[test]
fn docs_scenario_23_settled_work_after_short_switches_triggers_by_frontmost_duration() {
    let evaluation = evaluate(snapshot(AppCategory::Work, 180.0, 10 * MINUTE_MS));

    assert_candidate(
        &evaluation,
        TriggerType::DeepPause,
        TriggerAction::Bubble,
        "work_idle_after_sustained_focus",
    );
}

#[test]
fn docs_scenario_24_very_long_idle_is_treated_as_away_and_suppressed() {
    let away_work = snapshot(AppCategory::Work, 30.0 * 60.0, 12 * MINUTE_MS);
    let evaluation = evaluate(away_work.clone());

    assert_suppressed(&evaluation, "away_idle");

    let away_unknown = snapshot(AppCategory::Unknown, 30.0 * 60.0, 12 * MINUTE_MS);
    assert!(!should_probe_unknown_ocr_for_candidate(
        &away_unknown,
        &normal_privacy("Unknown Browser"),
        talk_frequency_trigger_sensitivity("quiet")
    ));
}

#[test]
fn docs_scenario_25_repeated_ocr_stuckness_is_required_before_standalone_help() {
    let evaluation = evaluate_trigger_with_ocr(
        input(snapshot(AppCategory::Work, 70.0, 6 * MINUTE_MS)),
        &quiet_settings(),
        Some("compile error failed cannot resolve module"),
    );

    assert_suppressed(&evaluation, "no_trigger");
}

#[test]
fn docs_scenario_26_long_tail_video_sites_remain_unknown_and_silent() {
    for (bundle, title) in [
        ("com.google.Chrome", "tvwiki - Google Chrome"),
        ("com.apple.Safari", "niconico - Safari"),
    ] {
        assert_eq!(classify_app(bundle, title), AppCategory::Unknown);
    }

    let evaluation = evaluate(app_snapshot(
        AppCategory::Unknown,
        "Safari",
        "com.apple.Safari",
        "niconico - Safari",
        180.0,
        12 * MINUTE_MS,
    ));
    assert_suppressed(&evaluation, "no_trigger");
}

#[test]
fn docs_scenario_27_ai_companion_sites_remain_unknown_and_do_not_create_drift() {
    for title in ["Zeta AI Chat - Google Chrome", "LoveyDovey - Google Chrome"] {
        assert_eq!(
            classify_app("com.google.Chrome", title),
            AppCategory::Unknown
        );
    }

    let evaluation = evaluate_trigger_with_ocr_context(
        input(app_snapshot(
            AppCategory::Unknown,
            "Google Chrome",
            "com.google.Chrome",
            "Zeta AI Chat - Google Chrome",
            180.0,
            12 * MINUTE_MS,
        )),
        &AppSettings::default(),
        Some("Zeta AI chat persona reply"),
        Some(OcrContextClass::AiChatCompanion),
    );

    assert_suppressed(&evaluation, "no_trigger");
}
