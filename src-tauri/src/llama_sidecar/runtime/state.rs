use std::{path::PathBuf, process::Child, sync::Mutex};

use crate::settings::AppSettings;

use super::{
    process::spawn_and_wait_until_ready, LlamaSidecarConfig, LlamaSidecarError, LlamaSidecarStatus,
};

pub struct LlamaSidecarState {
    allowed_binary_dir: PathBuf,
    config: Mutex<Option<LlamaSidecarConfig>>,
    child: Mutex<Option<Child>>,
    last_error: Mutex<Option<String>>,
}

impl LlamaSidecarState {
    pub fn new(allowed_binary_dir: PathBuf) -> Self {
        Self {
            allowed_binary_dir,
            config: Mutex::new(None),
            child: Mutex::new(None),
            last_error: Mutex::new(None),
        }
    }

    pub fn configure(&self, settings: &AppSettings) -> Result<(), LlamaSidecarError> {
        match LlamaSidecarConfig::from_settings(settings, &self.allowed_binary_dir) {
            Ok(config) => self.apply_config(config),
            Err(error) => {
                self.record_error(error.to_string())?;
                Err(error)
            }
        }
    }

    pub fn validate_settings(&self, settings: &AppSettings) -> Result<(), LlamaSidecarError> {
        LlamaSidecarConfig::from_settings(settings, &self.allowed_binary_dir).map(|_| ())
    }

    pub fn record_error(&self, error: impl ToString) -> Result<(), LlamaSidecarError> {
        *self.last_error.lock().map_err(|_| {
            LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
        })? = Some(error.to_string());
        Ok(())
    }

    pub fn ensure_running(&self) -> Result<(), LlamaSidecarError> {
        let config = self.current_config()?;
        let mut child = self
            .child
            .lock()
            .map_err(|_| LlamaSidecarError::State("sidecar child lock was poisoned".to_string()))?;
        if let Some(existing) = child.as_mut() {
            if existing.try_wait()?.is_none() {
                return Ok(());
            }
        }

        match spawn_and_wait_until_ready(&config) {
            Ok(spawned) => {
                *child = Some(spawned);
                *self.last_error.lock().map_err(|_| {
                    LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
                })? = None;
                Ok(())
            }
            Err(error) => {
                let _ = self.record_error(error.to_string());
                Err(error)
            }
        }
    }

    pub fn stop(&self) -> Result<(), LlamaSidecarError> {
        let mut child = self
            .child
            .lock()
            .map_err(|_| LlamaSidecarError::State("sidecar child lock was poisoned".to_string()))?;
        if let Some(mut running) = child.take() {
            let _ = running.kill();
            let _ = running.wait();
        }
        Ok(())
    }

    pub fn status(&self) -> LlamaSidecarStatus {
        let configured = self
            .config
            .lock()
            .map(|config| config.is_some())
            .unwrap_or(false);
        let running = self
            .child
            .lock()
            .map(|mut child| {
                child
                    .as_mut()
                    .and_then(|process| process.try_wait().ok().map(|status| status.is_none()))
                    .unwrap_or(false)
            })
            .unwrap_or(false);
        let detail = self
            .last_error
            .lock()
            .ok()
            .and_then(|error| error.clone())
            .unwrap_or_else(|| status_detail(configured, running));
        LlamaSidecarStatus {
            configured,
            running,
            detail,
        }
    }

    fn apply_config(&self, config: LlamaSidecarConfig) -> Result<(), LlamaSidecarError> {
        let changed = {
            let current = self.config.lock().map_err(|_| {
                LlamaSidecarError::State("sidecar config lock was poisoned".to_string())
            })?;
            current.as_ref() != Some(&config)
        };
        if changed {
            self.stop()?;
        }
        *self.config.lock().map_err(|_| {
            LlamaSidecarError::State("sidecar config lock was poisoned".to_string())
        })? = Some(config);
        *self.last_error.lock().map_err(|_| {
            LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
        })? = None;
        Ok(())
    }

    fn current_config(&self) -> Result<LlamaSidecarConfig, LlamaSidecarError> {
        self.config
            .lock()
            .map_err(|_| LlamaSidecarError::State("sidecar config lock was poisoned".to_string()))?
            .clone()
            .ok_or_else(|| {
                LlamaSidecarError::NotConfigured("sidecar config is not available".to_string())
            })
    }
}

impl Drop for LlamaSidecarState {
    fn drop(&mut self) {
        if let Ok(mut child) = self.child.lock() {
            if let Some(mut running) = child.take() {
                let _ = running.kill();
                let _ = running.wait();
            }
        }
    }
}

fn status_detail(configured: bool, running: bool) -> String {
    if running {
        "llama sidecar is running".to_string()
    } else if configured {
        "llama sidecar is configured".to_string()
    } else {
        "llama sidecar is not configured".to_string()
    }
}
