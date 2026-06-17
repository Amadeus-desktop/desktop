use std::{
    io::{ErrorKind, Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, Instant},
};

use tauri::Emitter;

use crate::{
    app_lifecycle::auth_callback_html::dev_auth_callback_html,
    app_lifecycle::startup::StartupPhaseTimer,
    observability::{error as log_error, info as log_info, LogArea},
};

const DEV_AUTH_CALLBACK_PORT: u16 = 17421;
const DEV_AUTH_CALLBACK_URL: &str = "http://127.0.0.1:17421/auth/callback";
const APP_AUTH_CALLBACK_URL: &str = "amadeus://auth/callback";
const PRODUCTION_WEB_AUTH_CALLBACK_URL: &str = "https://amadeus0.kro.kr/auth/callback";
const AUTH_CALLBACK_EVENT: &str = "amadeus-auth-callback";
const DEV_AUTH_CALLBACK_TTL: Duration = Duration::from_secs(300);
const DEV_AUTH_CALLBACK_ACCEPT_POLL_MS: u64 = 50;
const DEV_AUTH_CALLBACK_READ_TIMEOUT: Duration = Duration::from_secs(5);
static DEV_AUTH_CALLBACK_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static DEV_AUTH_CALLBACK_SERVER_DEADLINE: Mutex<Option<Instant>> = Mutex::new(None);
static PENDING_AUTH_CALLBACK_URL: Mutex<Option<String>> = Mutex::new(None);

fn dev_auth_callback_addr() -> SocketAddr {
    format!("127.0.0.1:{DEV_AUTH_CALLBACK_PORT}")
        .parse()
        .expect("dev auth callback address should parse")
}

fn is_transient_io_error(error: &std::io::Error) -> bool {
    matches!(error.kind(), ErrorKind::WouldBlock | ErrorKind::Interrupted)
        || error.raw_os_error() == Some(35)
}

fn dev_auth_callback_server_is_reachable() -> bool {
    TcpStream::connect_timeout(&dev_auth_callback_addr(), Duration::from_millis(150)).is_ok()
}

fn mark_dev_auth_callback_server_stopped(reason: &str) {
    DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
    clear_dev_auth_callback_deadline();
    log_info(
        LogArea::Auth,
        format!("dev auth callback server stopped: reason={reason}"),
    );
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AuthCallbackPayload {
    url: String,
}

pub fn route_auth_callback(app: &tauri::AppHandle, url: String) {
    log_info(LogArea::Auth, "auth callback received by rust router");
    if store_pending_auth_callback(url.clone()) {
        log_info(
            LogArea::Auth,
            "auth callback pending replay overwritten by newer callback",
        );
    }
    let payload = AuthCallbackPayload { url };
    if let Err(error) = app.emit_to("main", AUTH_CALLBACK_EVENT, payload) {
        log_error(
            LogArea::Auth,
            format!("auth callback event emit failed; pending replay retained: {error}"),
        );
    } else {
        log_info(LogArea::Auth, "auth callback event emitted to frontend");
    }
}

#[tauri::command]
pub fn consume_pending_auth_callback(
    window: tauri::WebviewWindow,
) -> Result<Option<AuthCallbackPayload>, String> {
    if !can_consume_pending_auth_callback(window.label()) {
        log_error(
            LogArea::Auth,
            format!(
                "auth callback pending replay rejected for non-main window: label={}",
                window.label()
            ),
        );
        return Err("auth callback replay is only available to the main window".to_string());
    }

    let pending = take_pending_auth_callback().map(|url| AuthCallbackPayload { url });
    log_info(
        LogArea::Auth,
        format!(
            "auth callback pending replay consume requested: found={}",
            pending.is_some()
        ),
    );
    Ok(pending)
}

#[tauri::command]
pub fn start_dev_auth_callback_server(app: tauri::AppHandle) -> Result<String, String> {
    let deadline = extend_dev_auth_callback_deadline(Instant::now());
    if DEV_AUTH_CALLBACK_SERVER_RUNNING.load(Ordering::SeqCst) {
        if dev_auth_callback_server_is_reachable() {
            log_info(
                LogArea::Auth,
                format!(
                    "dev auth callback server already running; deadline extended by {}s",
                    DEV_AUTH_CALLBACK_TTL.as_secs()
                ),
            );
            return Ok(DEV_AUTH_CALLBACK_URL.to_string());
        }

        log_info(
            LogArea::Auth,
            "dev auth callback server marked running but unreachable; restarting",
        );
        mark_dev_auth_callback_server_stopped("stale-running-flag");
    }

    if DEV_AUTH_CALLBACK_SERVER_RUNNING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        if dev_auth_callback_server_is_reachable() {
            log_info(
                LogArea::Auth,
                format!(
                    "dev auth callback server already running; deadline extended by {}s",
                    DEV_AUTH_CALLBACK_TTL.as_secs()
                ),
            );
            return Ok(DEV_AUTH_CALLBACK_URL.to_string());
        }

        mark_dev_auth_callback_server_stopped("start-race-unreachable");
    }

    let bind_timer = StartupPhaseTimer::start("dev_auth_callback_bind");
    let listener = TcpListener::bind(dev_auth_callback_addr()).map_err(|error| {
        DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
        format!("dev auth callback bind failed: {error}")
    })?;
    listener.set_nonblocking(true).map_err(|error| {
        DEV_AUTH_CALLBACK_SERVER_RUNNING.store(false, Ordering::SeqCst);
        format!("dev auth callback configure failed: {error}")
    })?;
    bind_timer.finish();
    log_info(
        LogArea::Auth,
        format!(
            "dev auth callback server listening: url={DEV_AUTH_CALLBACK_URL} ttl_seconds={} deadline_in_ms={}",
            DEV_AUTH_CALLBACK_TTL.as_secs(),
            deadline.saturating_duration_since(Instant::now()).as_millis()
        ),
    );

    thread::spawn(move || {
        let result = serve_dev_auth_callback(app, listener);
        if let Err(error) = result {
            log_error(
                LogArea::Auth,
                format!("dev auth callback server failed: {error}"),
            );
        }
        mark_dev_auth_callback_server_stopped("serve-loop-exited");
    });

    Ok(DEV_AUTH_CALLBACK_URL.to_string())
}

