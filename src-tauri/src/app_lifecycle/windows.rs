use crate::{
    macos_window::{
        set_main_window_logical_size, start_main_window_drag, sync_companion_window_position_only,
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
    animated: bool,
) -> Result<(), String> {
    log_info(
        LogArea::Window,
        format!(
            "main window native size requested: width={width} height={height} animated={animated}"
        ),
    );
    set_main_window_logical_size(&app, width, height, animated)
}
