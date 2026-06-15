use tauri::State;

use crate::{
    llm::LlmState,
    macos_context::{read_current_snapshot, ContextBridgeState, MacosContextSnapshot},
    privacy::{assess_privacy, get_screen_capture_permission_status, PrivacyAssessment},
    settings::{privacy_keywords_for, talk_frequency_poll_interval, AppSettings, SettingsState},
    timeline::{
        ContextEvent, CreateContextEventInput, CreateUtteranceEventInput, TimelineState,
        UtteranceEvent,
    },
};

use super::{
    error::CommandError,
    evaluate_trigger,
    scoring::{llm_gate_for_trigger, llm_request_for_trigger, suppressed},
    TriggerEngineState, TriggerEvaluation, TriggerPollDecision, TriggerPollResult,
    TriggerRunResult, TriggerRuntimeSnapshot,
};

#[tauri::command]
pub fn run_trigger_engine_once(
    context_state: State<'_, ContextBridgeState>,
    timeline_state: State<'_, TimelineState>,
    llm_state: State<'_, LlmState>,
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

    if !settings.proactive_trigger_enabled {
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
    let evaluation = evaluate_trigger(trigger_input, &settings);
    let (context_event, utterance_event) = if evaluation.should_persist {
        persist_trigger_events(
            &timeline_state,
            &llm_state,
            &settings,
            &snapshot,
            &privacy,
            &evaluation,
        )?
    } else {
        (None, None)
    };

    if utterance_event.is_some() {
        trigger_state
            .runtime
            .lock()
            .map_err(|_| CommandError::from("trigger runtime lock was poisoned".to_string()))?
            .record_persisted_utterance();
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
    trigger_state: State<'_, TriggerEngineState>,
    settings_state: State<'_, SettingsState>,
    keywords: Vec<String>,
) -> Result<TriggerPollResult, CommandError> {
    let settings = settings_state
        .current()
        .map_err(|error| CommandError::from(error.to_string()))?;

    if !settings.proactive_trigger_enabled {
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
        return Ok(TriggerPollResult {
            did_evaluate: false,
            decision,
            run_result: None,
        });
    }

    let run_result = run_trigger_engine_once(
        context_state,
        timeline_state,
        llm_state,
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

fn persist_trigger_events(
    timeline_state: &State<'_, TimelineState>,
    llm_state: &State<'_, LlmState>,
    settings: &AppSettings,
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
) -> Result<(Option<ContextEvent>, Option<UtteranceEvent>), CommandError> {
    let candidate = evaluation
        .candidate
        .as_ref()
        .ok_or_else(|| CommandError::from("trigger evaluation has no candidate".to_string()))?;
    let metadata_json = trigger_context_metadata_json(snapshot, privacy, evaluation);
    let mut repository = timeline_state
        .repository()
        .lock()
        .map_err(|_| CommandError::from("timeline repository lock was poisoned".to_string()))?;
    let context_event = repository
        .create_context_event(CreateContextEventInput {
            app_name: snapshot.app_name.clone(),
            window_title: privacy.redacted_window_title.clone(),
            event_type: "trigger_context_snapshot".to_string(),
            metadata_json,
        })
        .map_err(|error| CommandError::from(error.to_string()))?;
    let llm_gate = llm_gate_for_trigger(snapshot, privacy, evaluation, candidate);
    if !llm_gate.allowed {
        return Ok((Some(context_event), None));
    }

    let generation = llm_state
        .generate_utterance(&llm_request_for_trigger(
            snapshot, privacy, evaluation, candidate, settings,
        ))
        .map_err(|error| CommandError::from(error.to_string()))?;
    let utterance_event = repository
        .create_utterance_event(CreateUtteranceEventInput {
            trigger_type: candidate.trigger_type.as_str().to_string(),
            speakability_score: evaluation.speakability_score,
            message: generation.message,
            provider: generation.provider,
            context_event_id: Some(context_event.id.clone()),
        })
        .map_err(|error| CommandError::from(error.to_string()))?;

    Ok((Some(context_event), Some(utterance_event)))
}

fn trigger_context_metadata_json(
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
) -> String {
    serde_json::json!({
        "bundleIdentifier": &snapshot.bundle_identifier,
        "processId": snapshot.process_id,
        "idleSeconds": snapshot.idle_seconds,
        "category": snapshot.category,
        "frontmostDurationMs": snapshot.frontmost_duration_ms,
        "privacy": {
            "isSensitive": privacy.is_sensitive,
            "reason": privacy.reason,
            "matchedKeyword": &privacy.matched_keyword,
            "shouldSuppressCapture": privacy.should_suppress_capture,
            "shouldSuppressUtterance": privacy.should_suppress_utterance,
        },
        "screenCapturePermission": get_screen_capture_permission_status(),
        "trigger": {
            "candidate": &evaluation.candidate,
            "speakabilityScore": evaluation.speakability_score,
            "action": evaluation.action,
        },
    })
    .to_string()
}
