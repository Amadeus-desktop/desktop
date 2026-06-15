use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use super::redaction::redact_log_value;

static LOG_FILE_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogLevel {
    Warn,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogArea {
    Window,
}

impl LogLevel {
    fn as_str(self) -> &'static str {
        match self {
            Self::Warn => "warn",
            Self::Error => "error",
        }
    }
}

impl LogArea {
    fn as_str(self) -> &'static str {
        match self {
            Self::Window => "window",
        }
    }
}

pub fn init(path: PathBuf) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    OpenOptions::new().create(true).append(true).open(&path)?;
    if let Ok(mut current) = LOG_FILE_PATH.lock() {
        *current = Some(path);
    }
    Ok(())
}

pub fn warn(area: LogArea, message: impl AsRef<str>) {
    log(LogLevel::Warn, area, message.as_ref());
}

pub fn error(area: LogArea, message: impl AsRef<str>) {
    log(LogLevel::Error, area, message.as_ref());
}

fn log(level: LogLevel, area: LogArea, message: &str) {
    let redacted_message = redact_log_value(message);
    eprintln!(
        "[amadeus][{}][{}] {}",
        level.as_str(),
        area.as_str(),
        redacted_message
    );

    if let Err(error) = append_file_log(level, area, &redacted_message) {
        eprintln!(
            "[amadeus][warn][observability] file log write failed: {}",
            redact_log_value(&error.to_string())
        );
    }
}

fn append_file_log(level: LogLevel, area: LogArea, message: &str) -> std::io::Result<()> {
    let Some(path) = LOG_FILE_PATH
        .lock()
        .ok()
        .and_then(|current| current.clone())
    else {
        return Ok(());
    };
    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    writeln!(
        file,
        "{{\"ts\":{},\"level\":\"{}\",\"area\":\"{}\",\"message\":\"{}\"}}",
        current_time_ms(),
        level.as_str(),
        area.as_str(),
        escape_json_string(message)
    )?;
    Ok(())
}

fn current_time_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn escape_json_string(value: &str) -> String {
    value
        .chars()
        .flat_map(|character| match character {
            '"' => "\\\"".chars().collect::<Vec<_>>(),
            '\\' => "\\\\".chars().collect::<Vec<_>>(),
            '\n' => "\\n".chars().collect::<Vec<_>>(),
            '\r' => "\\r".chars().collect::<Vec<_>>(),
            '\t' => "\\t".chars().collect::<Vec<_>>(),
            other => vec![other],
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_log_path() -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is valid")
            .as_nanos();
        std::env::temp_dir().join(format!("amadeus-log-test-{nonce}.log"))
    }

    #[test]
    fn writes_redacted_detail_to_log_file() {
        let path = temp_log_path();
        init(path.clone()).expect("logger initializes");

        error(
            LogArea::Window,
            "failed to open /Users/user/private/report.pdf?token=abc123",
        );

        let raw = fs::read_to_string(&path).expect("log file exists");
        assert!(raw.contains("\"level\":\"error\""));
        assert!(raw.contains("\"area\":\"window\""));
        assert!(raw.contains("[redacted-path]"));
        assert!(raw.contains("[redacted-secret]"));
        assert!(!raw.contains("/Users/user"));
        assert!(!raw.contains("token=abc123"));

        let _ = fs::remove_file(path);
    }
}
