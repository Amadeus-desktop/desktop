use super::AppCategory;

pub fn classify_app(bundle_identifier: &str, display_name: &str) -> AppCategory {
    let bundle_identifier = bundle_identifier.to_ascii_lowercase();
    let display_name = display_name.to_ascii_lowercase();
    let haystack = format!("{bundle_identifier} {display_name}");

    if contains_any(
        &haystack,
        &[
            "youtube",
            "netflix",
            "twitch",
            "disney",
            "spotify",
            "instagram",
            "x.com",
            "twitter",
        ],
    ) {
        return AppCategory::NonWork;
    }

    if contains_any(
        &haystack,
        &[
            "visual studio code",
            "vscode",
            "xcode",
            "cursor",
            "intellij",
            "zed",
            "terminal",
            "iterm",
            "com.apple.dt.xcode",
            "com.microsoft.vscode",
            "com.todesktop.230313mzl4w4u92",
            "hwp",
            "한글",
            "pages",
            "notion",
            "slack",
            "com.tinyspeck.slackmacgap",
            "figma",
            "com.figma.desktop",
            "discord",
            "jira",
            "github",
            "gitlab",
            "stack overflow",
            "stackoverflow",
            "confluence",
            "linear",
            "google docs",
            "google sheets",
            "google slides",
        ],
    ) {
        return AppCategory::Work;
    }

    AppCategory::Unknown
}

fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| haystack.contains(needle))
}
