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
        if !matches!(
            settings.llama_server_host.as_str(),
            "127.0.0.1" | "localhost"
        ) {
            return Err(LlamaSidecarError::NotConfigured(format!(
                "llama server host must be localhost-only, got '{}'",
                settings.llama_server_host
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
                *self.last_error.lock().map_err(|_| {
                    LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
                })? = Some(error.to_string());
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
        let mut readiness_error = None;
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
            match probe_llama_readiness(&config) {
                Ok(()) => {
                    drain_child_stderr(&mut spawned);
                    *child = Some(spawned);
                    *self.last_error.lock().map_err(|_| {
                        LlamaSidecarError::State("sidecar error lock was poisoned".to_string())
                    })? = None;
                    return Ok(());
                }
                Err(error) => readiness_error = Some(error),
            }
        }
        let _ = spawned.kill();
        let _ = spawned.wait();
        let stderr = read_child_stderr(&mut spawned);
        let detail = if stderr.is_empty() {
            readiness_error.unwrap_or_else(|| "readiness probe timed out".to_string())
        } else {
            stderr
        };
        let sidecar_error = LlamaSidecarError::Readiness(detail);
        let _ = self.record_error(sidecar_error.to_string());
        Err(sidecar_error)
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

fn drain_child_stderr(child: &mut Child) {
    if let Some(mut stderr) = child.stderr.take() {
        thread::spawn(move || {
            let mut buffer = [0_u8; 4096];
            while stderr.read(&mut buffer).is_ok_and(|read| read > 0) {}
        });
    }
}

fn probe_llama_readiness(config: &LlamaSidecarConfig) -> Result<(), String> {
    let url = format!("http://{}:{}/completion", config.host, config.port);
    ureq::post(&url)
        .timeout(Duration::from_millis(250))
        .send_json(serde_json::json!({
            "prompt": "health",
            "n_predict": 1,
            "temperature": 0.0,
            "stop": ["\n"],
        }))
        .map(|_| ())
        .map_err(|error| error.to_string())
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
mod tests;
