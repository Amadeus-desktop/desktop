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
    startup::StartupPhaseTimer,
    windows::{start_main_window_drag_command, sync_companion_window_position},
};
use llama_sidecar::{get_llama_sidecar_status, LlamaSidecarState};
use llm::{
    generate_chat_reply, generate_test_utterance, get_llm_provider_health, LlmService, LlmState,
};
use macos_context::{get_current_context_snapshot, ContextBridgeState};
use macos_window::{
    configure_macos_companion_window, configure_macos_main_window, position_companion_window,
    restore_companion_window_on_active_space, schedule_macos_webview_layer_refresh,
    watch_macos_companion_space_changes, CompanionWindowVisibility,
};
use observability::{error as log_error, info as log_info, init as init_logger, LogArea};
use ocr::{
    capture_primary_display_ocr, get_ocr_provider_status, recognize_captured_image, OcrState,
    ScreenCaptureState,
};
use privacy::{
    assess_current_privacy_context, capture_privacy_checked_context_event,
    get_screen_capture_permission_status, request_screen_capture_permission,
};
use settings::{get_app_settings, llama_endpoint, update_app_settings, SettingsState};
use shared::constants::{
    APP_DATABASE_FILE_NAME, APP_LOG_FILE_NAME, APP_NAME, APP_SETTINGS_FILE_NAME,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use timeline::{
    clear_local_timeline_data, create_context_event, create_local_memory, create_user_reaction,
    create_utterance_event, enqueue_sync_payload, list_timeline_events, TimelineRepository,
    TimelineState,
};
use trigger::{
    poll_trigger_engine, record_trigger_reaction_for_scoring, run_trigger_engine_once,
    TriggerEngineState,
};

const TRAY_ID: &str = "amadeus_menu_bar";
const TRAY_OPEN_AMADEUS_ID: &str = "open_amadeus";
const TRAY_TOGGLE_COMPANION_ID: &str = "toggle_companion";
const TRAY_QUIT_AMADEUS_ID: &str = "quit_amadeus";
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ResidentWindowCloseAction {
    Hide,
    AllowClose,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrayMenuAction {
    OpenAmadeus,
    ToggleCompanion,
    QuitAmadeus,
    Ignore,
}

fn resident_window_close_action(label: &str) -> ResidentWindowCloseAction {
    match label {
        "main" | "companion" => ResidentWindowCloseAction::Hide,
        _ => ResidentWindowCloseAction::AllowClose,
    }
}

fn tray_menu_action(menu_id: &str) -> TrayMenuAction {
    match menu_id {
        TRAY_OPEN_AMADEUS_ID => TrayMenuAction::OpenAmadeus,
        TRAY_TOGGLE_COMPANION_ID => TrayMenuAction::ToggleCompanion,
        TRAY_QUIT_AMADEUS_ID => TrayMenuAction::QuitAmadeus,
        _ => TrayMenuAction::Ignore,
    }
}

#[tauri::command]
fn record_frontend_log(level: String, area: String, message: String, context: Option<String>) {
    let area = frontend_log_area(&area);
    let message = match context {
        Some(context) if !context.is_empty() && context != "{}" => {
            format!("frontend: {message} context={context}")
        }
        _ => format!("frontend: {message}"),
    };

    match level.as_str() {
        "error" => log_error(area, message),
        "warn" => observability::warn(area, message),
        _ => log_info(area, message),
    }
}

fn frontend_log_area(area: &str) -> LogArea {
    match area {
        "auth" => LogArea::Auth,
        "context" => LogArea::Context,
        "settings" => LogArea::Settings,
        "startup" => LogArea::Startup,
        "trigger" => LogArea::Trigger,
        "ui" => LogArea::Ui,
        "window" => LogArea::Window,
        _ => LogArea::Ui,
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

fn watch_resident_window_close(window: &tauri::WebviewWindow) {
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

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.show() {
            log_error(
                LogArea::Window,
                format!("show_main_window: show failed: {error}"),
            );
        }
        if let Err(error) = window.set_focus() {
            log_error(
                LogArea::Window,
                format!("show_main_window: set_focus failed: {error}"),
            );
        }
    }
}

fn toggle_companion_window(app: &tauri::AppHandle) {
    let visibility = app.state::<CompanionWindowVisibility>();
    if let Some(window) = app.get_webview_window("companion") {
        match window.is_visible() {
            Ok(true) => {
                visibility.set_user_hidden(true);
                if let Err(error) = window.hide() {
                    log_error(
                        LogArea::Window,
                        format!("toggle_companion_window: hide failed: {error}"),
                    );
                }
            }
            Ok(false) => {
                visibility.set_user_hidden(false);
                restore_companion_window_on_active_space(app);
            }
            Err(error) => log_error(
                LogArea::Window,
                format!("toggle_companion_window: is_visible failed: {error}"),
            ),
        }
    }
}

fn handle_tray_menu_action(app: &tauri::AppHandle, action: TrayMenuAction) {
    match action {
        TrayMenuAction::OpenAmadeus => show_main_window(app),
        TrayMenuAction::ToggleCompanion => toggle_companion_window(app),
        TrayMenuAction::QuitAmadeus => app.exit(0),
        TrayMenuAction::Ignore => {}
    }
}

fn menu_bar_template_icon() -> Image<'static> {
    const SIZE: u32 = 18;
    const MASK: [&str; SIZE as usize] = [
        "000000000000000000",
        "000000011000000000",
        "000000111100000000",
        "000001111110000000",
        "000011111111000000",
        "000111100111100000",
        "001111000011110000",
        "001110000001110000",
        "001100111100110000",
        "001101111110110000",
        "001101100110110000",
        "001100000000110000",
        "000110011001100000",
        "000011111111000000",
        "000001111110000000",
        "000000111100000000",
        "000000011000000000",
        "000000000000000000",
    ];
    let mut rgba = Vec::with_capacity((SIZE * SIZE * 4) as usize);
    for row in MASK {
        for pixel in row.as_bytes() {
            if *pixel == b'1' {
                rgba.extend_from_slice(&[255, 255, 255, 255]);
            } else {
                rgba.extend_from_slice(&[255, 255, 255, 0]);
            }
        }
    }
    Image::new_owned(rgba, SIZE, SIZE)
}

fn setup_menu_bar(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(
        app,
        TRAY_OPEN_AMADEUS_ID,
        "Open Amadeus",
        true,
        None::<&str>,
    )?;
    let toggle = MenuItem::with_id(
        app,
        TRAY_TOGGLE_COMPANION_ID,
        "Show/Hide Companion",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(
        app,
        TRAY_QUIT_AMADEUS_ID,
        "Quit Amadeus",
        true,
        None::<&str>,
    )?;
    let menu = Menu::with_items(app, &[&open, &toggle, &separator, &quit])?;
    let tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip(APP_NAME)
        .icon(menu_bar_template_icon())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            handle_tray_menu_action(app, tray_menu_action(event.id().as_ref()));
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    let tray = tray.build(app)?;
    app.manage(tray);
    Ok(())
}

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
        .setup(|app| {
            let setup_timer = StartupPhaseTimer::start("setup_total");
            let phase = StartupPhaseTimer::start("path_resolution");
            let app_data_dir = app.path().app_data_dir()?;
            phase.finish();
            let phase = StartupPhaseTimer::start("logger_init");
            if let Err(error) = init_logger(app_data_dir.join(APP_LOG_FILE_NAME)) {
                eprintln!("[amadeus][warn][observability] logger init failed: {error}");
            }
            phase.finish();
            log_info(LogArea::Startup, "startup setup entered");
            let phase = StartupPhaseTimer::start("state_path_resolution");
            let database_path = app_data_dir.join(APP_DATABASE_FILE_NAME);
            let settings_path = app_data_dir.join(APP_SETTINGS_FILE_NAME);
            phase.finish();
            let phase = StartupPhaseTimer::start("timeline_repository_open_and_migrate");
            let mut repository = TimelineRepository::open(database_path)?;
            repository.migrate()?;
            phase.finish();
            let phase = StartupPhaseTimer::start("settings_load");
            let settings_state = SettingsState::open(settings_path)?;
            let settings = settings_state.current()?;
            phase.finish();
            let phase = StartupPhaseTimer::start("llm_state_configure");
            let llm_state = LlmState::new(LlmService::default());
            let sidecar_state = LlamaSidecarState::new(app_data_dir.join("sidecars"));
            let _ = sidecar_state.configure(&settings);
            let start_sidecar = settings.model_route == "local-first";
            llm_state.configure_local(
                llama_endpoint(&settings.llama_server_host, settings.llama_server_port),
                settings.local_model_path.clone(),
            )?;
            llm_state.set_route(&settings.model_route, settings.local_fallback_enabled)?;
            phase.finish();
            let phase = StartupPhaseTimer::start("tauri_state_manage");
            app.manage(TimelineState::new(repository));
            app.manage(ContextBridgeState::native());
            app.manage(TriggerEngineState::new());
            app.manage(settings_state);
            app.manage(llm_state);
            app.manage(sidecar_state);
            app.manage(CompanionWindowVisibility::default());
            app.manage(OcrState::platform_default());
            app.manage(ScreenCaptureState::platform_default());
            phase.finish();
            let phase = StartupPhaseTimer::start("menu_bar_setup");
            setup_menu_bar(app)?;
            phase.finish();

            if start_sidecar {
                log_info(
                    LogArea::Startup,
                    "local-first sidecar warmup scheduled after startup delay",
                );
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    let handle = app_handle.clone();
                    let _ = app_handle.run_on_main_thread(move || {
                        let phase = StartupPhaseTimer::start("deferred_sidecar_ensure_running");
                        let sidecar = handle.state::<LlamaSidecarState>();
                        if let Err(error) = sidecar.ensure_running() {
                            let _ = sidecar.record_error(error);
                        }
                        phase.finish();
                    });
                });
            }

            // Make windows transparent + popup-style on macOS
            #[cfg(target_os = "macos")]
            {
                let phase = StartupPhaseTimer::start("macos_window_configure");
                if let Some(win) = app.get_webview_window("main") {
                    configure_macos_main_window(&win);
                    watch_resident_window_close(&win);
                    schedule_macos_webview_layer_refresh(app.handle().clone(), "main");
                }
                if let Some(win) = app.get_webview_window("companion") {
                    configure_macos_companion_window(&win);
                    restore_companion_window_on_active_space(app.handle());
                    watch_companion_window_layout(app.handle(), &win);
                    watch_resident_window_close(&win);
                    watch_macos_companion_space_changes(app.handle());
                }
                phase.finish();
            }

            #[cfg(not(target_os = "macos"))]
            {
                let phase = StartupPhaseTimer::start("window_configure");
                if let Some(win) = app.get_webview_window("main") {
                    watch_resident_window_close(&win);
                }
                if let Some(win) = app.get_webview_window("companion") {
                    position_companion_window(&win);
                    watch_companion_window_layout(app.handle(), &win);
                    watch_resident_window_close(&win);
                }
                phase.finish();
            }

            #[cfg(debug_assertions)]
            {
                let phase = StartupPhaseTimer::start("debug_dev_auth_callback_server_start");
                match start_dev_auth_callback_server(app.handle().clone()) {
                    Ok(_) => log_info(LogArea::Auth, "debug dev auth callback server ready"),
                    Err(error) => log_error(
                        LogArea::Auth,
                        format!("debug dev auth callback server start failed: {error}"),
                    ),
                }
                phase.finish();
            }

            setup_timer.finish();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sync_companion_window_position,
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
            enqueue_sync_payload,
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
            consume_pending_auth_callback,
            start_dev_auth_callback_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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

    #[test]
    fn tray_menu_ids_map_to_resident_app_actions() {
        assert_eq!(
            tray_menu_action("open_amadeus"),
            TrayMenuAction::OpenAmadeus
        );
        assert_eq!(
            tray_menu_action("toggle_companion"),
            TrayMenuAction::ToggleCompanion
        );
        assert_eq!(
            tray_menu_action("quit_amadeus"),
            TrayMenuAction::QuitAmadeus
        );
        assert_eq!(tray_menu_action("unknown"), TrayMenuAction::Ignore);
    }
}
