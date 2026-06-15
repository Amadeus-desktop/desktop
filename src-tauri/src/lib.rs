// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod llama_sidecar;
mod llm;
mod macos_context;
mod observability;
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
use observability::{error as log_error, init as init_logger, warn as log_warn, LogArea};
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
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::Duration,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
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
const DEV_AUTH_CALLBACK_URL: &str = "http://127.0.0.1:1421/auth/callback";
const AUTH_CALLBACK_EVENT: &str = "amadeus-auth-callback";
static DEV_AUTH_CALLBACK_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, serde::Serialize)]
struct AuthCallbackPayload {
    url: String,
}

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
fn sync_companion_window_position(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("companion") {
        position_companion_window(&window);
    }
}

#[tauri::command]
fn start_dev_auth_callback_server(app: tauri::AppHandle) -> Result<String, String> {
    if DEV_AUTH_CALLBACK_SERVER_RUNNING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Ok(DEV_AUTH_CALLBACK_URL.to_string());
    }

    let listener = TcpListener::bind("127.0.0.1:1421").map_err(|error| {
        DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
        format!("dev auth callback bind failed: {error}")
    })?;
    listener.set_nonblocking(false).map_err(|error| {
        DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
        format!("dev auth callback configure failed: {error}")
    })?;

    thread::spawn(move || {
        if let Err(error) = serve_dev_auth_callback(app, listener) {
            log_error(
                LogArea::Auth,
                format!("dev auth callback server failed: {error}"),
            );
        }
        DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
    });

    Ok(DEV_AUTH_CALLBACK_URL.to_string())
}

fn serve_dev_auth_callback(app: tauri::AppHandle, listener: TcpListener) -> std::io::Result<()> {
    listener.set_nonblocking(true)?;
    let deadline = std::time::Instant::now() + Duration::from_secs(300);

    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                handle_dev_auth_callback_stream(&app, &mut stream)?;
                return Ok(());
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                if std::time::Instant::now() >= deadline {
                    return Ok(());
                }
                thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(error),
        }
    }
}

fn handle_dev_auth_callback_stream(
    app: &tauri::AppHandle,
    stream: &mut TcpStream,
) -> std::io::Result<()> {
    let mut buffer = [0_u8; 4096];
    let bytes_read = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let Some(callback_url) = dev_auth_callback_url_from_request(&request) else {
        write_dev_auth_callback_response(stream, 400, "Invalid Amadeus auth callback")?;
        return Ok(());
    };

    let payload = AuthCallbackPayload { url: callback_url };
    if let Err(error) = app.emit(AUTH_CALLBACK_EVENT, payload) {
        log_error(
            LogArea::Auth,
            format!("dev auth callback event emit failed: {error}"),
        );
        write_dev_auth_callback_response(stream, 500, "Amadeus auth callback failed")?;
        return Ok(());
    }

    write_dev_auth_callback_response(
        stream,
        200,
        "Amadeus login completed. You can close this tab.",
    )
}

fn dev_auth_callback_url_from_request(request: &str) -> Option<String> {
    let request_line = request.lines().next()?;
    let mut parts = request_line.split_whitespace();
    let method = parts.next()?;
    let target = parts.next()?;
    if method != "GET" || !target.starts_with("/auth/callback?") {
        return None;
    }
    if !target
        .trim_start_matches("/auth/callback?")
        .split('&')
        .any(|part| part.starts_with("code="))
    {
        return None;
    }

    Some(format!("http://127.0.0.1:1421{target}"))
}

fn write_dev_auth_callback_response(
    stream: &mut TcpStream,
    status: u16,
    message: &str,
) -> std::io::Result<()> {
    let status_text = match status {
        200 => "OK",
        400 => "Bad Request",
        _ => "Internal Server Error",
    };
    let body = format!(
        "<!doctype html><meta charset=\"utf-8\"><title>Amadeus</title><body>{message}</body>"
    );
    write!(
        stream,
        "HTTP/1.1 {status} {status_text}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    )
}

/// Position the companion overlay at the bottom-right of the primary monitor work area.
fn position_companion_window(window: &tauri::WebviewWindow) {
    use tauri::PhysicalPosition;

    const MARGIN: i32 = 12;

    let Ok(Some(monitor)) = window.current_monitor() else {
        log_warn(
            LogArea::Window,
            "position_companion_window: current_monitor() unavailable",
        );
        return;
    };

    let work_area = monitor.work_area();
    let window_size = window.outer_size().unwrap_or(work_area.size);

    let x = work_area.position.x + work_area.size.width as i32 - window_size.width as i32 - MARGIN;
    let y =
        work_area.position.y + work_area.size.height as i32 - window_size.height as i32 - MARGIN;

    if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
        log_error(
            LogArea::Window,
            format!("position_companion_window: set_position failed: {error}"),
        );
    }
}

/// Make the main control-center window follow normal Space / Mission Control rules.
#[cfg(target_os = "macos")]
fn configure_macos_main_window(window: &tauri::WebviewWindow) {
    let Ok(ptr) = window.ns_window() else {
        log_warn(
            LogArea::Window,
            "configure_macos_main_window: ns_window() unavailable",
        );
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
        log_warn(
            LogArea::Window,
            "configure_macos_companion_window: ns_window() unavailable",
        );
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
    if let Some(window) = app.get_webview_window("companion") {
        match window.is_visible() {
            Ok(true) => {
                if let Err(error) = window.hide() {
                    log_error(
                        LogArea::Window,
                        format!("toggle_companion_window: hide failed: {error}"),
                    );
                }
            }
            Ok(false) => {
                if let Err(error) = window.show() {
                    log_error(
                        LogArea::Window,
                        format!("toggle_companion_window: show failed: {error}"),
                    );
                }
                position_companion_window(&window);
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
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            if let Err(error) = init_logger(app_data_dir.join(APP_LOG_FILE_NAME)) {
                eprintln!("[amadeus][warn][observability] logger init failed: {error}");
            }
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
            setup_menu_bar(app)?;

            // Make windows transparent + popup-style on macOS
            #[cfg(target_os = "macos")]
            {
                if let Some(win) = app.get_webview_window("main") {
                    configure_macos_main_window(&win);
                    watch_resident_window_close(&win);
                }
                if let Some(win) = app.get_webview_window("companion") {
                    configure_macos_companion_window(&win);
                    position_companion_window(&win);
                    watch_companion_window_layout(app.handle(), &win);
                    watch_resident_window_close(&win);
                }
            }

            #[cfg(not(target_os = "macos"))]
            {
                if let Some(win) = app.get_webview_window("main") {
                    watch_resident_window_close(&win);
                }
                if let Some(win) = app.get_webview_window("companion") {
                    position_companion_window(&win);
                    watch_companion_window_layout(app.handle(), &win);
                    watch_resident_window_close(&win);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sync_companion_window_position,
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

    #[test]
    fn parses_dev_auth_callback_request() {
        let request = "GET /auth/callback?code=oauth-code&state=state HTTP/1.1\r\nHost: 127.0.0.1:1421\r\n\r\n";

        assert_eq!(
            dev_auth_callback_url_from_request(request),
            Some("http://127.0.0.1:1421/auth/callback?code=oauth-code&state=state".to_string())
        );
    }

    #[test]
    fn rejects_dev_auth_callback_without_code() {
        let request = "GET /auth/callback?state=state HTTP/1.1\r\nHost: 127.0.0.1:1421\r\n\r\n";

        assert_eq!(dev_auth_callback_url_from_request(request), None);
    }
}
