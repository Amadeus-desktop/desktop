use std::time::Duration;

use super::{
    constants::{
        ACTIVE_COOLDOWN_MINUTES, ACTIVE_DAILY_UTTERANCE_LIMIT, ACTIVE_POLL_INTERVAL,
        BALANCED_COOLDOWN_MINUTES, BALANCED_DAILY_UTTERANCE_LIMIT, BALANCED_POLL_INTERVAL,
        QUIET_COOLDOWN_MINUTES, QUIET_DAILY_UTTERANCE_LIMIT, QUIET_POLL_INTERVAL,
        TALK_FREQUENCY_ACTIVE, TALK_FREQUENCY_QUIET, TALK_FREQUENCY_TEST, TEST_COOLDOWN_MINUTES,
        TEST_DAILY_UTTERANCE_LIMIT, TEST_POLL_INTERVAL,
    },
    AppSettings,
};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TriggerSensitivityPolicy {
    pub deep_pause_min_frontmost: u128,
    pub deep_pause_min_idle_seconds: f64,
    pub milestone_min_frontmost: u128,
    pub unknown_ocr_probe_min_frontmost: u128,
    pub drift_min_frontmost: u128,
}

const MINUTE_MS: u128 = 60 * 1000;

pub fn llama_endpoint(host: &str, port: u16) -> String {
    format!("http://{host}:{port}")
}

pub fn talk_frequency_cooldown_minutes(talk_frequency: &str) -> i64 {
    match talk_frequency {
        TALK_FREQUENCY_QUIET => QUIET_COOLDOWN_MINUTES,
        TALK_FREQUENCY_ACTIVE => ACTIVE_COOLDOWN_MINUTES,
        TALK_FREQUENCY_TEST => TEST_COOLDOWN_MINUTES,
        _ => BALANCED_COOLDOWN_MINUTES,
    }
}

pub fn talk_frequency_poll_interval(talk_frequency: &str) -> Duration {
    match talk_frequency {
        TALK_FREQUENCY_QUIET => QUIET_POLL_INTERVAL,
        TALK_FREQUENCY_ACTIVE => ACTIVE_POLL_INTERVAL,
        TALK_FREQUENCY_TEST => TEST_POLL_INTERVAL,
        _ => BALANCED_POLL_INTERVAL,
    }
}

pub fn talk_frequency_trigger_sensitivity(talk_frequency: &str) -> TriggerSensitivityPolicy {
    match talk_frequency {
        TALK_FREQUENCY_QUIET => TriggerSensitivityPolicy {
            deep_pause_min_frontmost: 10 * MINUTE_MS,
            deep_pause_min_idle_seconds: 120.0,
            milestone_min_frontmost: 60 * MINUTE_MS,
            unknown_ocr_probe_min_frontmost: 10 * MINUTE_MS,
            drift_min_frontmost: 10 * MINUTE_MS,
        },
        TALK_FREQUENCY_ACTIVE => TriggerSensitivityPolicy {
            deep_pause_min_frontmost: MINUTE_MS,
            deep_pause_min_idle_seconds: 15.0,
            milestone_min_frontmost: 3 * MINUTE_MS,
            unknown_ocr_probe_min_frontmost: 5_000,
            drift_min_frontmost: MINUTE_MS,
        },
        TALK_FREQUENCY_TEST => TriggerSensitivityPolicy {
            deep_pause_min_frontmost: 2_000,
            deep_pause_min_idle_seconds: 1.0,
            milestone_min_frontmost: 5_000,
            unknown_ocr_probe_min_frontmost: 1_000,
            drift_min_frontmost: 5_000,
        },
        _ => TriggerSensitivityPolicy {
            deep_pause_min_frontmost: 5 * MINUTE_MS,
            deep_pause_min_idle_seconds: 60.0,
            milestone_min_frontmost: 20 * MINUTE_MS,
            unknown_ocr_probe_min_frontmost: 30_000,
            drift_min_frontmost: 10 * MINUTE_MS,
        },
    }
}

pub fn talk_frequency_daily_utterance_limit(talk_frequency: &str) -> i64 {
    match talk_frequency {
        TALK_FREQUENCY_QUIET => QUIET_DAILY_UTTERANCE_LIMIT,
        TALK_FREQUENCY_ACTIVE => ACTIVE_DAILY_UTTERANCE_LIMIT,
        TALK_FREQUENCY_TEST => TEST_DAILY_UTTERANCE_LIMIT,
        _ => BALANCED_DAILY_UTTERANCE_LIMIT,
    }
}

pub fn privacy_keywords_for(settings: &AppSettings) -> Vec<String> {
    if settings.privacy_filter_enabled {
        settings.custom_privacy_keywords.clone()
    } else {
        Vec::new()
    }
}
