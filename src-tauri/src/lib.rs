// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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

use llama_sidecar::{get_llama_sidecar_status, LlamaSidecarState};
use llm::{
    generate_chat_reply, generate_test_utterance, get_llm_provider_health, LlmService, LlmState,
};
use macos_context::{get_current_context_snapshot, ContextBridgeState};
use macos_window::{
    configure_macos_companion_window, configure_macos_main_window, position_companion_window,
    restore_companion_window_on_active_space, schedule_macos_webview_layer_refresh,
    start_main_window_drag, sync_companion_window_position_only,
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
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, Instant},
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
const DEV_AUTH_CALLBACK_PORT: u16 = 17421;
const DEV_AUTH_CALLBACK_URL: &str = "http://127.0.0.1:17421/auth/callback";
const AUTH_CALLBACK_EVENT: &str = "amadeus-auth-callback";
static DEV_AUTH_CALLBACK_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static PENDING_AUTH_CALLBACK_URL: Mutex<Option<String>> = Mutex::new(None);

struct StartupPhaseTimer {
    name: &'static str,
    started_at: Instant,
}

impl StartupPhaseTimer {
    fn start(name: &'static str) -> Self {
        Self {
            name,
            started_at: Instant::now(),
        }
    }

    fn finish(self) {
        log_info(
            LogArea::Startup,
            format!(
                "startup phase completed: phase={} duration_ms={}",
                self.name,
                self.started_at.elapsed().as_millis()
            ),
        );
    }
}

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

fn store_pending_auth_callback(url: impl Into<String>) {
    if let Ok(mut pending) = PENDING_AUTH_CALLBACK_URL.lock() {
        *pending = Some(url.into());
    }
}

fn take_pending_auth_callback() -> Option<String> {
    PENDING_AUTH_CALLBACK_URL
        .lock()
        .ok()
        .and_then(|mut pending| pending.take())
}

fn route_auth_callback(app: &tauri::AppHandle, url: String) {
    store_pending_auth_callback(url.clone());
    let payload = AuthCallbackPayload { url };
    if let Err(error) = app.emit(AUTH_CALLBACK_EVENT, payload) {
        log_error(
            LogArea::Auth,
            format!("auth callback event emit failed; pending replay retained: {error}"),
        );
    }
}

#[tauri::command]
fn consume_pending_auth_callback() -> Option<AuthCallbackPayload> {
    take_pending_auth_callback().map(|url| AuthCallbackPayload { url })
}

#[tauri::command]
fn sync_companion_window_position(app: tauri::AppHandle) {
    sync_companion_window_position_only(&app);
}

#[tauri::command]
fn start_main_window_drag_command(app: tauri::AppHandle) -> Result<(), String> {
    log_info(LogArea::Window, "main window native drag requested");
    start_main_window_drag(&app)
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

#[tauri::command]
fn start_dev_auth_callback_server(app: tauri::AppHandle) -> Result<String, String> {
    if DEV_AUTH_CALLBACK_SERVER_RUNNING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        log_info(
            LogArea::Auth,
            "dev auth callback server already running; reusing loopback redirect",
        );
        return Ok(DEV_AUTH_CALLBACK_URL.to_string());
    }

    let bind_timer = StartupPhaseTimer::start("dev_auth_callback_bind");
    let listener =
        TcpListener::bind(format!("127.0.0.1:{DEV_AUTH_CALLBACK_PORT}")).map_err(|error| {
            DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
            format!("dev auth callback bind failed: {error}")
        })?;
    listener.set_nonblocking(false).map_err(|error| {
        DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
        format!("dev auth callback configure failed: {error}")
    })?;
    bind_timer.finish();
    log_info(
        LogArea::Auth,
        format!("dev auth callback server listening: url={DEV_AUTH_CALLBACK_URL}"),
    );

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
        if std::time::Instant::now() >= deadline {
            return Ok(());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                if handle_dev_auth_callback_stream(&app, &mut stream)? {
                    return Ok(());
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(error),
        }
    }
}

