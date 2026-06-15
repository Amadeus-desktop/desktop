use std::{path::PathBuf, sync::Mutex};

use super::{AppSettings, SettingsError, SettingsStore};

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

#[cfg(test)]
impl SettingsState {
    pub fn new_for_test(store: SettingsStore, settings: AppSettings) -> Self {
        Self {
            store,
            settings: Mutex::new(settings),
        }
    }
}
