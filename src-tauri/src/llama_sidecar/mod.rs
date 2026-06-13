use crate::settings::AppSettings;
use serde::Serialize;
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::State;

#[derive(Debug)]
pub enum LlamaSidecarError {
    Io(std::io::Error),
    NotConfigured(String),
    Readiness(String),
    State(String),
}

impl std::fmt::Display for LlamaSidecarError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "llama sidecar io error: {error}"),
            Self::NotConfigured(message) => {
                write!(formatter, "llama sidecar not configured: {message}")
            }
            Self::Readiness(message) => {
                write!(formatter, "llama sidecar readiness failed: {message}")
            }
            Self::State(message) => write!(formatter, "llama sidecar state error: {message}"),
        }
    }
}

impl std::error::Error for LlamaSidecarError {}

impl From<std::io::Error> for LlamaSidecarError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LlamaSidecarConfig {
    pub binary_path: String,
    pub model_path: String,
    pub host: String,
    pub port: u16,
}

impl LlamaSidecarConfig {
    pub fn from_settings(
        settings: &AppSettings,
        allowed_binary_dir: &Path,
    ) -> Result<Self, LlamaSidecarError> {
        let binary_path = settings
            .llama_server_binary_path
            .as_deref()
            .filter(|path| !path.trim().is_empty())
            .ok_or_else(|| {
                LlamaSidecarError::NotConfigured(
                    "llama server binary path is not configured".to_string(),
                )
            })?;
        let model_path = settings
            .local_model_path
            .as_deref()
            .filter(|path| !path.trim().is_empty())
            .ok_or_else(|| {
                LlamaSidecarError::NotConfigured("local model path is not configured".to_string())
            })?;

        if !Path::new(binary_path).is_file() {
            return Err(LlamaSidecarError::NotConfigured(format!(
                "llama server binary does not exist: {binary_path}"
            )));
        }
        fs::create_dir_all(allowed_binary_dir)?;
        let binary_path = fs::canonicalize(binary_path)?;
        let allowed_binary_dir = fs::canonicalize(allowed_binary_dir)?;
        if !binary_path.starts_with(&allowed_binary_dir) {
            return Err(LlamaSidecarError::NotConfigured(format!(
                "llama server binary must be inside {}",
                allowed_binary_dir.display()
            )));
        }
        if !Path::new(model_path).is_file() {
            return Err(LlamaSidecarError::NotConfigured(format!(
                "local model file does not exist: {model_path}"
            )));
        }

        Ok(Self {
            binary_path: binary_path.to_string_lossy().to_string(),
            model_path: model_path.to_string(),
            host: settings.llama_server_host.clone(),
            port: settings.llama_server_port,
        })
    }

    pub fn args(&self) -> Vec<String> {
        vec![
            "--model".to_string(),
            self.model_path.clone(),
            "--host".to_string(),
            self.host.clone(),
            "--port".to_string(),
            self.port.to_string(),
            "--ctx-size".to_string(),
            "2048".to_string(),
        ]
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlamaSidecarStatus {
    pub configured: bool,
    pub running: bool,
    pub detail: String,
}

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
            Ok(config) => {
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
            Err(error) => {
                let _ = self.stop();
                *self.config.lock().map_err(|_| {
                    LlamaSidecarError::State("sidecar config lock was poisoned".to_string())
                })? = None;
                *self.last_error.lock().map_err(|_| {
                    LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
                })? = Some(error.to_string());
                Err(error)
            }
        }
    }

    pub fn record_error(&self, error: impl ToString) -> Result<(), LlamaSidecarError> {
        *self.last_error.lock().map_err(|_| {
            LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
        })? = Some(error.to_string());
        Ok(())
    }

    pub fn ensure_running(&self) -> Result<(), LlamaSidecarError> {
        let config = self
            .config
            .lock()
            .map_err(|_| LlamaSidecarError::State("sidecar config lock was poisoned".to_string()))?
            .clone()
            .ok_or_else(|| {
                LlamaSidecarError::NotConfigured("sidecar config is not available".to_string())
            })?;
        let mut child = self
            .child
            .lock()
            .map_err(|_| LlamaSidecarError::State("sidecar child lock was poisoned".to_string()))?;

        if let Some(existing) = child.as_mut() {
            if existing.try_wait()?.is_none() {
                return Ok(());
            }
        }

        let mut spawned = Command::new(&config.binary_path)
            .args(config.args())
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| {
                let sidecar_error = LlamaSidecarError::Io(error);
                let _ = self.record_error(sidecar_error.to_string());
                sidecar_error
            })?;
        for _ in 0..40 {
            thread::sleep(Duration::from_millis(25));
            if let Some(status) = spawned.try_wait()? {
                let stderr = read_child_stderr(&mut spawned);
                let detail = if stderr.is_empty() {
                    format!("process exited before readiness with status {status}")
                } else {
                    stderr
                };
                let sidecar_error = LlamaSidecarError::Readiness(detail);
                let _ = self.record_error(sidecar_error.to_string());
                return Err(sidecar_error);
            }
        }
        *child = Some(spawned);
        *self.last_error.lock().map_err(|_| {
            LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
        })? = None;
        Ok(())
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
            .unwrap_or_else(|| {
                if running {
                    "llama sidecar is running".to_string()
                } else if configured {
                    "llama sidecar is configured".to_string()
                } else {
                    "llama sidecar is not configured".to_string()
                }
            });

