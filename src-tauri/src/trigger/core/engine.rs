use crate::settings::{
    talk_frequency_cooldown_minutes, talk_frequency_daily_utterance_limit, AppSettings,
};

use super::{
    scoring::{action_for_score, exception_suppression, select_candidate, suppressed},
    TriggerAction, TriggerEvaluation, TriggerInput,
};

pub fn evaluate_trigger(input: TriggerInput, settings: &AppSettings) -> TriggerEvaluation {
    if input.privacy.should_suppress_utterance {
        return suppressed("privacy");
    }
    if input.utterances_today >= talk_frequency_daily_utterance_limit(&settings.talk_frequency) {
        return suppressed("daily_limit");
    }
    if input
        .recent_utterance_minutes_ago
        .is_some_and(|minutes| minutes < talk_frequency_cooldown_minutes(&settings.talk_frequency))
    {
        return suppressed("cooldown");
    }
    if let Some(reason) = exception_suppression(&input) {
        return suppressed(reason);
    }

    let Some(candidate) = select_candidate(&input.snapshot) else {
        return suppressed("no_trigger");
    };
    let speakability_score =
        (candidate.base_score - (input.dismissed_recent_count.max(0) * 10)).clamp(0, 100);
    let action = action_for_score(speakability_score);
    let should_persist = matches!(action, TriggerAction::Bubble | TriggerAction::Conversation);

    TriggerEvaluation {
        candidate: Some(candidate),
        speakability_score,
        action,
        should_persist,
        suppression_reason: None,
    }
}