fn handle_dev_auth_callback_stream(
    app: &tauri::AppHandle,
    stream: &mut TcpStream,
) -> std::io::Result<bool> {
    let mut buffer = [0_u8; 4096];
    let bytes_read = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);

    match classify_dev_auth_callback_request(&request) {
        DevAuthCallbackRequest::Favicon => {
            write_dev_auth_callback_empty(stream)?;
            Ok(false)
        }
        DevAuthCallbackRequest::Waiting => {
            write_dev_auth_callback_response(stream, 200, "Amadeus auth callback ready")?;
            Ok(false)
        }
        DevAuthCallbackRequest::NotFound => {
            write_dev_auth_callback_response(stream, 404, "Amadeus auth callback not found")?;
            Ok(false)
        }
        DevAuthCallbackRequest::Invalid => {
            write_dev_auth_callback_response(stream, 400, "Invalid Amadeus auth callback")?;
            Ok(false)
        }
        DevAuthCallbackRequest::Callback(callback_url) => {
            route_auth_callback(app, callback_url);
            log_info(LogArea::Auth, "dev auth callback emitted to frontend");
            write_dev_auth_callback_response(stream, 200, "Amadeus login completed")?;
            Ok(true)
        }
    }
}

enum DevAuthCallbackRequest {
    Callback(String),
    Waiting,
    Favicon,
    NotFound,
    Invalid,
}

fn classify_dev_auth_callback_request(request: &str) -> DevAuthCallbackRequest {
    let request_line = request.lines().next().unwrap_or("");
    if request_line.contains("/favicon.ico") {
        return DevAuthCallbackRequest::Favicon;
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let target = parts.next().unwrap_or("");
    if method != "GET" {
        return DevAuthCallbackRequest::Invalid;
    }

    let path = target.split('?').next().unwrap_or("").trim_end_matches('/');
    if path != "/auth/callback" {
        return DevAuthCallbackRequest::NotFound;
    }

    let query = target.split_once('?').map(|(_, query)| query).unwrap_or("");
    if query.is_empty() {
        return DevAuthCallbackRequest::Waiting;
    }

    if !query
        .split('&')
        .any(|part| part.starts_with("code=") && part.len() > "code=".len())
    {
        return DevAuthCallbackRequest::Invalid;
    }

    DevAuthCallbackRequest::Callback(format!("http://127.0.0.1:{DEV_AUTH_CALLBACK_PORT}{target}"))
}

#[cfg(test)]
fn dev_auth_callback_url_from_request(request: &str) -> Option<String> {
    match classify_dev_auth_callback_request(request) {
        DevAuthCallbackRequest::Callback(url) => Some(url),
        _ => None,
    }
}

fn auth_callback_url_from_argv<I, S>(args: I) -> Option<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter()
        .map(|arg| {
            arg.as_ref()
                .trim_matches('"')
                .trim_matches('\'')
                .to_string()
        })
        .find(|arg| is_supported_app_auth_callback_url(arg))
}

fn is_supported_app_auth_callback_url(url: &str) -> bool {
    let Some(query_start) = url.find('?') else {
        return false;
    };
    if &url[..query_start] != "amadeus://auth/callback" {
        return false;
    }
    url[query_start + 1..]
        .split('&')
        .any(|part| part.starts_with("code=") && part.len() > "code=".len())
}

fn dev_auth_callback_success_html() -> String {
    r#"<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Amadeus</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      background: radial-gradient(ellipse 90% 55% at 50% -15%, rgba(96, 165, 250, 0.14), transparent 65%), #09090b;
      color: #f4f4f5;
    }
    .card {
      width: min(100%, 360px);
      text-align: center;
      padding: 32px 28px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
    }
    .eyebrow {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(147, 197, 253, 0.75);
      margin-bottom: 16px;
    }
    .icon {
      width: 52px;
      height: 52px;
      margin: 0 auto 18px;
      border-radius: 50%;
      border: 1px solid rgba(52, 211, 153, 0.35);
      background: rgba(52, 211, 153, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 26px;
      height: 26px;
      stroke: #34d399;
    }
    h1 {
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    p {
      font-size: 0.875rem;
      line-height: 1.55;
      color: rgba(244, 244, 245, 0.62);
    }
  </style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">AMADEUS</p>
    <div class="icon" aria-hidden="true">
      <svg fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
    </div>
    <h1>로그인 완료</h1>
    <p>Amadeus로 돌아가 계속 진행하세요.<br>이 탭은 닫아도 됩니다.</p>
  </div>
</body>
</html>"#
        .to_string()
}

fn dev_auth_callback_error_html(message: &str) -> String {
    format!(
        r#"<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Amadeus</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; }}
    body {{
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      background: #09090b;
      color: #f4f4f5;
    }}
    .card {{
      width: min(100%, 360px);
      text-align: center;
      padding: 28px 24px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }}
    h1 {{
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 8px;
    }}
    p {{
      font-size: 0.875rem;
      line-height: 1.55;
      color: rgba(244, 244, 245, 0.62);
    }}
  </style>
</head>
<body>
  <div class="card">
    <h1>로그인에 실패했어요</h1>
    <p>{message}</p>
  </div>
</body>
</html>"#
    )
}

fn dev_auth_callback_waiting_html() -> String {
    r#"<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Amadeus</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      background: #09090b;
      color: #f4f4f5;
    }
    .card {
      width: min(100%, 360px);
      text-align: center;
      padding: 28px 24px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }
    h1 { font-size: 1rem; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 0.875rem; line-height: 1.55; color: rgba(244, 244, 245, 0.62); }
  </style>
</head>
<body>
  <div class="card">
    <h1>로그인 대기 중</h1>
    <p>Amadeus에서 Google 로그인을 시작하면 이 페이지로 돌아와요.</p>
  </div>
</body>
</html>"#
        .to_string()
}

