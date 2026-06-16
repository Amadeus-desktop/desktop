use crate::ocr::OcrContextClass;
use crate::settings::{
    talk_frequency_cooldown_minutes, talk_frequency_daily_utterance_limit,
    talk_frequency_trigger_sensitivity, AppSettings,
};

use super::{
    scoring::{
        action_for_score, apply_ocr_signal_to_evaluation, exception_suppression, select_candidate,
        select_unknown_ocr_candidate, select_work_cluster_candidate,
        select_work_session_milestone_candidate, should_suppress_active_input_milestone,
        should_suppress_away_idle, suppressed,
    },
    TriggerAction, TriggerEvaluation, TriggerInput,
};

#[cfg(test)]
pub(crate) fn evaluate_trigger(input: TriggerInput, settings: &AppSettings) -> TriggerEvaluation {
    evaluate_trigger_with_ocr(input, settings, None)
}

#[cfg(test)]
pub(crate) fn evaluate_trigger_with_ocr(
    input: TriggerInput,
    settings: &AppSettings,
    redacted_ocr_summary: Option<&str>,
) -> TriggerEvaluation {
    evaluate_trigger_with_ocr_context(input, settings, redacted_ocr_summary, None)
}

pub(crate) fn evaluate_trigger_with_ocr_context(
    input: TriggerInput,
    settings: &AppSettings,
    redacted_ocr_summary: Option<&str>,
    ocr_context_class: Option<OcrContextClass>,
) -> TriggerEvaluation {
    let sensitivity = talk_frequency_trigger_sensitivity(&settings.talk_frequency);

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
    if input.repeated_app_utterance_blocked {
        return suppressed("repeated_app_utterance");
    }
    if should_suppress_away_idle(&input) {
        return suppressed("away_idle");
    }
    if should_suppress_active_input_milestone(&input, sensitivity) {
        return suppressed("active_input_guard");
    }
    if let Some(reason) = exception_suppression(&input) {
        return suppressed(reason);
    }

    let Some(candidate) = select_candidate(&input.snapshot, sensitivity)
        .or_else(|| {
            select_work_cluster_candidate(&input.snapshot, input.history.as_ref(), sensitivity)
        })
        .or_else(|| {
            select_work_session_milestone_candidate(
                &input.snapshot,
                input.work_session_duration_ms,
                sensitivity,
            )
        })
        .or_else(|| {
            select_unknown_ocr_candidate(
                &input.snapshot,
                ocr_context_class,
                input.history.as_ref(),
                sensitivity,
            )
        })
    else {
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