        LlamaSidecarStatus {
            configured,
            running,
            detail,
        }
    }
}

fn read_child_stderr(child: &mut Child) -> String {
    let mut buffer = String::new();
    if let Some(stderr) = child.stderr.as_mut() {
        let _ = stderr.read_to_string(&mut buffer);
    }
    buffer.trim().to_string()
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<LlamaSidecarError> for CommandError {
    fn from(error: LlamaSidecarError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

#[tauri::command]
pub fn get_llama_sidecar_status(
    state: State<'_, LlamaSidecarState>,
) -> Result<LlamaSidecarStatus, CommandError> {
    Ok(state.status())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        os::unix::fs::PermissionsExt,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_file(name: &str) -> String {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is valid")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("amadeus-{name}-{nonce}"));
        fs::write(&path, b"test").expect("temp file is written");
        path.to_string_lossy().to_string()
    }

    fn temp_dir(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is valid")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("amadeus-{name}-{nonce}"));
        fs::create_dir_all(&path).expect("temp dir is created");
        path
    }

    fn executable_script(dir: &Path, name: &str, body: &str) -> String {
        let path = dir.join(name);
        fs::write(&path, body).expect("script is written");
        let mut permissions = fs::metadata(&path).expect("script metadata").permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&path, permissions).expect("script is executable");
        path.to_string_lossy().to_string()
    }

    #[test]
    fn sidecar_config_builds_llama_server_args() {
        let binary_dir = temp_dir("sidecars");
        let binary_path = binary_dir.join("llama-server");
        fs::write(&binary_path, b"test").expect("binary file is written");
        let binary_path = binary_path.to_string_lossy().to_string();
        let model_path = temp_file("model.gguf");
        let mut settings = AppSettings::default();
        settings.llama_server_binary_path = Some(binary_path.clone());
        settings.local_model_path = Some(model_path.clone());

        let config =
            LlamaSidecarConfig::from_settings(&settings, &binary_dir).expect("valid config");

        assert_eq!(
            config.binary_path,
            fs::canonicalize(&binary_path)
                .expect("binary path canonicalizes")
                .to_string_lossy()
                .to_string()
        );
        assert_eq!(
            config.args(),
            vec![
                "--model".to_string(),
                model_path.clone(),
                "--host".to_string(),
                "127.0.0.1".to_string(),
                "--port".to_string(),
                "8080".to_string(),
                "--ctx-size".to_string(),
                "2048".to_string(),
            ]
        );
        let _ = fs::remove_dir_all(binary_dir);
        let _ = fs::remove_file(model_path);
    }

    #[test]
    fn sidecar_config_requires_binary_and_model_paths() {
        let settings = AppSettings::default();
        let binary_dir = temp_dir("sidecars");

        assert!(LlamaSidecarConfig::from_settings(&settings, &binary_dir).is_err());
        let _ = fs::remove_dir_all(binary_dir);
    }

    #[test]
    fn sidecar_config_rejects_binary_outside_allowed_dir() {
        let binary_dir = temp_dir("sidecars");
        let binary_path = temp_file("outside-llama-server");
        let model_path = temp_file("model.gguf");
        let mut settings = AppSettings::default();
        settings.llama_server_binary_path = Some(binary_path.clone());
        settings.local_model_path = Some(model_path.clone());

        assert!(LlamaSidecarConfig::from_settings(&settings, &binary_dir).is_err());

        let _ = fs::remove_dir_all(binary_dir);
        let _ = fs::remove_file(binary_path);
        let _ = fs::remove_file(model_path);
    }

    #[test]
    fn sidecar_readiness_failure_records_stderr_status() {
        let binary_dir = temp_dir("sidecars");
        let binary_path = executable_script(
            &binary_dir,
            "llama-server",
            "#!/bin/sh\necho 'llama boot failed' >&2\nexit 42\n",
        );
        let model_path = temp_file("model.gguf");
        let mut settings = AppSettings::default();
        settings.llama_server_binary_path = Some(binary_path);
        settings.local_model_path = Some(model_path.clone());
        let state = LlamaSidecarState::new(binary_dir.clone());

        state.configure(&settings).expect("sidecar config is valid");
        let error = state
            .ensure_running()
            .expect_err("sidecar exits during readiness check");
        let status = state.status();

        assert!(error.to_string().contains("llama boot failed"));
        assert!(status.configured);
        assert!(!status.running);
        assert!(status.detail.contains("llama boot failed"));

        let _ = fs::remove_dir_all(binary_dir);
        let _ = fs::remove_file(model_path);
    }
}