pub fn auth_callback_url_from_argv<I, S>(args: I) -> Option<String>
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

fn store_pending_auth_callback(url: impl Into<String>) -> bool {
    if let Ok(mut pending) = PENDING_AUTH_CALLBACK_URL.lock() {
        let replaced = pending.is_some();
        *pending = Some(url.into());
        return replaced;
    }
    false
}

fn take_pending_auth_callback() -> Option<String> {
    PENDING_AUTH_CALLBACK_URL
        .lock()
        .ok()
        .and_then(|mut pending| pending.take())
}

fn can_consume_pending_auth_callback(window_label: &str) -> bool {
    window_label == "main"
}

fn extend_dev_auth_callback_deadline(now: Instant) -> Instant {
    let deadline = now + DEV_AUTH_CALLBACK_TTL;
    if let Ok(mut stored) = DEV_AUTH_CALLBACK_SERVER_DEADLINE.lock() {
        *stored = Some(deadline);
    }
    deadline
}

fn clear_dev_auth_callback_deadline() {
    if let Ok(mut stored) = DEV_AUTH_CALLBACK_SERVER_DEADLINE.lock() {
        *stored = None;
    }
}

fn dev_auth_callback_deadline_expired(now: Instant) -> bool {
    DEV_AUTH_CALLBACK_SERVER_DEADLINE
        .lock()
        .ok()
        .and_then(|deadline| *deadline)
        .is_none_or(|deadline| now >= deadline)
}

fn serve_dev_auth_callback(app: tauri::AppHandle, listener: TcpListener) -> std::io::Result<()> {
    loop {
        if dev_auth_callback_deadline_expired(Instant::now()) {
            log_info(LogArea::Auth, "dev auth callback server deadline reached");
            return Ok(());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                if let Err(error) = stream.set_nonblocking(false) {
                    log_error(
                        LogArea::Auth,
                        format!("dev auth callback stream configure failed: {error}"),
                    );
                    continue;
                }

                match handle_dev_auth_callback_stream(&app, &mut stream) {
                    Ok(true) => return Ok(()),
                    Ok(false) => {}
                    Err(error) if is_transient_io_error(&error) => {
                        log_info(
                            LogArea::Auth,
                            format!("dev auth callback transient stream error ignored: {error}"),
                        );
                    }
                    Err(error) => {
                        log_error(
                            LogArea::Auth,
                            format!("dev auth callback stream error ignored: {error}"),
                        );
                    }
                }
            }
            Err(error) if is_transient_io_error(&error) => {
                thread::sleep(Duration::from_millis(DEV_AUTH_CALLBACK_ACCEPT_POLL_MS));
            }
            Err(error) => return Err(error),
        }
    }
}

