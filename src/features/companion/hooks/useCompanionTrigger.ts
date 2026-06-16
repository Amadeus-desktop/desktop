import { useCallback, useEffect, useMemo, useRef } from "react";
import { getTalkFrequencyPolicy } from "../../../domain/settings/policy";
import { getPrivacyKeywords } from "../../../domain/settings";
import { useLifecycleFetch } from "../../../lib/hooks/useLifecycleFetch";
import { logger } from "../../../observability/logger";
import { pollTriggerEngine } from "../../trigger";
import type { TriggerAction } from "../../trigger/types";
import type { GeneralSettings } from "../../settings/types";

type CompanionTriggerPayload = {
  message: string;
  utteranceEventId: string | null;
  action: TriggerAction;
};

type UseCompanionTriggerOptions = {
  enabled: boolean;
  settings: GeneralSettings;
  canPresent: boolean;
  onTrigger: (payload: CompanionTriggerPayload) => void;
};

const PRESENTABLE_ACTIONS = new Set<TriggerAction>(["bubble", "conversation"]);

type CompanionTriggerPollingState = "disabled" | "not_presentable" | "active";

export function getCompanionTriggerPollingState({
  enabled,
  canPresent,
}: Pick<UseCompanionTriggerOptions, "enabled" | "canPresent">): CompanionTriggerPollingState {
  if (!enabled) return "disabled";
  if (!canPresent) return "not_presentable";
  return "active";
}

export function useCompanionTrigger({
  enabled,
  settings,
  canPresent,
  onTrigger,
}: UseCompanionTriggerOptions) {
  const lastUtteranceIdRef = useRef<string | null>(null);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const pollIntervalMs = useMemo(
    () => getTalkFrequencyPolicy(settings.talkFrequency).pollIntervalMs,
    [settings.talkFrequency],
  );

  const evaluateTrigger = useCallback(
    async (isActive: () => boolean) => {
      const pollingState = getCompanionTriggerPollingState({
        enabled,
        canPresent,
      });

      if (pollingState !== "active") {
        logger.info("trigger", "companion trigger poll skipped", {
          state: pollingState,
          enabled,
          canPresent,
          proactiveTriggerEnabled: settings.proactiveTriggerEnabled,
        });
        return;
      }

      const keywords = getPrivacyKeywords(
        settings.privacyFilterEnabled,
        settings.customPrivacyKeywords,
      );

      logger.info("trigger", "companion trigger poll started", {
        pollIntervalMs,
        privacyKeywordCount: keywords.length,
      });

      const pollResult = await pollTriggerEngine(keywords).catch((error) => {
        logger.warn("trigger", "companion trigger poll failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      });
      if (!pollResult || !isActive()) {
        return;
      }
      if (!pollResult.didEvaluate || !pollResult.runResult) {
        logger.info("trigger", "companion trigger poll deferred", {
          ready: pollResult.decision.ready,
          waitSeconds: pollResult.decision.waitSeconds,
          suppressionReason: pollResult.decision.suppressionReason,
        });
        return;
      }

      const { evaluation, utteranceEvent } = pollResult.runResult;
      logger.info("trigger", "companion trigger evaluated", {
        action: evaluation.action,
        shouldPersist: evaluation.shouldPersist,
        candidateType: evaluation.candidate?.triggerType ?? null,
        candidateReason: evaluation.candidate?.reason ?? null,
        suppressionReason: evaluation.suppressionReason,
        hasUtterance: Boolean(utteranceEvent),
      });
      if (
        !evaluation.shouldPersist ||
        !utteranceEvent ||
        !PRESENTABLE_ACTIONS.has(evaluation.action)
      ) {
        return;
      }

      if (lastUtteranceIdRef.current === utteranceEvent.id) {
        return;
      }

      lastUtteranceIdRef.current = utteranceEvent.id;
      logger.info("trigger", "companion trigger presenting nudge", {
        utteranceEventId: utteranceEvent.id,
        action: evaluation.action,
      });
      onTriggerRef.current({
        message: utteranceEvent.message,
        utteranceEventId: utteranceEvent.id,
        action: evaluation.action,
      });
    },
    [
      canPresent,
      enabled,
      pollIntervalMs,
      settings.customPrivacyKeywords,
      settings.privacyFilterEnabled,
      settings.proactiveTriggerEnabled,
    ],
  );

  useEffect(() => {
    logger.info("trigger", "companion trigger polling configured", {
      state: getCompanionTriggerPollingState({ enabled, canPresent }),
      enabled,
      canPresent,
      proactiveTriggerEnabled: settings.proactiveTriggerEnabled,
      pollIntervalMs,
    });
  }, [canPresent, enabled, pollIntervalMs, settings.proactiveTriggerEnabled]);

  useEffect(() => {
    if (!enabled) {
      lastUtteranceIdRef.current = null;
    }
  }, [enabled]);

  useLifecycleFetch({
    enabled,
    intervalMs: pollIntervalMs,
    deps: [evaluateTrigger, pollIntervalMs],
    fetch: evaluateTrigger,
  });
}
