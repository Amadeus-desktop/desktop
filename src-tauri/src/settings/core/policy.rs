use std::time::Duration;

use super::{
    constants::{
        ACTIVE_COOLDOWN_MINUTES, ACTIVE_DAILY_UTTERANCE_LIMIT, ACTIVE_POLL_INTERVAL,
        BALANCED_COOLDOWN_MINUTES, BALANCED_DAILY_UTTERANCE_LIMIT, BALANCED_POLL_INTERVAL,
        QUIET_COOLDOWN_MINUTES, QUIET_DAILY_UTTERANCE_LIMIT, QUIET_POLL_INTERVAL,
        TALK_FREQUENCY_ACTIVE, TALK_FREQUENCY_QUIET,
    },
    AppSettings,
};

pub fn llama_endpoint(host: &str, port: u16) -> String {
    format!("http://{host}:{port}")
}

pub fn talk_frequency_cooldown_minutes(talk_frequency: &str) -> i64 {
    match talk_frequency {
        TALK_FREQUENCY_QUIET => QUIET_COOLDOWN_MINUTES,
        TALK_FREQUENCY_ACTIVE => ACTIVE_COOLDOWN_MINUTES,
        _ => BALANCED_COOLDOWN_MINUTES,
    }
}

pub fn talk_frequency_poll_interval(talk_frequency: &str) -> Duration {
    match talk_frequency {
        TALK_FREQUENCY_QUIET => QUIET_POLL_INTERVAL,
        TALK_FREQUENCY_ACTIVE => ACTIVE_POLL_INTERVAL,
        _ => BALANCED_POLL_INTERVAL,
    }
}

pub fn talk_frequency_daily_utterance_limit(talk_frequency: &str) -> i64 {
    match talk_frequency {
        TALK_FREQUENCY_QUIET => QUIET_DAILY_UTTERANCE_LIMIT,
        TALK_FREQUENCY_ACTIVE => ACTIVE_DAILY_UTTERANCE_LIMIT,
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
