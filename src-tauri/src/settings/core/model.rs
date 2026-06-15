use serde::{Deserialize, Serialize};

use super::{
    constants::{
        ACCENT_LAVENDER, ACCENT_MINT, ACCENT_PEACH, ACCENT_ROSE, ACCENT_SKY, APPEARANCE_DARK,
        APPEARANCE_LIGHT, APPEARANCE_SYSTEM, DEFAULT_ACCENT_COLOR, DEFAULT_APPEARANCE,
        DEFAULT_CHARACTER_ID, DEFAULT_COMPANION_PERSONA_ID, DEFAULT_LLAMA_SERVER_HOST,
        DEFAULT_LLAMA_SERVER_PORT, DEFAULT_LOCALE, DEFAULT_NICKNAME, DEFAULT_TALK_FREQUENCY,
        LOCALE_EN, LOCALE_JA, LOCALE_KO, LOCALHOST_IPV4, LOCALHOST_NAME, PERSONA_LOVING_PARTNER,
        PERSONA_SOFT_CARE, PERSONA_STEADY_ALLY, PERSONA_WARM_FRIEND,
    },
    SettingsError,
};

use crate::shared::constants::{
    MODEL_ROUTE_API_FIRST, MODEL_ROUTE_LOCAL_FIRST, MODEL_ROUTE_TEMPLATE,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub locale: String,
    pub appearance: String,
    pub accent_color: String,
    pub character_id: String,
    pub companion_persona_id: String,
    pub talk_frequency: String,
    pub model_route: String,
    pub local_fallback_enabled: bool,
    pub nickname: String,
    pub night_care_enabled: bool,
    pub analysis_enabled: bool,
    pub proactive_trigger_enabled: bool,
    pub privacy_filter_enabled: bool,
    pub custom_privacy_keywords: Vec<String>,
    pub local_model_path: Option<String>,
    pub llama_server_binary_path: Option<String>,
    pub llama_server_host: String,
    pub llama_server_port: u16,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            locale: DEFAULT_LOCALE.to_string(),
            appearance: DEFAULT_APPEARANCE.to_string(),
            accent_color: DEFAULT_ACCENT_COLOR.to_string(),
            character_id: DEFAULT_CHARACTER_ID.to_string(),
            companion_persona_id: DEFAULT_COMPANION_PERSONA_ID.to_string(),
            talk_frequency: DEFAULT_TALK_FREQUENCY.to_string(),
            model_route: MODEL_ROUTE_API_FIRST.to_string(),
            local_fallback_enabled: true,
            nickname: DEFAULT_NICKNAME.to_string(),
            night_care_enabled: true,
            analysis_enabled: true,
            proactive_trigger_enabled: true,
            privacy_filter_enabled: true,
            custom_privacy_keywords: Vec::new(),
            local_model_path: None,
            llama_server_binary_path: None,
            llama_server_host: DEFAULT_LLAMA_SERVER_HOST.to_string(),
            llama_server_port: DEFAULT_LLAMA_SERVER_PORT,
        }
    }
}

impl AppSettings {
    pub fn normalize_legacy_values(&mut self) -> bool {
        let normalized_persona = match self.companion_persona_id.as_str() {
            "fantasy_guardian" => Some(PERSONA_STEADY_ALLY),
            "quiet_companion" | "cute_character" | "nature_healing" => Some(PERSONA_SOFT_CARE),
            "minimal_user" => Some(PERSONA_WARM_FRIEND),
            _ => None,
        };
        if let Some(persona_id) = normalized_persona {
            self.companion_persona_id = persona_id.to_string();
            true
        } else {
            false
        }
    }

    pub fn validate(&self) -> Result<(), SettingsError> {
        match self.locale.as_str() {
            LOCALE_KO | LOCALE_EN | LOCALE_JA => {}
            other => Err(SettingsError::Validation(format!(
                "unsupported locale '{other}'"
            )))?,
        }
        match self.character_id.as_str() {
            "ruda" | "emilia" | "daon" => {}
            other => Err(SettingsError::Validation(format!(
                "unsupported character '{other}'"
            )))?,
        }
        match self.companion_persona_id.as_str() {
            PERSONA_WARM_FRIEND
            | PERSONA_LOVING_PARTNER
            | PERSONA_STEADY_ALLY
            | PERSONA_SOFT_CARE => {}
            other => Err(SettingsError::Validation(format!(
                "unsupported companion persona '{other}'"
            )))?,
        }
        match self.appearance.as_str() {
            APPEARANCE_DARK | APPEARANCE_LIGHT | APPEARANCE_SYSTEM => {}
            other => Err(SettingsError::Validation(format!(
                "unsupported appearance '{other}'"
            )))?,
        }
        match self.accent_color.as_str() {
            ACCENT_ROSE | ACCENT_LAVENDER | ACCENT_SKY | ACCENT_MINT | ACCENT_PEACH => {}
            other => Err(SettingsError::Validation(format!(
                "unsupported accent color '{other}'"
            )))?,
        }
        match self.model_route.as_str() {
            MODEL_ROUTE_API_FIRST | MODEL_ROUTE_LOCAL_FIRST | MODEL_ROUTE_TEMPLATE => {}
            other => Err(SettingsError::Validation(format!(
                "unsupported model route '{other}'"
            )))?,
        }
        match self.llama_server_host.as_str() {
            LOCALHOST_IPV4 | LOCALHOST_NAME => Ok(()),
            other => Err(SettingsError::Validation(format!(
                "llama server host must be localhost-only, got '{other}'"
            ))),
        }
    }
}
