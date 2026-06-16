use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use crate::{
    macos_context::{AppCategory, MacosContextSnapshot},
    privacy::PrivacyAssessment,
};

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
    pub(crate) last_utterance_bundle_identifier: Option<String>,
    pub(crate) last_automatic_evaluation_at: Option<Instant>,
    pub(crate) work_session_started_at_ms: Option<u128>,
    pub(crate) utterances_today: i64,
    pub(crate) dismissed_recent_count: i64,
    pub(crate) process_history: ProcessHistoryWindow,
}

impl Default for TriggerRuntimeState {
    fn default() -> Self {
        Self {
            started_at: Instant::now(),
            last_utterance_at: None,
            last_utterance_bundle_identifier: None,
            last_automatic_evaluation_at: None,
            work_session_started_at_ms: None,
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
        let observed_at_ms = self.started_at.elapsed().as_millis();
        self.process_history
            .observe_snapshot_at(&snapshot, &privacy, observed_at_ms);
        let repeated_app_utterance_blocked = self.is_same_app_as_last_utterance(&snapshot);
        let work_session_duration_ms = self.update_work_session_duration(&snapshot, observed_at_ms);
        TriggerInput {
            snapshot,
            privacy,
            history: Some(self.process_history.clone()),
            recent_utterance_minutes_ago: self.recent_utterance_minutes_ago(),
            repeated_app_utterance_blocked,
            work_session_duration_ms,
            dismissed_recent_count: self.dismissed_recent_count,
            utterances_today: self.utterances_today,
        }
    }

    pub(crate) fn record_persisted_utterance(&mut self) {
        self.last_utterance_at = Some(Instant::now());
        self.utterances_today += 1;
    }

    pub(crate) fn record_persisted_utterance_for_snapshot(
        &mut self,
        snapshot: &MacosContextSnapshot,
    ) {
        self.record_persisted_utterance();
        self.last_utterance_bundle_identifier = Some(snapshot.bundle_identifier.clone());
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

    fn is_same_app_as_last_utterance(&self, snapshot: &MacosContextSnapshot) -> bool {
        self.last_utterance_bundle_identifier
            .as_deref()
            .is_some_and(|bundle_identifier| bundle_identifier == snapshot.bundle_identifier)
    }

    fn update_work_session_duration(
        &mut self,
        snapshot: &MacosContextSnapshot,
        observed_at_ms: u128,
    ) -> u128 {
        if snapshot.category != AppCategory::Work {
            self.work_session_started_at_ms = None;
            return 0;
        }

        let started_at_ms = *self
            .work_session_started_at_ms
            .get_or_insert_with(|| observed_at_ms.saturating_sub(snapshot.frontmost_duration_ms));

        observed_at_ms
            .saturating_sub(started_at_ms)
            .max(snapshot.frontmost_duration_ms)
    }
}

fn ready_poll() -> TriggerPollDecision {
    TriggerPollDecision {
        ready: true,
        wait_seconds: 0,
        suppression_reason: None,
    }
}
