use tauri::State;

use crate::{
    llm::LlmState,
    macos_context::{read_current_snapshot, ContextBridgeState},
    privacy::assess_privacy,
    settings::{privacy_keywords_for, talk_frequency_poll_interval, SettingsState},
    timeline::TimelineState,
};

use super::{persistence::persist_trigger_events, CommandError};
use crate::trigger::{
    evaluate_trigger, scoring::suppressed, TriggerEngineState, TriggerPollDecision,
    TriggerPollResult, TriggerRunResult, TriggerRuntimeSnapshot,
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
