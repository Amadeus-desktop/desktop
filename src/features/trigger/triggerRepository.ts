import { invoke } from "@tauri-apps/api/core";
import { getPrivacyKeywords, getTalkFrequencyPolicy } from "../../domain/settings";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import { getAppSettingsSnapshot } from "../settings/appSettingsStore";
import { assessCurrentPrivacyContext } from "../context";
import { createContextEvent, createUtteranceEvent } from "../timeline";
import type {
  TriggerAction,
  TriggerCandidate,
  TriggerPollResult,
  TriggerRunResult,
  TriggerRuntimeSnapshot,
} from "./types";

let mockLastUtteranceAt: number | null = null;
let mockLastPollAt: number | null = null;
let mockDismissedRecentCount = 0;
let mockUtterancesToday = 0;

function readTriggerSettings() {
  const { settings } = getAppSettingsSnapshot();

  return {
    keywords: getPrivacyKeywords(
      settings.privacyFilterEnabled,
      settings.customPrivacyKeywords,
    ),
    policy: getTalkFrequencyPolicy(settings.talkFrequency),
    proactiveTriggerEnabled: settings.proactiveTriggerEnabled,
  };
}

export async function runTriggerEngineOnce(
  keywords: string[] = readTriggerSettings().keywords,
): Promise<TriggerRunResult> {
  if (isTauriRuntime()) {
    return invoke<TriggerRunResult>("run_trigger_engine_once", { keywords });
  }

  const triggerSettings = readTriggerSettings();
  if (!triggerSettings.proactiveTriggerEnabled) {
    return buildSuppressedResult("proactive_disabled");
  }

  const context = await assessCurrentPrivacyContext(keywords);
  const recentUtteranceMinutesAgo = mockLastUtteranceAt
    ? Math.floor((Date.now() - mockLastUtteranceAt) / 1000 / 60)
    : null;

  const candidate: TriggerCandidate = {
    triggerType: "deep_pause",
    message: "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.",
    reason: "browser_mock_deep_pause",
    baseScore: 72,
  };
  const suppressed =
    context.assessment.shouldSuppressUtterance ||
    mockUtterancesToday >= triggerSettings.policy.dailyUtteranceLimit ||
    (recentUtteranceMinutesAgo !== null &&
      recentUtteranceMinutesAgo < triggerSettings.policy.cooldownMinutes);
  const speakabilityScore = Math.max(
    0,
    Math.min(100, candidate.baseScore - mockDismissedRecentCount * 10),
  );
  const action = suppressed ? "no_action" : actionForScore(speakabilityScore);
  const shouldPersist = action === "bubble" || action === "conversation";

  const evaluation = {
    candidate: suppressed ? null : candidate,
    speakabilityScore: suppressed ? 0 : speakabilityScore,
    action,
    shouldPersist,
    suppressionReason: suppressed ? "browser_mock_suppressed" : null,
  };

  if (!shouldPersist) {
    return {
      snapshot: context.snapshot,
      privacy: context.assessment,
      evaluation,
      contextEvent: null,
      utteranceEvent: null,
    };
  }

  const contextEvent = await createContextEvent({
    appName: context.snapshot.appName,
    windowTitle: context.assessment.redactedWindowTitle,
    eventType: "trigger_context_snapshot",
    metadataJson: JSON.stringify({
      trigger: candidate,
      privacy: context.assessment,
    }),
  });
  const utteranceEvent = await createUtteranceEvent({
    triggerType: candidate.triggerType,
    speakabilityScore,
    message: candidate.message,
    provider: "template",
    contextEventId: contextEvent.id,
  });

  mockLastUtteranceAt = Date.now();
  mockUtterancesToday += 1;

  return {
    snapshot: context.snapshot,
    privacy: context.assessment,
    evaluation,
    contextEvent,
    utteranceEvent,
  };
}

export async function pollTriggerEngine(
  keywords: string[] = readTriggerSettings().keywords,
): Promise<TriggerPollResult> {
  if (isTauriRuntime()) {
    return invoke<TriggerPollResult>("poll_trigger_engine", { keywords });
  }

  const triggerSettings = readTriggerSettings();
  if (!triggerSettings.proactiveTriggerEnabled) {
    return {
      didEvaluate: false,
      decision: {
        ready: false,
        waitSeconds: 0,
        suppressionReason: "proactive_disabled",
      },
      runResult: null,
    };
  }

  const now = Date.now();
  if (
    mockLastPollAt &&
    now - mockLastPollAt < triggerSettings.policy.pollIntervalMs
  ) {
    return {
      didEvaluate: false,
      decision: {
        ready: false,
        waitSeconds: Math.max(
          1,
          Math.ceil(
            (triggerSettings.policy.pollIntervalMs - (now - mockLastPollAt)) /
              1000,
          ),
        ),
        suppressionReason: "poll_cadence",
      },
      runResult: null,
    };
  }

  mockLastPollAt = now;

  return {
    didEvaluate: true,
    decision: {
      ready: true,
      waitSeconds: 0,
      suppressionReason: null,
    },
    runResult: await runTriggerEngineOnce(keywords),
  };
}

async function buildSuppressedResult(
  reason: string,
): Promise<TriggerRunResult> {
  const context = await assessCurrentPrivacyContext(readTriggerSettings().keywords);

  return {
    snapshot: context.snapshot,
    privacy: context.assessment,
    evaluation: {
      candidate: null,
      speakabilityScore: 0,
      action: "no_action",
      shouldPersist: false,
      suppressionReason: reason,
    },
    contextEvent: null,
    utteranceEvent: null,
  };
}

export async function recordTriggerReactionForScoring(
  reactionType: string,
): Promise<TriggerRuntimeSnapshot> {
  if (isTauriRuntime()) {
    return invoke<TriggerRuntimeSnapshot>(
      "record_trigger_reaction_for_scoring",
      { reactionType },
    );
  }

  if (reactionType === "dismissed" || reactionType === "closed") {
    mockDismissedRecentCount = Math.min(mockDismissedRecentCount + 1, 5);
  }

  if (reactionType === "opened" || reactionType === "replied") {
    mockDismissedRecentCount = 0;
  }

  return {
    recentUtteranceMinutesAgo: mockLastUtteranceAt
      ? Math.floor((Date.now() - mockLastUtteranceAt) / 1000 / 60)
      : null,
    dismissedRecentCount: mockDismissedRecentCount,
    utterancesToday: mockUtterancesToday,
  };
}

function actionForScore(score: number): TriggerAction {
  if (score >= 80) return "conversation";
  if (score >= 60) return "bubble";
  if (score >= 40) return "status_only";
  return "no_action";
}
