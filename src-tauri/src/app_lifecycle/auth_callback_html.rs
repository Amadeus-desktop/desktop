pub(super) fn dev_auth_callback_html(callback_url: &str, status: u16, message: &str) -> String {
    if status == 200 && message == "Amadeus auth callback ready" {
        return dev_auth_callback_waiting_html(callback_url);
    }
    if status == 200 && message == "Amadeus login completed" {
        return dev_auth_callback_success_html();
    }
    if status == 404 {
        return dev_auth_callback_not_found_html();
    }
    dev_auth_callback_error_html(message)
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

fn dev_auth_callback_waiting_html(callback_url: &str) -> String {
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
        escape_html(callback_url)
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

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
