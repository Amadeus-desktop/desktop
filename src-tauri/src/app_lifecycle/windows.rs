use crate::{
    macos_window::{
        animate_main_window_logical_size, set_main_window_logical_size, start_main_window_drag,
        sync_companion_window_position_only,
    },
    observability::{info as log_info, LogArea},
};

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
    let duration_ms = duration_ms.unwrap_or(420);
    log_info(
        LogArea::Window,
        format!(
            "main window native animation requested: width={width} height={height} duration_ms={duration_ms}"
        ),
    );
    animate_main_window_logical_size(&app, width, height, duration_ms)
}
