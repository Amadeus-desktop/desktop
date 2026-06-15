use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};

use tauri::Emitter;

use crate::{
    app_lifecycle::startup::StartupPhaseTimer,
    observability::{error as log_error, info as log_info, LogArea},
};

const DEV_AUTH_CALLBACK_PORT: u16 = 17421;
const DEV_AUTH_CALLBACK_URL: &str = "http://127.0.0.1:17421/auth/callback";
const AUTH_CALLBACK_EVENT: &str = "amadeus-auth-callback";
static DEV_AUTH_CALLBACK_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static PENDING_AUTH_CALLBACK_URL: Mutex<Option<String>> = Mutex::new(None);

#[derive(Debug, Clone, serde::Serialize)]
pub struct AuthCallbackPayload {
    url: String,
}

pub fn route_auth_callback(app: &tauri::AppHandle, url: String) {
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
pub fn consume_pending_auth_callback() -> Option<AuthCallbackPayload> {
    take_pending_auth_callback().map(|url| AuthCallbackPayload { url })
}

#[tauri::command]
pub fn start_dev_auth_callback_server(app: tauri::AppHandle) -> Result<String, String> {
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
      color: #6ee7b7;
    }
    h1 {
      font-size: 20px;
      line-height: 1.25;
      margin-bottom: 10px;
    }
    p {
      color: #a1a1aa;
      font-size: 13px;
      line-height: 1.6;
    }
    .hint {
      margin-top: 20px;
      font-size: 11px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">Amadeus</div>
    <div class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>로그인이 완료되었습니다</h1>
    <p>이 창을 닫고 Amadeus 앱으로 돌아가도 됩니다.</p>
    <div class="hint">You can close this browser tab.</div>
  </main>
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
      width: min(100%, 380px);
      padding: 30px 26px;
      border-radius: 22px;
      border: 1px solid rgba(248, 113, 113, 0.24);
      background: rgba(248, 113, 113, 0.08);
      text-align: center;
    }}
    .eyebrow {{
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(252, 165, 165, 0.85);
      margin-bottom: 14px;
    }}
    h1 {{
      font-size: 18px;
      margin-bottom: 10px;
    }}
    p {{
      font-size: 13px;
      line-height: 1.6;
      color: #d4d4d8;
    }}
    code {{
      display: inline-block;
      margin-top: 14px;
      color: #fecaca;
      font-size: 12px;
      word-break: break-word;
    }}
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">Amadeus</div>
    <h1>로그인을 완료하지 못했습니다</h1>
    <p>앱으로 돌아가 다시 시도해 주세요.</p>
    <code>{}</code>
  </main>
</body>
</html>"#,
        escape_html(message)
    )
}

fn dev_auth_callback_waiting_html() -> String {
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
      background: radial-gradient(ellipse 90% 55% at 50% -15%, rgba(96, 165, 250, 0.14), transparent 65%), #09090b;
      color: #f4f4f5;
    }}
    .card {{
      width: min(100%, 380px);
      text-align: center;
      padding: 32px 28px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
    }}
    .eyebrow {{
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(147, 197, 253, 0.75);
      margin-bottom: 16px;
    }}
    h1 {{
      font-size: 20px;
      line-height: 1.25;
      margin-bottom: 10px;
    }}
    p {{
      color: #a1a1aa;
      font-size: 13px;
      line-height: 1.6;
    }}
    code {{
      display: inline-block;
      margin-top: 16px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      color: #bfdbfe;
      font-size: 12px;
      word-break: break-all;
    }}
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">Amadeus</div>
    <h1>Amadeus 로그인 대기 중</h1>
    <p>Google 로그인 후 이 창이 자동으로 완료됩니다.</p>
    <code>{}</code>
  </main>
</body>
</html>"#,
        DEV_AUTH_CALLBACK_URL
    )
}

fn dev_auth_callback_not_found_html() -> String {
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
      padding: 30px 26px;
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      text-align: center;
    }
    .eyebrow {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(147, 197, 253, 0.75);
      margin-bottom: 14px;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 10px;
    }
    p {
      color: #a1a1aa;
      font-size: 13px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">Amadeus</div>
    <h1>로그인 콜백 주소가 아닙니다</h1>
    <p>이 페이지는 Amadeus 개발 로그인 콜백 서버입니다.</p>
  </main>
</body>
</html>"#
        .to_string()
}

fn dev_auth_callback_html(status: u16, message: &str) -> String {
    if status == 200 && message == "Amadeus auth callback ready" {
        return dev_auth_callback_waiting_html();
    }
    if status == 200 && message == "Amadeus login completed" {
        return dev_auth_callback_success_html();
    }
    if status == 404 {
        return dev_auth_callback_not_found_html();
    }
    dev_auth_callback_error_html(message)
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
    let body = dev_auth_callback_html(status, message);
    let response = format!(
        "HTTP/1.1 {status} {status_text}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(response.as_bytes())
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
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
