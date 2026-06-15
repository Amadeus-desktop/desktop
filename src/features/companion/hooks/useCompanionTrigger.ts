import { useCallback, useEffect, useMemo, useRef } from "react";
import { getTalkFrequencyPolicy } from "../../../domain/settings/policy";
import { getPrivacyKeywords } from "../../../domain/settings";
import { useLifecycleFetch } from "../../../lib/useLifecycleFetch";
import { pollTriggerEngine } from "../../trigger/triggerRepository";
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
      if (!canPresent || !enabled) return;

      const keywords = getPrivacyKeywords(
        settings.privacyFilterEnabled,
        settings.customPrivacyKeywords,
      );

      const pollResult = await pollTriggerEngine(keywords).catch(() => null);
      if (!pollResult || !isActive()) {
        return;
      }
      if (!pollResult.didEvaluate || !pollResult.runResult) {
        return;
      }

      const { evaluation, utteranceEvent } = pollResult.runResult;
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
      onTriggerRef.current({
        message: utteranceEvent.message,
        utteranceEventId: utteranceEvent.id,
        action: evaluation.action,
      });
    },
    [
      canPresent,
      enabled,
      settings.customPrivacyKeywords,
      settings.privacyFilterEnabled,
    ],
  );

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