fn dev_auth_callback_not_found_html() -> String {
    format!(
        r#"<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Amadeus</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; }}
    body {{
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      background: #09090b;
      color: #f4f4f5;
    }}
    .card {{
      width: min(100%, 360px);
      text-align: center;
      padding: 28px 24px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }}
    h1 {{ font-size: 1rem; font-weight: 600; margin-bottom: 8px; }}
    p {{ font-size: 0.875rem; line-height: 1.55; color: rgba(244, 244, 245, 0.62); }}
    code {{ font-size: 0.75rem; color: rgba(147, 197, 253, 0.9); }}
  </style>
</head>
<body>
  <div class="card">
    <h1>페이지를 찾을 수 없어요</h1>
    <p>Supabase redirect URL은 <code>{DEV_AUTH_CALLBACK_URL}</code> 로 설정해 주세요. Vite 포트(1420/1421)는 사용하지 않아요.</p>
  </div>
</body>
</html>"#
    )
}

fn dev_auth_callback_html(status: u16, message: &str) -> String {
    if status == 200 && message == "Amadeus auth callback ready" {
        return dev_auth_callback_waiting_html();
    }
    if status == 200 {
        return dev_auth_callback_success_html();
    }
    if status == 404 {
        return dev_auth_callback_not_found_html();
    }
    dev_auth_callback_error_html(message)
}

fn write_dev_auth_callback_empty(stream: &mut TcpStream) -> std::io::Result<()> {
    write!(
        stream,
        "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n"
    )
}

fn write_dev_auth_callback_response(
    stream: &mut TcpStream,
    status: u16,
    message: &str,
) -> std::io::Result<()> {
    let status_text = match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "Internal Server Error",
    };
    let body = dev_auth_callback_html(status, message);
    write!(
        stream,
        "HTTP/1.1 {status} {status_text}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    )
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

    #[test]
    fn parses_dev_auth_callback_request() {
        let request = "GET /auth/callback?code=oauth-code&state=state HTTP/1.1\r\nHost: 127.0.0.1:17421\r\n\r\n";

        assert_eq!(
            dev_auth_callback_url_from_request(request),
            Some("http://127.0.0.1:17421/auth/callback?code=oauth-code&state=state".to_string())
        );
    }

    #[test]
    fn rejects_dev_auth_callback_without_code() {
        let request = "GET /auth/callback?state=state HTTP/1.1\r\nHost: 127.0.0.1:17421\r\n\r\n";

        assert_eq!(dev_auth_callback_url_from_request(request), None);
    }

    #[test]
    fn extracts_supported_auth_callback_from_single_instance_argv() {
        let args = vec![
            "/Applications/Amadeus.app/Contents/MacOS/Amadeus".to_string(),
            "amadeus://auth/callback?code=oauth-code&state=state".to_string(),
        ];

        assert_eq!(
            auth_callback_url_from_argv(args),
            Some("amadeus://auth/callback?code=oauth-code&state=state".to_string())
        );
    }

    #[test]
    fn rejects_fake_auth_callback_argv() {
        assert_eq!(
            auth_callback_url_from_argv(vec!["amadeus://auth.evil/callback?code=oauth-code"]),
            None
        );
        assert_eq!(
            auth_callback_url_from_argv(vec!["amadeus://auth/callback/extra?code=oauth-code"]),
            None
        );
        assert_eq!(
            auth_callback_url_from_argv(vec!["amadeus://auth/callback?state=state"]),
            None
        );
    }

    #[test]
    fn pending_auth_callback_is_consumed_once() {
        let _ = take_pending_auth_callback();
        store_pending_auth_callback("amadeus://auth/callback?code=oauth-code");

        assert_eq!(
            take_pending_auth_callback(),
            Some("amadeus://auth/callback?code=oauth-code".to_string())
        );
        assert_eq!(take_pending_auth_callback(), None);
    }
}
