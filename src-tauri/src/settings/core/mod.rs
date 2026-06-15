mod constants;
mod error;
mod model;
mod policy;
mod state;
mod store;

pub use model::AppSettings;
pub use policy::{
    llama_endpoint, privacy_keywords_for, talk_frequency_cooldown_minutes,
    talk_frequency_daily_utterance_limit, talk_frequency_poll_interval,
};
pub use state::SettingsState;

pub(crate) use error::{CommandError, SettingsError};
pub(crate) use store::SettingsStore;
