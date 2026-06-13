use crate::{llama_sidecar::LlamaSidecarState, llm::LlmState};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::State;

#[derive(Debug)]
pub enum SettingsError {
    Io(std::io::Error),
    Json(serde_json::Error),
    Validation(String),
    State(String),
}

impl std::fmt::Display for SettingsError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "settings io error: {error}"),
            Self::Json(error) => write!(formatter, "settings json error: {error}"),
            Self::Validation(message) => write!(formatter, "settings validation error: {message}"),
            Self::State(message) => write!(formatter, "settings state error: {message}"),
        }
    }
}

impl std::error::Error for SettingsError {}

impl From<std::io::Error> for SettingsError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<serde_json::Error> for SettingsError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub talk_frequency: String,
    pub model_route: String,
    pub local_fallback_enabled: bool,
    pub nickname: String,
    pub night_care_enabled: bool,
    pub local_model_path: Option<String>,
    pub llama_server_binary_path: Option<String>,
    pub llama_server_host: String,
    pub llama_server_port: u16,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            talk_frequency: "balanced".to_string(),
            model_route: "api-first".to_string(),
            local_fallback_enabled: true,
            nickname: "작업자".to_string(),
            night_care_enabled: true,
            local_model_path: None,
            llama_server_binary_path: None,
            llama_server_host: "127.0.0.1".to_string(),
            llama_server_port: 8080,
        }
    }
}

impl AppSettings {
    pub fn validate(&self) -> Result<(), SettingsError> {
        match self.model_route.as_str() {
            "api-first" | "local-first" | "template" => {}
            other => Err(SettingsError::Validation(format!(
                "unsupported model route '{other}'"
            )))?,
        }

        match self.llama_server_host.as_str() {
            "127.0.0.1" | "localhost" => Ok(()),
            other => Err(SettingsError::Validation(format!(
                "llama server host must be localhost-only, got '{other}'"
            ))),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacySettingsWrapper {
    general: AppSettings,
}

pub struct SettingsStore {
    path: PathBuf,
}

impl SettingsStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn load(&self) -> Result<AppSettings, SettingsError> {
        if !self.path.exists() {
            return Ok(AppSettings::default());
        }

        let raw = fs::read_to_string(&self.path)?;
        let value: serde_json::Value = serde_json::from_str(&raw)?;
        if value.get("general").is_some() {
            let wrapper: LegacySettingsWrapper = serde_json::from_value(value)?;
            wrapper.general.validate()?;
            self.save(&wrapper.general)?;
            return Ok(wrapper.general);
        }

        let settings: AppSettings = serde_json::from_value(value)?;
        settings.validate()?;
        Ok(settings)
    }

    pub fn save(&self, settings: &AppSettings) -> Result<(), SettingsError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let raw = serde_json::to_string_pretty(settings)?;
        fs::write(&self.path, raw)?;
        Ok(())
    }
}

pub struct SettingsState {
    store: SettingsStore,
    settings: Mutex<AppSettings>,
}

impl SettingsState {
    pub fn open(path: PathBuf) -> Result<Self, SettingsError> {
        let store = SettingsStore::new(path);
        let settings = store.load()?;
        Ok(Self {
            store,
            settings: Mutex::new(settings),
        })
    }

    pub fn current(&self) -> Result<AppSettings, SettingsError> {
        let settings = self
            .settings
            .lock()
            .map_err(|_| SettingsError::State("settings lock was poisoned".to_string()))?;
        Ok(settings.clone())
    }

