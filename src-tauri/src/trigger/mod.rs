mod commands;
mod core;

pub use commands::{
    poll_trigger_engine, record_trigger_reaction_for_scoring, run_trigger_engine_once,
};
pub use core::{
    TriggerEngineState, TriggerEvaluation, TriggerPollDecision, TriggerPollResult,
    TriggerRunResult, TriggerRuntimeSnapshot,
};

#[cfg(test)]
pub(crate) use core::{action_for_score, llm_gate_for_trigger, llm_request_for_trigger};
pub(crate) use core::{error, scoring};
#[cfg(test)]
pub(crate) use core::{
    evaluate_trigger, ProcessHistoryWindow, TriggerAction, TriggerCandidate, TriggerInput,
    TriggerRuntimeState, TriggerType,
};
#[cfg(test)]
pub(crate) use std::time::Instant;

#[cfg(test)]
mod tests;