fn read_http_request(stream: &mut TcpStream) -> std::io::Result<String> {
    stream.set_read_timeout(Some(DEV_AUTH_CALLBACK_READ_TIMEOUT))?;
    let mut buffer = Vec::with_capacity(512);

    loop {
        let mut chunk = [0_u8; 1024];
        match stream.read(&mut chunk) {
            Ok(0) => break,
            Ok(bytes_read) => {
                buffer.extend_from_slice(&chunk[..bytes_read]);
                if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
                    break;
                }
                if buffer.len() >= 8192 {
                    break;
                }
            }
            Err(error) if error.kind() == ErrorKind::TimedOut => break,
            Err(error) if is_transient_io_error(&error) => {
                thread::sleep(Duration::from_millis(10));
            }
            Err(error) => return Err(error),
        }
    }

    Ok(String::from_utf8_lossy(&buffer).into_owned())
}

fn handle_dev_auth_callback_stream(
    app: &tauri::AppHandle,
    stream: &mut TcpStream,
) -> std::io::Result<bool> {
    let request = read_http_request(stream)?;

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

fn is_supported_app_auth_callback_url(url: &str) -> bool {
    let Some(query_start) = url.find('?') else {
        return false;
    };
    let callback_url = &url[..query_start];
    if callback_url != APP_AUTH_CALLBACK_URL && callback_url != PRODUCTION_WEB_AUTH_CALLBACK_URL {
        return false;
    }
    url[query_start + 1..]
        .split('&')
        .any(|part| part.starts_with("code=") && part.len() > "code=".len())
}

fn write_dev_auth_callback_empty(stream: &mut TcpStream) -> std::io::Result<()> {
    stream.write_all(b"HTTP/1.1 204 No Content\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
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
        500 => "Internal Server Error",
        _ => "OK",
    };
    let body = dev_auth_callback_html(DEV_AUTH_CALLBACK_URL, status, message);
    let response = format!(
        "HTTP/1.1 {status} {status_text}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(response.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn extracts_production_web_auth_callback_from_single_instance_argv() {
        let args = vec![
            "/Applications/Amadeus.app/Contents/MacOS/Amadeus".to_string(),
            "https://amadeus0.kro.kr/auth/callback?code=oauth-code&state=state".to_string(),
        ];

        assert_eq!(
            auth_callback_url_from_argv(args),
            Some("https://amadeus0.kro.kr/auth/callback?code=oauth-code&state=state".to_string())
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
        assert_eq!(
            auth_callback_url_from_argv(vec![
                "https://evil.amadeus0.kro.kr/auth/callback?code=oauth-code"
            ]),
            None
        );
        assert_eq!(
            auth_callback_url_from_argv(vec![
                "http://amadeus0.kro.kr/auth/callback?code=oauth-code"
            ]),
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

    #[test]
    fn pending_auth_callback_can_only_be_consumed_by_main_window() {
        assert!(can_consume_pending_auth_callback("main"));
        assert!(!can_consume_pending_auth_callback("companion"));
        assert!(!can_consume_pending_auth_callback("settings"));
    }

    #[test]
    fn dev_auth_callback_deadline_extends_on_reuse() {
        clear_dev_auth_callback_deadline();
        let now = Instant::now();
        let first = extend_dev_auth_callback_deadline(now);
        let second = extend_dev_auth_callback_deadline(now + Duration::from_secs(60));

        assert!(second > first);
        assert!(!dev_auth_callback_deadline_expired(
            second - Duration::from_millis(1)
        ));
        assert!(dev_auth_callback_deadline_expired(second));
        clear_dev_auth_callback_deadline();
    }
}
