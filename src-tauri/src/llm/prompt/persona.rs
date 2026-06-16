use super::normalize_locale;

pub const PERSONA_ROLE: &str = "local_desktop_companion";
pub const PERSONA_PRIVACY_RULE: &str =
    "never infer or reveal unredacted OCR, file paths, URLs, tokens, or passwords";
pub const PERSONA_STYLE_RULE: &str = "use short, low-pressure acknowledgements";
pub const PERSONA_BOUNDARY_RULE: &str = "do not claim to see more than the redacted context";

pub fn persona_summary(locale: &str, nickname: &str, persona_id: &str) -> String {
    let nickname = nickname.trim();
    let persona = persona_label(locale, persona_id);
    if nickname.is_empty() {
        return match normalize_locale(locale) {
            "en" => format!("{persona}; quiet desktop companion"),
            "ja" => format!("{persona}。静かなデスクトップcompanion"),
            _ => format!("{persona}; 조용한 데스크톱 companion"),
        };
    }

    match normalize_locale(locale) {
        "en" => format!("{persona}; quiet companion for {nickname}"),
        "ja" => format!("{persona}。{nickname}のそばにいる静かなcompanion"),
        _ => format!("{persona}; {nickname} 곁의 조용한 companion"),
    }
}

fn persona_label(locale: &str, persona_id: &str) -> &'static str {
    match (normalize_locale(locale), persona_id) {
        ("en", "makise-kurisu") => "Makise Kurisu, logical lab partner with restrained care",
        ("ja", "makise-kurisu") => "牧瀬紅莉栖、論理的だが配慮を忘れない研究室のパートナー",
        (_, "makise-kurisu") => {
            "마키세 크리스, 논리적이지만 선제 개입은 낮은 압력으로 하는 연구실 파트너"
        }
        ("en", "eiren-fantasy-guardian") => "Eiren, restrained fantasy guardian",
        ("ja", "eiren-fantasy-guardian") => "エイレン、控えめな幻想の守護者",
        (_, "eiren-fantasy-guardian") => "에이렌, 절제된 판타지 수호자",
        ("en", "seoyeon-modern-senior") => "Han Seoyeon, restrained warm modern senior",
        ("ja", "seoyeon-modern-senior") => "ハン・ソヨン、静かに温かい現代の先輩",
        _ => "한서연, 절제되고 따뜻한 현대 선배",
    }
}
