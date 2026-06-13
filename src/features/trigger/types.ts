import type { MacosContextSnapshot, PrivacyAssessment } from "../context/types";
import type { ContextEvent, UtteranceEvent } from "../timeline/types";

export type TriggerType = "deep_pause" | "milestone" | "drift";

export type TriggerAction =
  | "no_action"
  | "status_only"
  | "bubble"
  | "conversation";

export type TriggerCandidate = {
  triggerType: TriggerType;
  message: string;
  reason: string;
  baseScore: number;
};

export type TriggerEvaluation = {
  candidate: TriggerCandidate | null;
  speakabilityScore: number;
  action: TriggerAction;
  shouldPersist: boolean;
  suppressionReason: string | null;
};

export type TriggerRunResult = {
  snapshot: MacosContextSnapshot;
  privacy: PrivacyAssessment;
  evaluation: TriggerEvaluation;
  contextEvent: ContextEvent | null;
  utteranceEvent: UtteranceEvent | null;
};

export type TriggerPollDecision = {
  ready: boolean;
  waitSeconds: number;
  suppressionReason: string | null;
};

export type TriggerPollResult = {
  didEvaluate: boolean;
  decision: TriggerPollDecision;
  runResult: TriggerRunResult | null;
};

export type TriggerRuntimeSnapshot = {
  recentUtteranceMinutesAgo: number | null;
  dismissedRecentCount: number;
  utterancesToday: number;
};
