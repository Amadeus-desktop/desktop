mod engine;
pub(crate) mod error;
mod history;
mod runtime;
pub(crate) mod scoring;
mod types;

pub use engine::evaluate_trigger;
pub use history::ProcessHistoryWindow;
pub use runtime::TriggerEngineState;
pub use types::{
    TriggerAction, TriggerCandidate, TriggerEvaluation, TriggerInput, TriggerPollDecision,
    TriggerPollResult, TriggerRunResult, TriggerRuntimeSnapshot, TriggerType,
};

#[cfg(test)]
pub(crate) use runtime::TriggerRuntimeState;
#[cfg(test)]
pub(crate) use scoring::{action_for_score, llm_gate_for_trigger, llm_request_for_trigger};
