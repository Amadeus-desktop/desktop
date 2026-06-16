use std::process::Command;

use super::types::{BrowserTabContext, BrowserUrlClass};

pub(super) fn read_browser_tab_context(
    app_name: &str,
    bundle_identifier: &str,
) -> Option<BrowserTabContext> {
    if !is_google_chrome(app_name, bundle_identifier) {
        return None;
    }

    let url = read_chrome_active_tab_url()?;
    let (host, url_class) = classify_browser_url(&url);
    Some(BrowserTabContext {
        browser_name: "Google Chrome".to_string(),
        url_host: host,
        url_class,
        source: "chrome_apple_script".to_string(),
    })
}

pub(crate) fn classify_browser_url(url: &str) -> (Option<String>, BrowserUrlClass) {
    let lower = url.trim().to_ascii_lowercase();
    let without_scheme = lower
        .split_once("://")
        .map(|(_, rest)| rest)
        .unwrap_or(lower.as_str());
    let host = without_scheme
        .split(['/', '?', '#'])
        .next()
        .filter(|value| !value.is_empty())
        .map(|value| value.trim_start_matches("www.").to_string());
    let path = without_scheme
        .split_once('/')
        .map(|(_, rest)| format!("/{rest}"))
        .unwrap_or_default();
    let url_class = match host.as_deref() {
        Some(host) if is_work_host(host) => BrowserUrlClass::Work,
        Some(host) if is_video_host(host) || is_video_path(&path) => BrowserUrlClass::Video,
        _ => BrowserUrlClass::Unknown,
    };

    (host, url_class)
}

fn is_google_chrome(app_name: &str, bundle_identifier: &str) -> bool {
    app_name.eq_ignore_ascii_case("Google Chrome")
        || bundle_identifier.eq_ignore_ascii_case("com.google.Chrome")
}

fn is_work_host(host: &str) -> bool {
    [
        "github.com",
        "gitlab.com",
        "docs.google.com",
        "drive.google.com",
        "notion.so",
        "atlassian.net",
        "jira.com",
        "linear.app",
        "stackoverflow.com",
        "stackexchange.com",
        "figma.com",
    ]
    .iter()
    .any(|needle| host == *needle || host.ends_with(&format!(".{needle}")))
}

fn is_video_host(host: &str) -> bool {
    [
        "youtube.com",
        "youtu.be",
        "netflix.com",
        "twitch.tv",
        "disneyplus.com",
        "hulu.com",
        "vimeo.com",
        "crunchyroll.com",
    ]
    .iter()
    .any(|needle| host == *needle || host.ends_with(&format!(".{needle}")))
}

fn is_video_path(path: &str) -> bool {
    path.starts_with("/watch")
        || path.contains("/video/")
        || path.contains("/videos/")
        || path.contains("/player/")
}

#[cfg(target_os = "macos")]
fn read_chrome_active_tab_url() -> Option<String> {
    let output = Command::new("osascript")
        .args([
            "-e",
            "tell application \"Google Chrome\" to get URL of active tab of front window",
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    let url = String::from_utf8(output.stdout).ok()?.trim().to_string();
    (!url.is_empty()).then_some(url)
}

#[cfg(not(target_os = "macos"))]
fn read_chrome_active_tab_url() -> Option<String> {
    None
}
