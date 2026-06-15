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

#[derive(Debug, serde::Serialize)]
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
