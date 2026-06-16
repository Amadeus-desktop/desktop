use tauri::State;

use crate::{
    llm::LlmState,
    macos_context::{read_current_snapshot, ContextBridgeState},
    observability::{info as log_info, warn as log_warn, LogArea},
    ocr::{capture_gate_input_for_command, OcrObservation, OcrState, ScreenCaptureState},
    privacy::{assess_privacy, get_screen_capture_permission_status},
    settings::{
        privacy_keywords_for, talk_frequency_poll_interval, talk_frequency_trigger_sensitivity,
        SettingsState,
    },
    timeline::TimelineState,
};

use super::{persistence::persist_trigger_events, CommandError};
use crate::trigger::{
    core::evaluate_trigger_with_ocr_context,
    scoring::{
        apply_ocr_signal_to_evaluation, should_capture_ocr_for_trigger,
        should_probe_unknown_ocr_for_candidate, should_probe_unknown_ocr_for_context, suppressed,
    },
    TriggerEngineState, TriggerPollDecision, TriggerPollResult, TriggerRunResult,
    TriggerRuntimeSnapshot,
};

#[tauri::command]
pub fn run_trigger_engine_once(
    context_state: State<'_, ContextBridgeState>,
    timeline_state: State<'_, TimelineState>,
    llm_state: State<'_, LlmState>,
    ocr_state: State<'_, OcrState>,
    capture_state: State<'_, ScreenCaptureState>,
    trigger_state: State<'_, TriggerEngineState>,
    settings_state: State<'_, SettingsState>,
    keywords: Vec<String>,
) -> Result<TriggerRunResult, CommandError> {
    let settings = settings_state
        .current()
        .map_err(|error| CommandError::from(error.to_string()))?;
    let effective_keywords = if keywords.is_empty() {
        privacy_keywords_for(&settings)
    } else {
        keywords
    };
    let snapshot = read_current_snapshot(&context_state)?;
    let privacy = assess_privacy(&snapshot, &effective_keywords);
    log_info(
        LogArea::Trigger,
        format!(
            "trigger snapshot read: app={} pid={} category={:?} idle_seconds={:.1} frontmost_ms={} browser_url_class={} browser_host={} sensitive={} capture_suppressed={}",
            snapshot.app_name,
            snapshot.process_id,
            snapshot.category,
            snapshot.idle_seconds,
            snapshot.frontmost_duration_ms,
            snapshot
                .browser_context
                .as_ref()
                .map(|context| format!("{:?}", context.url_class))
                .unwrap_or_else(|| "none".to_string()),
            snapshot
                .browser_context
                .as_ref()
                .and_then(|context| context.url_host.as_deref())
                .unwrap_or("none"),
            privacy.is_sensitive,
            privacy.should_suppress_capture
        ),
    );

    if !settings.proactive_trigger_enabled {
        log_info(
            LogArea::Trigger,
            "trigger run suppressed: proactive_disabled",
        );
        return Ok(TriggerRunResult {
            snapshot,
            privacy,
            evaluation: suppressed("proactive_disabled"),
            context_event: None,
            utterance_event: None,
        });
    }

    let trigger_input = trigger_state
        .runtime
        .lock()
        .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?
        .input_for(snapshot.clone(), privacy.clone());
    let sensitivity = talk_frequency_trigger_sensitivity(&settings.talk_frequency);
    let unknown_context_probe =
        should_probe_unknown_ocr_for_context(&snapshot, &privacy, sensitivity);
    let unknown_candidate_probe =
        should_probe_unknown_ocr_for_candidate(&snapshot, &privacy, sensitivity);
    let should_probe_unknown_ocr = unknown_context_probe || unknown_candidate_probe;
    log_info(
        LogArea::Trigger,
        format!(
            "trigger OCR probe decision: should_probe={} unknown_context_probe={} unknown_candidate_probe={} frontmost_ms={} idle_seconds={:.1}",
            should_probe_unknown_ocr,
            unknown_context_probe,
            unknown_candidate_probe,
            snapshot.frontmost_duration_ms,
            snapshot.idle_seconds
        ),
    );
    let mut ocr_observation = should_probe_unknown_ocr
        .then(|| {
            capture_trigger_ocr_observation(
                &ocr_state,
                &capture_state,
                &settings,
                &snapshot,
                &privacy,
            )
        })
        .flatten();
    let mut evaluation = evaluate_trigger_with_ocr_context(
        trigger_input,
        &settings,
        ocr_observation
            .as_ref()
            .map(|observation| observation.text_summary_redacted.as_str()),
        ocr_observation
            .as_ref()
            .map(|observation| observation.context_class),
    );
    let (context_event, utterance_event) = if evaluation.should_persist {
        let captured_after_evaluation =
            ocr_observation.is_none() && should_capture_ocr_for_trigger(&privacy, &evaluation);
        if captured_after_evaluation {
            ocr_observation = capture_trigger_ocr_observation(
                &ocr_state,
                &capture_state,
                &settings,
                &snapshot,
                &privacy,
            );
        }
        if captured_after_evaluation {
            evaluation = apply_ocr_signal_to_evaluation(
                evaluation,
                ocr_observation
                    .as_ref()
                    .map(|observation| observation.text_summary_redacted.as_str()),
            );
        }
        persist_trigger_events(
            &timeline_state,
            &llm_state,
            &settings,
            &snapshot,
            &privacy,
            &evaluation,
            ocr_observation
                .as_ref()
                .map(|observation| observation.text_summary_redacted.as_str()),
        )?
    } else {
        (None, None)
    };
    log_info(
        LogArea::Trigger,
        format!(
            "trigger run evaluated: action={:?} should_persist={} candidate={} suppression_reason={} utterance_persisted={}",
            evaluation.action,
            evaluation.should_persist,
            evaluation
                .candidate
                .as_ref()
                .map(|candidate| candidate.trigger_type.as_str())
                .unwrap_or("none"),
            evaluation.suppression_reason.as_deref().unwrap_or("none"),
            utterance_event.is_some()
        ),
    );

    if utterance_event.is_some() {
        trigger_state
            .runtime
            .lock()
            .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?
            .record_persisted_utterance_for_snapshot(&snapshot);
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
    ocr_state: State<'_, OcrState>,
    capture_state: State<'_, ScreenCaptureState>,
    trigger_state: State<'_, TriggerEngineState>,
    settings_state: State<'_, SettingsState>,
    keywords: Vec<String>,
) -> Result<TriggerPollResult, CommandError> {
    let settings = settings_state
        .current()
        .map_err(|error| CommandError::from(error.to_string()))?;

    if !settings.proactive_trigger_enabled {
        log_info(LogArea::Trigger, "trigger poll skipped: proactive_disabled");
        return Ok(TriggerPollResult {
            did_evaluate: false,
            decision: TriggerPollDecision {
                ready: false,
                wait_seconds: 0,
                suppression_reason: Some("proactive_disabled".to_string()),
            },
            run_result: None,
        });
    }

    let decision = {
        let mut runtime = trigger_state
            .runtime
            .lock()
            .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?;
        let decision =
            runtime.automatic_poll_decision(talk_frequency_poll_interval(&settings.talk_frequency));
        if decision.ready {
            runtime.record_automatic_evaluation();
        }
        decision
    };

    if !decision.ready {
        log_info(
            LogArea::Trigger,
            format!(
                "trigger poll deferred: wait_seconds={} suppression_reason={}",
                decision.wait_seconds,
                decision.suppression_reason.as_deref().unwrap_or("none")
            ),
        );
        return Ok(TriggerPollResult {
            did_evaluate: false,
            decision,
            run_result: None,
        });
    }
    log_info(LogArea::Trigger, "trigger poll evaluating");

    let run_result = run_trigger_engine_once(
        context_state,
        timeline_state,
        llm_state,
        ocr_state,
        capture_state,
        trigger_state,
        settings_state,
        keywords,
    )?;

    Ok(TriggerPollResult {
        did_evaluate: true,
        decision,
        run_result: Some(run_result),
    })
}

fn capture_trigger_ocr_observation(
    ocr_state: &State<'_, OcrState>,
    capture_state: &State<'_, ScreenCaptureState>,
    settings: &crate::settings::AppSettings,
    snapshot: &crate::macos_context::MacosContextSnapshot,
    privacy: &crate::privacy::PrivacyAssessment,
) -> Option<OcrObservation> {
    if privacy.should_suppress_capture || privacy.is_sensitive {
        log_info(LogArea::Ocr, "trigger OCR skipped: sensitive context");
        return None;
    }

    let permission = get_screen_capture_permission_status();
    let gate_input = capture_gate_input_for_command(
        10,
        false,
        permission.granted,
        settings.analysis_enabled,
        &snapshot.app_name,
    );
    let now_ms = current_time_ms();
    match capture_state.capture_and_recognize(ocr_state, gate_input, now_ms) {
        Ok(observation) => {
            log_info(
                LogArea::Ocr,
                format!(
                    "trigger OCR summary captured: classes={} confidence={:.2}",
                    observation.visible_text_classes.len(),
                    observation.confidence
                ),
            );
            Some(observation)
        }
        Err(error) => {
            log_warn(LogArea::Ocr, format!("trigger OCR skipped: {error}"));
            None
        }
    }
}

fn current_time_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
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
