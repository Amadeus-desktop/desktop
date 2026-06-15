use crate::{
    macos_window::{start_main_window_drag, sync_companion_window_position_only},
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
