use serde::Deserialize;
use std::{fs, path::PathBuf};

use super::{AppSettings, SettingsError};

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
