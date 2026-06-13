// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod llm;
mod macos_context;
mod privacy;
mod timeline;
mod trigger;

use llm::{
    generate_chat_reply, generate_test_utterance, get_llm_provider_health, set_llm_provider_route,
    LlmService, LlmState,
};
use macos_context::{
    capture_current_context_event, get_current_context_snapshot, ContextBridgeState,
};
use privacy::{
    assess_current_privacy_context, capture_privacy_checked_context_event,
    get_screen_capture_permission_status,
};
use tauri::Manager;
use timeline::{
    create_context_event, create_user_reaction, create_utterance_event, list_timeline_events,
    TimelineRepository, TimelineState,
};
use trigger::{
    poll_trigger_engine, record_trigger_reaction_for_scoring, run_trigger_engine_once,
    TriggerEngineState,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Make the window visible on every macOS Space.
///
/// Transparency and shadow are handled declaratively in `tauri.conf.json`
/// (`transparent: true` + `macOSPrivateApi: true`, `shadow: false`). The only
/// thing Tauri config cannot express is `NSWindowCollectionBehavior`, so that is
/// the sole reason this AppKit call exists. We intentionally do NOT set
/// `Stationary` — it makes the window render incompletely in Mission Control.
#[cfg(target_os = "macos")]
fn configure_macos_window(window: &tauri::WebviewWindow) {
    let Ok(ptr) = window.ns_window() else {
        eprintln!("configure_macos_window: ns_window() unavailable");
        return;
    };

    unsafe {
        use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};

        let ns_window: &NSWindow = &*(ptr as *const NSWindow);
        ns_window.setCollectionBehavior(NSWindowCollectionBehavior::CanJoinAllSpaces);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let database_path = app_data_dir.join("amadeus.sqlite3");
            let mut repository = TimelineRepository::open(database_path)?;
            repository.migrate()?;
            app.manage(TimelineState::new(repository));
            app.manage(ContextBridgeState::native());
            app.manage(TriggerEngineState::new());
            app.manage(LlmState::new(LlmService::default()));

            // Make the window transparent + popup-style on macOS
            #[cfg(target_os = "macos")]
            {
                if let Some(win) = app.get_webview_window("main") {
                    configure_macos_window(&win);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_current_context_snapshot,
            capture_current_context_event,
            get_screen_capture_permission_status,
            assess_current_privacy_context,
            capture_privacy_checked_context_event,
            create_context_event,
            create_utterance_event,
            create_user_reaction,
            list_timeline_events,
            run_trigger_engine_once,
            poll_trigger_engine,
            record_trigger_reaction_for_scoring,
            get_llm_provider_health,
            set_llm_provider_route,
            generate_test_utterance,
            generate_chat_reply
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
