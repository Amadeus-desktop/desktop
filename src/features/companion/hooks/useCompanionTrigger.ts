import { useEffect, useRef } from "react";
import { getPrivacyKeywords } from "../../../domain/settings";
import { getTalkFrequencyPolicy } from "../../../domain/settings/policy";
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

  useEffect(() => {
    if (!enabled) {
      lastUtteranceIdRef.current = null;
      return;
    }

    let cancelled = false;
    const keywords = getPrivacyKeywords(
      settings.privacyFilterEnabled,
      settings.customPrivacyKeywords,
    );
    const pollIntervalMs = getTalkFrequencyPolicy(
      settings.talkFrequency,
    ).pollIntervalMs;

    async function evaluateTrigger() {
      if (!canPresent) return;

      const pollResult = await pollTriggerEngine(keywords);
      if (cancelled || !pollResult.didEvaluate || !pollResult.runResult) {
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
    }

    void evaluateTrigger();

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void evaluateTrigger();
    }, pollIntervalMs);

    function handleVisibilityChange() {
      if (!document.hidden) {
        void evaluateTrigger();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    canPresent,
    enabled,
    settings.customPrivacyKeywords,
    settings.privacyFilterEnabled,
    settings.talkFrequency,
  ]);
}
