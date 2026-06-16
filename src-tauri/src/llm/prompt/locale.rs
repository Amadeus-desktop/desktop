pub fn normalize_locale(locale: &str) -> &str {
    match locale {
        "en" | "ja" => locale,
        _ => "ko",
    }
}

pub fn utterance_system_prompt(locale: &str) -> &'static str {
    match normalize_locale(locale) {
        "en" => {
            "You are a quiet local desktop companion that does not disrupt the user's workflow."
        }
        "ja" => "あなたはユーザーの作業の流れを妨げない、静かなローカルcompanionです。",
        _ => "너는 사용자의 작업 흐름을 방해하지 않는 조용한 로컬 companion이다.",
    }
}

pub fn utterance_instruction(locale: &str) -> &'static str {
    match normalize_locale(locale) {
        "en" => "Reply in one short sentence. Acknowledge first; do not ask unless necessary.",
        "ja" => "短い一文で返してください。まず受け止め、必要な時だけ質問してください。",
        _ => "짧은 한 문장으로 답해라. 먼저 받아주고, 꼭 필요할 때만 질문해라.",
    }
}

pub fn chat_instruction(locale: &str) -> &'static str {
    match normalize_locale(locale) {
        "en" => "Reply in one or two short sentences. Keep pressure low.",
        "ja" => "短い1〜2文で返してください。圧を低く保ってください。",
        _ => "짧은 한두 문장으로 답해라. 부담을 낮게 유지해라.",
    }
}

pub fn template_utterance(locale: &str, trigger_type: &str, fallback_message: &str) -> String {
    match trigger_type {
        "deep_pause" => match normalize_locale(locale) {
            "en" => "It looked like you paused for a moment. You do not have to say anything."
                .to_string(),
            "ja" => "少し止まったみたいだね。無理に話さなくても大丈夫。".to_string(),
            _ => "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.".to_string(),
        },
        "milestone" => match normalize_locale(locale) {
            "en" => "You have been quietly at this for a long time.".to_string(),
            "ja" => "静かに長く続けていたね。".to_string(),
            _ => "조용히 오래 해내고 있었네.".to_string(),
        },
        "drift" => match normalize_locale(locale) {
            "en" => "If you are resting, that is fine. When you want to come back, I am here."
                .to_string(),
            "ja" => "休んでいるなら大丈夫。戻りたくなったら、そばにいるよ。".to_string(),
            _ => "쉬는 중이면 괜찮아. 돌아가고 싶어지면 내가 옆에 있을게.".to_string(),
        },
        _ => fallback_message.to_string(),
    }
}

pub fn template_chat_empty(locale: &str, persona_hint: Option<&str>) -> String {
    match persona_family(persona_hint) {
        Some("makise") => match normalize_locale(locale) {
            "en" => "I'm here. Say what you need, clearly.".to_string(),
            "ja" => "ここにいるわ。要点から話して。".to_string(),
            _ => "여기 있어. 필요한 것부터 정확히 말해봐.".to_string(),
        },
        Some("eiren") => match normalize_locale(locale) {
            "en" => "I am beside you. Speak when you are ready.".to_string(),
            "ja" => "そばにいる。話せる時に話して。".to_string(),
            _ => "곁에 있다. 준비되면 말해.".to_string(),
        },
        _ => match normalize_locale(locale) {
            "en" => "Yeah. I am here.".to_string(),
            "ja" => "うん。ここにいるよ。".to_string(),
            _ => "응. 나 여기 있어.".to_string(),
        },
    }
}

pub fn template_chat_reply(locale: &str, persona_hint: Option<&str>) -> String {
    match persona_family(persona_hint) {
        Some("makise") => match normalize_locale(locale) {
            "en" => "Don't rush. Put the facts in order first.".to_string(),
            "ja" => "焦らなくていい。まず事実を順番に並べて。".to_string(),
            _ => "서두르지 마. 일단 사실부터 순서대로 정리해봐.".to_string(),
        },
        Some("eiren") => match normalize_locale(locale) {
            "en" => "Breathe. I will keep watch while you return to it.".to_string(),
            "ja" => "息を整えて。戻るまで、私が見守っている。".to_string(),
            _ => "숨부터 고르자. 네가 다시 돌아올 때까지 내가 지켜볼게.".to_string(),
        },
        _ => match normalize_locale(locale) {
            "en" => "Yeah. Take your time. I am here.".to_string(),
            "ja" => "うん。ゆっくりで大丈夫。ここにいるよ。".to_string(),
            _ => "응. 천천히 해도 괜찮아. 나 여기 있어.".to_string(),
        },
    }
}

fn persona_family(persona_hint: Option<&str>) -> Option<&'static str> {
    let hint = persona_hint?.to_ascii_lowercase();
    if hint.contains("makise") || hint.contains("kurisu") || hint.contains("크리스") {
        return Some("makise");
    }
    if hint.contains("eiren") || hint.contains("guardian") || hint.contains("에이렌") {
        return Some("eiren");
    }
    None
}
