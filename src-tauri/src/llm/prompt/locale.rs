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

pub fn template_chat_empty(locale: &str) -> String {
    match normalize_locale(locale) {
        "en" => "Yeah. I am here.".to_string(),
        "ja" => "うん。ここにいるよ。".to_string(),
        _ => "응. 나 여기 있어.".to_string(),
    }
}

pub fn template_chat_reply(locale: &str) -> String {
    match normalize_locale(locale) {
        "en" => "Yeah. Take your time. I am here.".to_string(),
        "ja" => "うん。ゆっくりで大丈夫。ここにいるよ。".to_string(),
        _ => "응. 천천히 해도 괜찮아. 나 여기 있어.".to_string(),
    }
}
