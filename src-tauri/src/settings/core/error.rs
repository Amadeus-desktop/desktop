use serde::Serialize;

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl CommandError {
    pub fn from_message(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl From<SettingsError> for CommandError {
    fn from(error: SettingsError) -> Self {
        Self::from_message(error.to_string())
    }
}
