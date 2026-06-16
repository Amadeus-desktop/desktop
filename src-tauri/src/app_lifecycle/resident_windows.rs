use crate::{
    macos_window::position_companion_window,
    observability::{error as log_error, LogArea},
};
use tauri::{Manager, WindowEvent};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ResidentWindowCloseAction {
    Hide,
    AllowClose,
}

fn resident_window_close_action(label: &str) -> ResidentWindowCloseAction {
    match label {
        "main" | "companion" => ResidentWindowCloseAction::Hide,
        _ => ResidentWindowCloseAction::AllowClose,
    }
}

pub fn watch_companion_window_layout(app: &tauri::AppHandle, window: &tauri::WebviewWindow) {
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        let should_reposition = matches!(
            event,
            WindowEvent::Moved(_)
                | WindowEvent::ScaleFactorChanged { .. }
                | WindowEvent::Resized(_)
        );

        if should_reposition {
            if let Some(companion) = app_handle.get_webview_window("companion") {
                position_companion_window(&companion);
            }
        }
    });
}

pub fn watch_resident_window_close(window: &tauri::WebviewWindow) {
    let window = window.clone();
    window.clone().on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            if resident_window_close_action(window.label()) == ResidentWindowCloseAction::Hide {
                api.prevent_close();
                if let Err(error) = window.hide() {
                    log_error(
                        LogArea::Window,
                        format!("watch_resident_window_close: hide failed: {error}"),
                    );
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resident_windows_hide_instead_of_closing() {
        assert_eq!(
            resident_window_close_action("main"),
            ResidentWindowCloseAction::Hide
        );
        assert_eq!(
            resident_window_close_action("companion"),
            ResidentWindowCloseAction::Hide
        );
    }

    #[test]
    fn unknown_windows_may_close_normally() {
        assert_eq!(
            resident_window_close_action("settings"),
            ResidentWindowCloseAction::AllowClose
        );
    }
}
