use std::sync::atomic::{AtomicBool, Ordering};

use crate::observability::{info as log_info, warn as log_warn, LogArea};

#[derive(Default)]
pub struct FrontendLifecycleState {
    main_first_paint_seen: AtomicBool,
    companion_first_paint_seen: AtomicBool,
}

#[tauri::command]
pub fn record_frontend_ready(
    state: tauri::State<FrontendLifecycleState>,
    window_label: String,
    event: String,
    occurred_at_ms: Option<u64>,
) -> Result<(), String> {
    let lifecycle_event = parse_frontend_lifecycle_event(&window_label, &event)?;
    let was_duplicate = match lifecycle_event {
        FrontendLifecycleEvent::MainWindowFirstPaint => {
            state.main_first_paint_seen.swap(true, Ordering::SeqCst)
        }
        FrontendLifecycleEvent::CompanionWindowFirstPaint => state
            .companion_first_paint_seen
            .swap(true, Ordering::SeqCst),
    };

    if was_duplicate {
        log_warn(
            LogArea::Startup,
            format!(
                "frontend lifecycle event duplicate ignored: window={} event={}",
                window_label, event
            ),
        );
        return Ok(());
    }

    log_info(
        LogArea::Startup,
        format!(
            "frontend lifecycle event recorded: window={} event={} occurred_at_ms={}",
            window_label,
            event,
            occurred_at_ms
                .map(|value| value.to_string())
                .unwrap_or_else(|| "unknown".to_string())
        ),
    );
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FrontendLifecycleEvent {
    MainWindowFirstPaint,
    CompanionWindowFirstPaint,
}

fn parse_frontend_lifecycle_event(
    window_label: &str,
    event: &str,
) -> Result<FrontendLifecycleEvent, String> {
    match (window_label, event) {
        ("main", "main_window_first_paint") => Ok(FrontendLifecycleEvent::MainWindowFirstPaint),
        ("companion", "companion_window_first_paint") => {
            Ok(FrontendLifecycleEvent::CompanionWindowFirstPaint)
        }
        _ => Err(format!(
            "unsupported frontend lifecycle event: window={window_label} event={event}"
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_known_frontend_lifecycle_events() {
        assert_eq!(
            parse_frontend_lifecycle_event("main", "main_window_first_paint"),
            Ok(FrontendLifecycleEvent::MainWindowFirstPaint)
        );
        assert_eq!(
            parse_frontend_lifecycle_event("companion", "companion_window_first_paint"),
            Ok(FrontendLifecycleEvent::CompanionWindowFirstPaint)
        );
    }

    #[test]
    fn rejects_cross_window_or_unknown_frontend_lifecycle_events() {
        assert!(parse_frontend_lifecycle_event("companion", "main_window_first_paint").is_err());
        assert!(parse_frontend_lifecycle_event("main", "unknown").is_err());
    }
}
