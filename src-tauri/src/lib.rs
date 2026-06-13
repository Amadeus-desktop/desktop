// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod macos_context;
mod llm;
mod privacy;
mod timeline;
mod trigger;

use macos_context::{
    capture_current_context_event, get_current_context_snapshot, ContextBridgeState,
};
use llm::{
    generate_chat_reply, generate_test_utterance, get_llm_provider_health, LlmService, LlmState,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let database_path = app_data_dir.join("amadeus.sqlite3");
            let mut repository = TimelineRepository::open(database_path)?;
            repository.migrate()?;
            app.manage(TimelineState::new(repository));
            app.manage(ContextBridgeState::native());
            app.manage(TriggerEngineState::new());
            app.manage(LlmState::new(LlmService::default()));

            // Make the window transparent on macOS
            #[cfg(target_os = "macos")]
            {
                if let Some(win) = app.get_webview_window("main") {
                    let ptr = win.ns_window().expect("failed to get ns_window");
                    unsafe {
                        use objc2_app_kit::{NSColor, NSWindow};
                        let ns_window: &NSWindow = &*(ptr as *const NSWindow);
                        let clear = NSColor::clearColor();
                        ns_window.setBackgroundColor(Some(&clear));
                        ns_window.setOpaque(false);

                        // Disable background drawing on the WKWebView (contentView)
                        // Tauri sets transparent=true in config but this ensures it at runtime
                        if let Some(content_view) = ns_window.contentView() {
                            let content_view = &*content_view;
                            let _: () = objc2::msg_send![content_view, setDrawsBackground: false];
                            let _: () = objc2::msg_send![content_view, setOpaque: false];
                        }
                    }
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
            generate_test_utterance,
            generate_chat_reply
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
