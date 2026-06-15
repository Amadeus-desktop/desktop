use std::{
    error::Error,
    fmt::{Display, Formatter},
    time::SystemTimeError,
};

#[derive(Debug)]
pub enum TimelineError {
    Database(rusqlite::Error),
    Io(std::io::Error),
    Time(SystemTimeError),
    Validation(String),
    State(String),
}

impl Display for TimelineError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "database error: {error}"),
            Self::Io(error) => write!(formatter, "io error: {error}"),
            Self::Time(error) => write!(formatter, "time error: {error}"),
            Self::Validation(message) => write!(formatter, "validation error: {message}"),
            Self::State(message) => write!(formatter, "state error: {message}"),
        }
    }
}

impl Error for TimelineError {}

impl From<rusqlite::Error> for TimelineError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

impl From<std::io::Error> for TimelineError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<SystemTimeError> for TimelineError {
    fn from(error: SystemTimeError) -> Self {
        Self::Time(error)
    }
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<TimelineError> for CommandError {
    fn from(error: TimelineError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}
