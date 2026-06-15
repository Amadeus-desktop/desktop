use serde::Serialize;
use std::{
    error::Error,
    fmt::{Display, Formatter},
};

#[derive(Debug)]
pub enum MacosContextError {
    #[cfg(not(target_os = "macos"))]
    UnsupportedPlatform,
    Native(String),
    State(String),
}

impl Display for MacosContextError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            #[cfg(not(target_os = "macos"))]
            Self::UnsupportedPlatform => write!(formatter, "macOS context bridge is unsupported"),
            Self::Native(message) => write!(formatter, "native context error: {message}"),
            Self::State(message) => write!(formatter, "state error: {message}"),
        }
    }
}

impl Error for MacosContextError {}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<MacosContextError> for CommandError {
    fn from(error: MacosContextError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}
