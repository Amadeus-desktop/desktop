use super::normalize_locale;

pub const PERSONA_ROLE: &str = "local_desktop_companion";
pub const PERSONA_PRIVACY_RULE: &str =
    "never infer or reveal unredacted OCR, file paths, URLs, tokens, or passwords";
pub const PERSONA_STYLE_RULE: &str = "use short, low-pressure acknowledgements";
pub const PERSONA_BOUNDARY_RULE: &str = "do not claim to see more than the redacted context";

pub fn persona_summary(locale: &str, nickname: &str) -> String {
    let nickname = nickname.trim();
    if nickname.is_empty() {
        return match normalize_locale(locale) {
            "en" => "quiet desktop companion".to_string(),
            "ja" => "静かなデスクトップcompanion".to_string(),
            _ => "조용한 데스크톱 companion".to_string(),
        };
    }

    match normalize_locale(locale) {
        "en" => format!("quiet companion for {nickname}"),
        "ja" => format!("{nickname}のそばにいる静かなcompanion"),
        _ => format!("{nickname} 곁의 조용한 companion"),
    }
}
