use serde::Deserialize;
use std::{
    fs,
    path::{Path, PathBuf},
};

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
        let value: serde_json::Value = match serde_json::from_str(&raw) {
            Ok(value) => value,
            Err(error) => {
                self.quarantine_invalid_settings()?;
                if error.is_eof() || error.is_syntax() {
                    return Ok(AppSettings::default());
                }
                return Err(SettingsError::Json(error));
            }
        };
        if value.get("general").is_some() {
            let mut settings = serde_json::from_value::<LegacySettingsWrapper>(value)?.general;
            settings.normalize_legacy_values();
            settings.validate()?;
            self.save(&settings)?;
            return Ok(settings);
        }

        let mut settings: AppSettings = serde_json::from_value(value)?;
        let migrated = settings.normalize_legacy_values();
        settings.validate()?;
        if migrated {
            self.save(&settings)?;
        }
        Ok(settings)
    }

    pub fn save(&self, settings: &AppSettings) -> Result<(), SettingsError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let raw = serde_json::to_string_pretty(settings)?;
        let temp_path = temporary_settings_path(&self.path);
        fs::write(&temp_path, raw)?;
        fs::rename(temp_path, &self.path)?;
        Ok(())
    }

    fn quarantine_invalid_settings(&self) -> Result<(), SettingsError> {
        let backup_path = self.path.with_extension("json.invalid");
        if backup_path.exists() {
            fs::remove_file(&backup_path)?;
        }
        fs::rename(&self.path, backup_path)?;
        Ok(())
    }
}

fn temporary_settings_path(path: &Path) -> PathBuf {
    let mut file_name = path
        .file_name()
        .map(|value| value.to_os_string())
        .unwrap_or_else(|| "settings".into());
    file_name.push(".tmp");
    path.with_file_name(file_name)
}
