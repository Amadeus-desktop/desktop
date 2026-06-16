use super::*;

#[test]
fn classifies_known_work_apps() {
    assert_eq!(
        classify_app("com.microsoft.VSCode", "Visual Studio Code"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.apple.dt.Xcode", "Xcode"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.mitchellh.ghostty", "Ghostty"),
        AppCategory::Work
    );
    assert_eq!(classify_app("", "한글"), AppCategory::Work);
}

#[test]
fn classifies_known_non_work_apps() {
    assert_eq!(
        classify_app("com.google.Chrome", "YouTube - Google Chrome"),
        AppCategory::NonWork
    );
    assert_eq!(classify_app("", "Netflix"), AppCategory::NonWork);
}

#[test]
fn classifies_browser_work_titles_as_work() {
    assert_eq!(
        classify_app("com.google.Chrome", "Jira AM-42 - Google Chrome"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.apple.Safari", "Stack Overflow - Safari"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.google.Chrome", "GitHub pull request - Google Chrome"),
        AppCategory::Work
    );
}

#[test]
fn keeps_browser_entertainment_titles_as_non_work() {
    assert_eq!(
        classify_app("com.google.Chrome", "YouTube - Google Chrome"),
        AppCategory::NonWork
    );
    assert_eq!(
        classify_app("com.apple.Safari", "Netflix - Safari"),
        AppCategory::NonWork
    );
}

#[test]
fn classifies_collaboration_and_design_apps_as_work() {
    assert_eq!(
        classify_app("com.tinyspeck.slackmacgap", "Slack"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.figma.Desktop", "Figma"),
        AppCategory::Work
    );
    assert_eq!(
        classify_app("com.hnc.Discord", "Discord"),
        AppCategory::Work
    );
}

#[test]
fn keeps_long_tail_and_ai_companion_titles_unknown_by_default() {
    assert_eq!(
        classify_app("com.google.Chrome", "tvwiki - Google Chrome"),
        AppCategory::Unknown
    );
    assert_eq!(
        classify_app("com.apple.Safari", "niconico - Safari"),
        AppCategory::Unknown
    );
    assert_eq!(
        classify_app("com.google.Chrome", "Zeta AI Chat - Google Chrome"),
        AppCategory::Unknown
    );
    assert_eq!(
        classify_app("com.google.Chrome", "LoveyDovey - Google Chrome"),
        AppCategory::Unknown
    );
}

#[test]
fn classifies_unknown_apps() {
    assert_eq!(
        classify_app("dev.unknown.App", "Unknown"),
        AppCategory::Unknown
    );
}

#[test]
fn classifies_browser_urls_without_relying_on_site_allowlist_for_unknowns() {
    assert_eq!(
        classify_browser_url("https://github.com/user/repo/pull/1"),
        (Some("github.com".to_string()), BrowserUrlClass::Work)
    );
    assert_eq!(
        classify_browser_url("https://www.youtube.com/watch?v=abc"),
        (Some("youtube.com".to_string()), BrowserUrlClass::Video)
    );
    assert_eq!(
        classify_browser_url("https://example.invalid/watch/episode-1"),
        (Some("example.invalid".to_string()), BrowserUrlClass::Video)
    );
    assert_eq!(
        classify_browser_url("https://anilife.example/title"),
        (
            Some("anilife.example".to_string()),
            BrowserUrlClass::Unknown
        )
    );
}
