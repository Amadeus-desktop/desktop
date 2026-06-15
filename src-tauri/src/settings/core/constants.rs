use std::time::Duration;

pub const DEFAULT_LOCALE: &str = "ko";
pub const DEFAULT_COMPANION_PERSONA_ID: &str = "warm_friend";
pub const DEFAULT_TALK_FREQUENCY: &str = "balanced";
pub const DEFAULT_NICKNAME: &str = "작업자";
pub const DEFAULT_LLAMA_SERVER_HOST: &str = "127.0.0.1";
pub const DEFAULT_LLAMA_SERVER_PORT: u16 = 8080;

pub const LOCALE_KO: &str = "ko";
pub const LOCALE_EN: &str = "en";
pub const LOCALE_JA: &str = "ja";
pub const PERSONA_WARM_FRIEND: &str = "warm_friend";
pub const PERSONA_LOVING_PARTNER: &str = "loving_partner";
pub const PERSONA_FANTASY_GUARDIAN: &str = "fantasy_guardian";
pub const PERSONA_QUIET_COMPANION: &str = "quiet_companion";
pub const PERSONA_MINIMAL_USER: &str = "minimal_user";
pub const PERSONA_CUTE_CHARACTER: &str = "cute_character";
pub const PERSONA_NATURE_HEALING: &str = "nature_healing";
pub const LOCALHOST_IPV4: &str = "127.0.0.1";
pub const LOCALHOST_NAME: &str = "localhost";

pub const TALK_FREQUENCY_QUIET: &str = "quiet";
pub const TALK_FREQUENCY_ACTIVE: &str = "active";
pub const QUIET_COOLDOWN_MINUTES: i64 = 45;
pub const BALANCED_COOLDOWN_MINUTES: i64 = 30;
pub const ACTIVE_COOLDOWN_MINUTES: i64 = 15;
pub const QUIET_POLL_INTERVAL: Duration = Duration::from_secs(120);
pub const BALANCED_POLL_INTERVAL: Duration = Duration::from_secs(60);
pub const ACTIVE_POLL_INTERVAL: Duration = Duration::from_secs(30);
pub const QUIET_DAILY_UTTERANCE_LIMIT: i64 = 6;
pub const BALANCED_DAILY_UTTERANCE_LIMIT: i64 = 12;
pub const ACTIVE_DAILY_UTTERANCE_LIMIT: i64 = 18;
