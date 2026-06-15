// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod llama_sidecar;
mod llm;
mod macos_context;
pub mod ocr;
pub mod policy;
mod privacy;
mod settings;
mod shared;
mod timeline;
mod trigger;

use llama_sidecar::{get_llama_sidecar_status, LlamaSidecarState};
use llm::{
    generate_chat_reply, generate_test_utterance, get_llm_provider_health, LlmService, LlmState,
};
use macos_context::{get_current_context_snapshot, ContextBridgeState};
use ocr::{
    capture_primary_display_ocr, get_ocr_provider_status, recognize_captured_image, OcrState,
    ScreenCaptureState,
};
use privacy::{
    assess_current_privacy_context, capture_privacy_checked_context_event,
    get_screen_capture_permission_status,
};
use settings::{get_app_settings, llama_endpoint, update_app_settings, SettingsState};
use shared::constants::{APP_DATABASE_FILE_NAME, APP_NAME, APP_SETTINGS_FILE_NAME};
use tauri::{Manager, WindowEvent};
use timeline::{
    create_context_event, create_local_memory, create_user_reaction, create_utterance_event,
    enqueue_sync_payload, list_timeline_events, TimelineRepository, TimelineState,
};
use trigger::{
    poll_trigger_engine, record_trigger_reaction_for_scoring, run_trigger_engine_once,
    TriggerEngineState,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from {APP_NAME}!")
}

#[tauri::command]
fn sync_companion_window_position(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("companion") {
        position_companion_window(&window);
    }
}

/// Position the companion overlay at the bottom-right of the primary monitor work area.
fn position_companion_window(window: &tauri::WebviewWindow) {
    use tauri::PhysicalPosition;

    const MARGIN: i32 = 12;

    let Ok(Some(monitor)) = window.current_monitor() else {
        eprintln!("position_companion_window: current_monitor() unavailable");
        return;
    };

    let work_area = monitor.work_area();
    let window_size = window.outer_size().unwrap_or(work_area.size);

    let x = work_area.position.x + work_area.size.width as i32 - window_size.width as i32 - MARGIN;
    let y =
        work_area.position.y + work_area.size.height as i32 - window_size.height as i32 - MARGIN;

    if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
        eprintln!("position_companion_window: set_position failed: {error}");
    }
}

/// Make the main control-center window follow normal Space / Mission Control rules.
#[cfg(target_os = "macos")]
fn configure_macos_main_window(window: &tauri::WebviewWindow) {
    let Ok(ptr) = window.ns_window() else {
        eprintln!("configure_macos_main_window: ns_window() unavailable");
        return;
    };

    unsafe {
        use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};

        let ns_window: &NSWindow = &*(ptr as *const NSWindow);
        ns_window.setCollectionBehavior(NSWindowCollectionBehavior::Managed);
    }
}

/// Configure the companion overlay as a floating HUD that follows the active Space.
///
/// - `MoveToActiveSpace` — moves with the user instead of cloning onto every desktop
/// - `Transient` — hides from Mission Control thumbnails
/// - `FullScreenAuxiliary` — stays usable over full-screen apps
/// - `IgnoresCycle` — keeps the overlay out of Cmd+` window cycling
///
/// We intentionally do NOT set `CanJoinAllSpaces` (Mission Control clutter) or
/// `Stationary` (broken Mission Control rendering).
#[cfg(target_os = "macos")]
fn configure_macos_companion_window(window: &tauri::WebviewWindow) {
    let Ok(ptr) = window.ns_window() else {
        eprintln!("configure_macos_companion_window: ns_window() unavailable");
        return;
    };

    unsafe {
        use objc2_app_kit::{NSFloatingWindowLevel, NSWindow, NSWindowCollectionBehavior};

        let ns_window: &NSWindow = &*(ptr as *const NSWindow);
        let behavior = NSWindowCollectionBehavior::MoveToActiveSpace
            | NSWindowCollectionBehavior::Transient
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::IgnoresCycle;
        ns_window.setCollectionBehavior(behavior);
        ns_window.setLevel(NSFloatingWindowLevel);
    }
}

fn watch_companion_window_layout(app: &tauri::AppHandle, window: &tauri::WebviewWindow) {
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        let should_reposition = matches!(
            event,
            WindowEvent::Focused(_)
                | WindowEvent::Moved(_)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let database_path = app_data_dir.join(APP_DATABASE_FILE_NAME);
            let settings_path = app_data_dir.join(APP_SETTINGS_FILE_NAME);
            let mut repository = TimelineRepository::open(database_path)?;
            repository.migrate()?;
            let settings_state = SettingsState::open(settings_path)?;
            let settings = settings_state.current()?;
            let llm_state = LlmState::new(LlmService::default());
            let sidecar_state = LlamaSidecarState::new(app_data_dir.join("sidecars"));
            let _ = sidecar_state.configure(&settings);
            if settings.model_route == "local-first" {
                if let Err(error) = sidecar_state.ensure_running() {
                    let _ = sidecar_state.record_error(error);
                }
            }
            llm_state.configure_local(
                llama_endpoint(&settings.llama_server_host, settings.llama_server_port),
                settings.local_model_path.clone(),
            )?;
            llm_state.set_route(&settings.model_route, settings.local_fallback_enabled)?;
            app.manage(TimelineState::new(repository));
            app.manage(ContextBridgeState::native());
            app.manage(TriggerEngineState::new());
            app.manage(settings_state);
            app.manage(llm_state);
            app.manage(sidecar_state);
            app.manage(OcrState::platform_default());
            app.manage(ScreenCaptureState::platform_default());

            // Make windows transparent + popup-style on macOS
            #[cfg(target_os = "macos")]
            {
                if let Some(win) = app.get_webview_window("main") {
                    configure_macos_main_window(&win);
                }
                if let Some(win) = app.get_webview_window("companion") {
                    configure_macos_companion_window(&win);
                    position_companion_window(&win);
                    watch_companion_window_layout(app.handle(), &win);
                }
            }

            #[cfg(not(target_os = "macos"))]
            {
                if let Some(win) = app.get_webview_window("companion") {
                    position_companion_window(&win);
                    watch_companion_window_layout(app.handle(), &win);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            sync_companion_window_position,
            get_current_context_snapshot,
            get_screen_capture_permission_status,
            assess_current_privacy_context,
            capture_privacy_checked_context_event,
            create_context_event,
            create_utterance_event,
            create_user_reaction,
            create_local_memory,
            enqueue_sync_payload,
            list_timeline_events,
            run_trigger_engine_once,
            poll_trigger_engine,
            record_trigger_reaction_for_scoring,
            get_app_settings,
            update_app_settings,
            get_llm_provider_health,
            get_llama_sidecar_status,
            get_ocr_provider_status,
            recognize_captured_image,
            capture_primary_display_ocr,
            generate_test_utterance,
            generate_chat_reply
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
