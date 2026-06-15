use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use crate::{macos_context::MacosContextSnapshot, privacy::PrivacyAssessment};

use super::{
    history::ProcessHistoryWindow, TriggerInput, TriggerPollDecision, TriggerRuntimeSnapshot,
};

#[derive(Default)]
pub struct TriggerEngineState {
    pub(crate) runtime: Mutex<TriggerRuntimeState>,
}

impl TriggerEngineState {
    pub fn new() -> Self {
        Self::default()
    }
}

pub(crate) struct TriggerRuntimeState {
    pub(crate) started_at: Instant,
    pub(crate) last_utterance_at: Option<Instant>,
    pub(crate) last_automatic_evaluation_at: Option<Instant>,
    pub(crate) utterances_today: i64,
    pub(crate) dismissed_recent_count: i64,
    pub(crate) process_history: ProcessHistoryWindow,
}

impl Default for TriggerRuntimeState {
    fn default() -> Self {
        Self {
            started_at: Instant::now(),
            last_utterance_at: None,
            last_automatic_evaluation_at: None,
            utterances_today: 0,
            dismissed_recent_count: 0,
            process_history: ProcessHistoryWindow::default(),
        }
    }
}

impl TriggerRuntimeState {
    pub(crate) fn input_for(
        &mut self,
        snapshot: MacosContextSnapshot,
        privacy: PrivacyAssessment,
    ) -> TriggerInput {
        self.process_history.observe_snapshot_at(
            &snapshot,
            &privacy,
            self.started_at.elapsed().as_millis(),
        );
        TriggerInput {
            snapshot,
            privacy,
            history: Some(self.process_history.clone()),
            recent_utterance_minutes_ago: self.recent_utterance_minutes_ago(),
            dismissed_recent_count: self.dismissed_recent_count,
            utterances_today: self.utterances_today,
        }
    }

    pub(crate) fn record_persisted_utterance(&mut self) {
        self.last_utterance_at = Some(Instant::now());
        self.utterances_today += 1;
    }

    pub(crate) fn automatic_poll_decision(
        &self,
        minimum_interval: Duration,
    ) -> TriggerPollDecision {
        let Some(last_evaluation_at) = self.last_automatic_evaluation_at else {
            return ready_poll();
        };
        let elapsed = last_evaluation_at.elapsed();
        if elapsed >= minimum_interval {
            return ready_poll();
        }
        TriggerPollDecision {
            ready: false,
            wait_seconds: (minimum_interval - elapsed).as_secs().max(1) as i64,
            suppression_reason: Some("poll_cadence".to_string()),
        }
    }

    pub(crate) fn record_automatic_evaluation(&mut self) {
        self.last_automatic_evaluation_at = Some(Instant::now());
    }

    pub(crate) fn record_reaction(&mut self, reaction_type: &str) {
        match reaction_type {
            "dismissed" | "closed" | "ignored" => {
                self.dismissed_recent_count = (self.dismissed_recent_count + 1).min(5);
            }
            "opened" | "replied" => {
                self.dismissed_recent_count = 0;
            }
            _ => {}
        }
    }

    pub(crate) fn snapshot(&self) -> TriggerRuntimeSnapshot {
        TriggerRuntimeSnapshot {
            recent_utterance_minutes_ago: self.recent_utterance_minutes_ago(),
            dismissed_recent_count: self.dismissed_recent_count,
            utterances_today: self.utterances_today,
        }
    }

    fn recent_utterance_minutes_ago(&self) -> Option<i64> {
        self.last_utterance_at
            .map(|instant| (instant.elapsed().as_secs() / 60) as i64)
    }
}

fn ready_poll() -> TriggerPollDecision {
    TriggerPollDecision {
        ready: true,
        wait_seconds: 0,
        suppression_reason: None,
    }
}
