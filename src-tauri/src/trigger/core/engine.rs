use crate::settings::{
    talk_frequency_cooldown_minutes, talk_frequency_daily_utterance_limit, AppSettings,
};

use super::{
    scoring::{
        action_for_score, apply_ocr_signal_to_evaluation, exception_suppression, select_candidate,
        select_ocr_candidate, should_probe_ocr_for_candidate, suppressed,
    },
    TriggerAction, TriggerEvaluation, TriggerInput,
};

#[cfg(test)]
pub(crate) fn evaluate_trigger(input: TriggerInput, settings: &AppSettings) -> TriggerEvaluation {
    evaluate_trigger_with_ocr(input, settings, None)
}

pub(crate) fn evaluate_trigger_with_ocr(
    input: TriggerInput,
    settings: &AppSettings,
    redacted_ocr_summary: Option<&str>,
) -> TriggerEvaluation {
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

    let Some(candidate) = select_candidate(&input.snapshot).or_else(|| {
        if should_probe_ocr_for_candidate(&input.snapshot, &input.privacy) {
            select_ocr_candidate(&input.snapshot, redacted_ocr_summary)
        } else {
            None
        }
    }) else {
        return suppressed("no_trigger");
    };
    let speakability_score =
        (candidate.base_score - (input.dismissed_recent_count.max(0) * 10)).clamp(0, 100);
    let action = action_for_score(speakability_score);
    let should_persist = matches!(action, TriggerAction::Bubble | TriggerAction::Conversation);

    let evaluation = TriggerEvaluation {
        candidate: Some(candidate),
        speakability_score,
        action,
        should_persist,
        suppression_reason: None,
    };

    apply_ocr_signal_to_evaluation(evaluation, redacted_ocr_summary)
}
