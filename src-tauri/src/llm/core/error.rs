use serde::Serialize;
use std::{
    error::Error,
    fmt::{Display, Formatter},
};

#[derive(Debug)]
pub enum LlmError {
    Unavailable(String),
    InvalidEndpoint(String),
    InvalidRoute(String),
    Io(std::io::Error),
    Protocol(String),
    Json(serde_json::Error),
    Http(Box<ureq::Error>),
    State(String),
}

impl Display for LlmError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unavailable(message) => write!(formatter, "llm unavailable: {message}"),
            Self::InvalidEndpoint(message) => write!(formatter, "invalid endpoint: {message}"),
            Self::InvalidRoute(message) => write!(formatter, "invalid route: {message}"),
            Self::Io(error) => write!(formatter, "llm io error: {error}"),
            Self::Protocol(message) => write!(formatter, "llm protocol error: {message}"),
            Self::Json(error) => write!(formatter, "llm json error: {error}"),
            Self::Http(error) => write!(formatter, "llm http error: {error}"),
            Self::State(message) => write!(formatter, "llm state error: {message}"),
        }
    }
}

impl Error for LlmError {}

impl From<std::io::Error> for LlmError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<serde_json::Error> for LlmError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

impl From<ureq::Error> for LlmError {
    fn from(error: ureq::Error) -> Self {
        Self::Http(Box::new(error))
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<LlmError> for CommandError {
    fn from(error: LlmError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}