    pub fn update(&self, settings: AppSettings) -> Result<AppSettings, SettingsError> {
        settings.validate()?;
        self.store.save(&settings)?;
        let mut current = self
            .settings
            .lock()
            .map_err(|_| SettingsError::State("settings lock was poisoned".to_string()))?;
        *current = settings.clone();
        Ok(settings)
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<SettingsError> for CommandError {
    fn from(error: SettingsError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

#[tauri::command]
pub fn get_app_settings(state: State<'_, SettingsState>) -> Result<AppSettings, CommandError> {
    state.current().map_err(CommandError::from)
}

#[tauri::command]
pub fn update_app_settings(
    state: State<'_, SettingsState>,
    llm_state: State<'_, LlmState>,
    sidecar_state: State<'_, LlamaSidecarState>,
    settings: AppSettings,
) -> Result<AppSettings, CommandError> {
    settings.validate().map_err(CommandError::from)?;
    if settings.model_route == "local-first" {
        sidecar_state
            .validate_settings(&settings)
            .map_err(|error| CommandError {
                message: error.to_string(),
            })?;
    }
    let settings = state.update(settings).map_err(CommandError::from)?;
    let _ = sidecar_state.configure(&settings);
    if settings.model_route == "local-first" {
        if let Err(error) = sidecar_state.ensure_running() {
            let _ = sidecar_state.record_error(error);
        }
    } else {
        let _ = sidecar_state.stop();
    }
    llm_state
        .configure_local(
            llama_endpoint(&settings.llama_server_host, settings.llama_server_port),
            settings.local_model_path.clone(),
        )
        .map_err(|error| CommandError {
            message: error.to_string(),
        })?;
    llm_state
        .set_route(&settings.model_route, settings.local_fallback_enabled)
        .map_err(|error| CommandError {
            message: error.to_string(),
        })?;
    Ok(settings)
}

pub fn llama_endpoint(host: &str, port: u16) -> String {
    format!("http://{host}:{port}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_settings_path() -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is valid")
            .as_nanos();
        std::env::temp_dir().join(format!("amadeus-settings-test-{nonce}.json"))
    }

    #[test]
    fn default_settings_include_local_model_path() {
        let settings = AppSettings::default();

        assert_eq!(settings.model_route, "api-first");
        assert_eq!(settings.local_model_path, None);
        assert_eq!(settings.llama_server_binary_path, None);
        assert_eq!(settings.llama_server_host, "127.0.0.1");
        assert_eq!(settings.llama_server_port, 8080);
    }

    #[test]
    fn settings_store_loads_default_when_file_is_missing() {
        let path = temp_settings_path();
        let store = SettingsStore::new(path.clone());

        let settings = store.load().expect("default settings load");

        assert_eq!(settings, AppSettings::default());
        assert!(!path.exists());
    }

    #[test]
    fn settings_store_saves_and_loads_model_path() {
        let path = temp_settings_path();
        let store = SettingsStore::new(path.clone());
        let mut settings = AppSettings::default();
        settings.model_route = "local-first".to_string();
        settings.local_model_path = Some("/tmp/model.gguf".to_string());
        settings.llama_server_binary_path = Some("/tmp/llama-server".to_string());

        store.save(&settings).expect("settings save");
        let loaded = store.load().expect("settings reload");

        assert_eq!(loaded.model_route, "local-first");
        assert_eq!(loaded.local_model_path.as_deref(), Some("/tmp/model.gguf"));
        assert_eq!(
            loaded.llama_server_binary_path.as_deref(),
            Some("/tmp/llama-server")
        );

        let _ = fs::remove_file(path);
    }

    #[test]
    fn settings_store_migrates_legacy_general_wrapper() {
        let path = temp_settings_path();
        let settings = AppSettings {
            model_route: "local-first".to_string(),
            local_model_path: Some("/tmp/model.gguf".to_string()),
            ..AppSettings::default()
        };
        let legacy = serde_json::json!({ "general": settings });
        fs::write(
            &path,
            serde_json::to_string_pretty(&legacy).expect("legacy json"),
        )
        .expect("legacy settings written");
        let store = SettingsStore::new(path.clone());

        let loaded = store.load().expect("legacy settings load");
        let migrated: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).expect("settings file"))
                .expect("migrated json");

        assert_eq!(loaded.model_route, "local-first");
        assert!(migrated.get("general").is_none());
        assert_eq!(
            migrated.get("modelRoute").and_then(|value| value.as_str()),
            Some("local-first")
        );

        let _ = fs::remove_file(path);
    }

    #[test]
    fn builds_llama_endpoint_from_settings_host_and_port() {
        assert_eq!(llama_endpoint("127.0.0.1", 8080), "http://127.0.0.1:8080");
    }

    #[test]
    fn settings_store_rejects_invalid_model_route() {
        let path = temp_settings_path();
        let store = SettingsStore::new(path.clone());
        let state = SettingsState {
            store,
            settings: Mutex::new(AppSettings::default()),
        };
        let mut settings = AppSettings::default();
        settings.model_route = "invalid".to_string();

        assert!(state.update(settings).is_err());
        assert!(!path.exists());
    }

    #[test]
    fn settings_store_rejects_non_localhost_llama_host() {
        let path = temp_settings_path();
        let store = SettingsStore::new(path.clone());
        let state = SettingsState {
            store,
            settings: Mutex::new(AppSettings::default()),
        };
        let settings = AppSettings {
            llama_server_host: "0.0.0.0".to_string(),
            ..AppSettings::default()
        };

        assert!(state.update(settings).is_err());
        assert!(!path.exists());
    }

    #[test]
    fn settings_store_rejects_non_localhost_host_on_load() {
        let path = temp_settings_path();
        let settings = AppSettings {
            llama_server_host: "0.0.0.0".to_string(),
            ..AppSettings::default()
        };
        fs::write(
            &path,
            serde_json::to_string_pretty(&settings).expect("settings json"),
        )
        .expect("settings file written");
        let store = SettingsStore::new(path.clone());

        let result = store.load();

        assert!(result.is_err());
        let _ = fs::remove_file(path);
    }
}
