// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod app_lifecycle;
mod llama_sidecar;
mod llm;
mod macos_context;
mod macos_window;
mod observability;
pub mod ocr;
pub mod policy;
mod privacy;
mod settings;
mod shared;
mod timeline;
mod trigger;

use app_lifecycle::{
    auth_callback::{
        auth_callback_url_from_argv, consume_pending_auth_callback, route_auth_callback,
        start_dev_auth_callback_server,
    },
    frontend_log::record_frontend_log,
    frontend_ready::record_frontend_ready,
    setup::setup_app,
    tray::show_main_window,
    windows::{
        animate_main_window_logical_size_command, set_main_window_logical_size_command,
        start_main_window_drag_command, sync_companion_window_position,
    },
};
use llama_sidecar::get_llama_sidecar_status;
use llm::{generate_chat_reply, generate_test_utterance, get_llm_provider_health};
use macos_context::get_current_context_snapshot;
use ocr::{capture_primary_display_ocr, get_ocr_provider_status, recognize_captured_image};
use privacy::{
    assess_current_privacy_context, capture_privacy_checked_context_event,
    get_screen_capture_permission_status, request_screen_capture_permission,
};
use settings::{get_app_settings, update_app_settings};
use timeline::{
    append_conversation_message, clear_local_timeline_data, create_context_event,
    create_local_memory, create_user_reaction, create_utterance_event, enqueue_sync_payload,
    get_or_create_conversation_session, list_activity_observations,
    list_conversation_messages_for_persona, list_timeline_events,
};
use trigger::{poll_trigger_engine, record_trigger_reaction_for_scoring, run_trigger_engine_once};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(url) = auth_callback_url_from_argv(argv) {
                route_auth_callback(app, url);
            }
            show_main_window(app);
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup_app)
        .invoke_handler(tauri::generate_handler![
            sync_companion_window_position,
            set_main_window_logical_size_command,
            animate_main_window_logical_size_command,
            start_main_window_drag_command,
            get_current_context_snapshot,
            get_screen_capture_permission_status,
            request_screen_capture_permission,
            assess_current_privacy_context,
            capture_privacy_checked_context_event,
            create_context_event,
            create_utterance_event,
            create_user_reaction,
            create_local_memory,
            get_or_create_conversation_session,
            append_conversation_message,
            list_conversation_messages_for_persona,
            enqueue_sync_payload,
            list_activity_observations,
            list_timeline_events,
            clear_local_timeline_data,
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
            generate_chat_reply,
            record_frontend_log,
            record_frontend_ready,
            consume_pending_auth_callback,
            start_dev_auth_callback_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
