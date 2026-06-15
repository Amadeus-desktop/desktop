use std::{fs, path::Path};

use crate::settings::AppSettings;

use super::LlamaSidecarError;

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

        validate_binary_path(binary_path, allowed_binary_dir)?;
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
            binary_path: fs::canonicalize(binary_path)?.to_string_lossy().to_string(),
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

fn validate_binary_path(
    binary_path: &str,
    allowed_binary_dir: &Path,
) -> Result<(), LlamaSidecarError> {
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
    Ok(())
}
