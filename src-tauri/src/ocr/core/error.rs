#[derive(Debug)]
pub enum OcrError {
    Unsupported(String),
    Adapter(String),
    State(String),
}

impl std::fmt::Display for OcrError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unsupported(message) => write!(formatter, "ocr unsupported: {message}"),
            Self::Adapter(message) => write!(formatter, "ocr adapter error: {message}"),
            Self::State(message) => write!(formatter, "ocr state error: {message}"),
        }
    }
}

impl std::error::Error for OcrError {}
