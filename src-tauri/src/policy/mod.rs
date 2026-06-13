use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SuppressionReason {
    PrivacyHardDeny,
    PrivacyProcessOnly,
    CaptureValueTooLow,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyScores {
    pub privacy_risk_score: i64,
    pub context_confidence_score: i64,
    pub attention_stability_score: i64,
    pub capture_value_score: i64,
    pub speakability_score: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureDecision {
    pub allowed: bool,
    pub suppression_reason: Option<SuppressionReason>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrDecision {
    pub allowed: bool,
    pub suppression_reason: Option<SuppressionReason>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmGateDecision {
    pub allowed: bool,
    pub suppression_reason: Option<SuppressionReason>,
}

impl Default for PolicyScores {
    fn default() -> Self {
        Self {
            privacy_risk_score: 50,
            context_confidence_score: 40,
            attention_stability_score: 50,
            capture_value_score: 0,
            speakability_score: 0,
        }
    }
}

impl PolicyScores {
    fn privacy_suppression_reason(self) -> Option<SuppressionReason> {
        match self.privacy_risk_score {
            70..=i64::MAX => Some(SuppressionReason::PrivacyHardDeny),
            50..=69 => Some(SuppressionReason::PrivacyProcessOnly),
            _ => None,
        }
    }
}

impl CaptureDecision {
    pub fn from_scores(scores: PolicyScores) -> Self {
        if let Some(reason) = scores.privacy_suppression_reason() {
            return Self {
                allowed: false,
                suppression_reason: Some(reason),
            };
        }

        if scores.capture_value_score <= 0 {
            return Self {
                allowed: false,
                suppression_reason: Some(SuppressionReason::CaptureValueTooLow),
            };
        }

        Self {
            allowed: true,
            suppression_reason: None,
        }
    }
}

impl OcrDecision {
    pub fn from_scores(scores: PolicyScores) -> Self {
        let capture = CaptureDecision::from_scores(scores);
        Self {
            allowed: capture.allowed,
            suppression_reason: capture.suppression_reason,
        }
    }
}

impl LlmGateDecision {
    pub fn from_scores(scores: PolicyScores) -> Self {
        if let Some(reason) = scores.privacy_suppression_reason() {
            return Self {
                allowed: false,
                suppression_reason: Some(reason),
            };
        }

        Self {
            allowed: scores.speakability_score >= 60,
            suppression_reason: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_scores_default_safe() {
        let scores = PolicyScores::default();

        assert_eq!(scores.privacy_risk_score, 50);
        assert_eq!(scores.context_confidence_score, 40);
        assert_eq!(scores.attention_stability_score, 50);
        assert_eq!(scores.capture_value_score, 0);
        assert_eq!(scores.speakability_score, 0);
    }

    #[test]
    fn privacy_risk_hard_deny_blocks_capture_ocr_and_llm() {
        let scores = PolicyScores {
            privacy_risk_score: 70,
            context_confidence_score: 80,
            attention_stability_score: 80,
            capture_value_score: 80,
            speakability_score: 80,
        };

        let capture = CaptureDecision::from_scores(scores);
        let ocr = OcrDecision::from_scores(scores);
        let llm = LlmGateDecision::from_scores(scores);

        assert!(!capture.allowed);
        assert_eq!(
            capture.suppression_reason,
            Some(SuppressionReason::PrivacyHardDeny)
        );
        assert!(!ocr.allowed);
        assert_eq!(
            ocr.suppression_reason,
            Some(SuppressionReason::PrivacyHardDeny)
        );
        assert!(!llm.allowed);
        assert_eq!(
            llm.suppression_reason,
            Some(SuppressionReason::PrivacyHardDeny)
        );
    }
}
