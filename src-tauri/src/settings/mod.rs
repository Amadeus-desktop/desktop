mod commands;
mod core;

pub use commands::{get_app_settings, update_app_settings};
pub use core::{
    llama_endpoint, privacy_keywords_for, talk_frequency_cooldown_minutes,
    talk_frequency_daily_utterance_limit, talk_frequency_poll_interval,
    talk_frequency_trigger_sensitivity, AppSettings, SettingsState, TriggerSensitivityPolicy,
};

pub(crate) use core::CommandError;

#[cfg(test)]
pub(crate) use core::SettingsStore;

#[cfg(test)]
mod tests;
