use crate::observability::{error as log_error, info as log_info, LogArea};

#[tauri::command]
pub fn record_frontend_log(level: String, area: String, message: String, context: Option<String>) {
    let area = frontend_log_area(&area);
    let message = match context {
        Some(context) if !context.is_empty() && context != "{}" => {
            format!("frontend: {message} context={context}")
        }
        _ => format!("frontend: {message}"),
    };

    match level.as_str() {
        "error" => log_error(area, message),
        "warn" => crate::observability::warn(area, message),
        _ => log_info(area, message),
    }
}

fn frontend_log_area(area: &str) -> LogArea {
    match area {
        "auth" => LogArea::Auth,
        "context" => LogArea::Context,
        "settings" => LogArea::Settings,
        "startup" => LogArea::Startup,
        "trigger" => LogArea::Trigger,
        "ui" => LogArea::Ui,
        "window" => LogArea::Window,
        _ => LogArea::Ui,
    }
}
