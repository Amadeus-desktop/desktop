use tauri::State;

use crate::{
    llm::LlmState,
    macos_context::MacosContextSnapshot,
    privacy::PrivacyAssessment,
    settings::AppSettings,
    timeline::{
        ContextEvent, CreateContextEventInput, CreateUtteranceEventInput, TimelineState,
        UtteranceEvent,
    },
};

use super::{metadata::trigger_context_metadata_json, CommandError};
use crate::trigger::{
    scoring::{llm_gate_for_trigger, llm_request_for_trigger},
    TriggerEvaluation,
};

pub(super) fn persist_trigger_events(
    timeline_state: &State<'_, TimelineState>,
    llm_state: &State<'_, LlmState>,
    settings: &AppSettings,
    snapshot: &MacosContextSnapshot,
    privacy: &PrivacyAssessment,
    evaluation: &TriggerEvaluation,
    redacted_ocr_summary: Option<&str>,
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
            snapshot,
            privacy,
            evaluation,
            candidate,
            settings,
            redacted_ocr_summary,
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
