use crate::{
    macos_window::{
        animate_main_window_logical_size, set_main_window_logical_size, start_main_window_drag,
        sync_companion_window_position_only,
    },
    observability::{info as log_info, LogArea},
};

/// Fallback only. The authoritative animation duration lives in the frontend
/// (`MAIN_WINDOW_ANIMATION_DURATION_MS`) and is always passed via `duration_ms`.
const DEFAULT_MAIN_WINDOW_ANIMATION_DURATION_MS: u64 = 680;

#[tauri::command]
pub fn sync_companion_window_position(app: tauri::AppHandle) {
    sync_companion_window_position_only(&app);
}

#[tauri::command]
pub fn start_main_window_drag_command(app: tauri::AppHandle) -> Result<(), String> {
    log_info(LogArea::Window, "main window native drag requested");
    start_main_window_drag(&app)
}

#[tauri::command]
pub fn set_main_window_logical_size_command(
    app: tauri::AppHandle,
    width: f64,
    height: f64,
) -> Result<(), String> {
    log_info(
        LogArea::Window,
        format!("main window native size requested: width={width} height={height}"),
    );
    set_main_window_logical_size(&app, width, height)
}

#[tauri::command]
pub fn animate_main_window_logical_size_command(
    app: tauri::AppHandle,
    width: f64,
    height: f64,
    duration_ms: Option<u64>,
) -> Result<(), String> {
    // Source of truth is the frontend (MAIN_WINDOW_ANIMATION_DURATION_MS); the
    // coordinator always supplies durationMs. This fallback only guards a direct
    // invoke without the field and is intentionally clamped again downstream.
    let duration_ms = duration_ms.unwrap_or(DEFAULT_MAIN_WINDOW_ANIMATION_DURATION_MS);
    log_info(
        LogArea::Window,
        format!(
            "main window native animation requested: width={width} height={height} duration_ms={duration_ms}"
        ),
    );
    animate_main_window_logical_size(&app, width, height, duration_ms)
}
