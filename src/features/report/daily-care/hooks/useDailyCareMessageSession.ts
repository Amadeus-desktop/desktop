import { useCallback, useEffect, useRef, useState } from "react";
import type { Persona } from "../../../../domain/persona/types";
import type { AppLocale } from "../../../../i18n";
import { logger } from "../../../../observability/logger";
import { persistCompanionMessage } from "../../../companion/lib/conversationPersistence";
import type { CompanionMessage } from "../../../companion/types";
import type { GeneralSettings } from "../../../settings/types";
import type { DailyCareInsight, ReportMetric } from "../../types";
import { buildDailyCarePhases, type DailyCarePhase } from "../lib/phases";
import {
  DAILY_CARE_INTER_BUBBLE_MS,
  DAILY_CARE_PRE_LLM_PAUSE_MS,
  generateDailyCareBeat,
  typingDelayMs,
} from "../lib/llm";
import type { DailyCareReply, DailyCareThreadMessage } from "../lib/messageScript";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function dailyCareMessageId(prefix: string, phaseIndex: number, id: string, index = 0) {
  return `daily-care-${prefix}-${Date.now()}-${phaseIndex}-${index}-${id}`;
}

function persistDailyCareTextMessage(persona: Persona, message: DailyCareThreadMessage) {
  if (message.kind !== "text") return;

  const companionMessage: CompanionMessage = {
    id: message.id,
    sender: message.sender,
    text: message.text,
  };

  void persistCompanionMessage({
    personaId: persona.id,
    message: companionMessage,
    role: message.sender === "user" ? "user" : "assistant",
    provider: message.sender === "user" ? null : "daily-care",
  }).catch((error) => {
    logger.warn("ui", "daily care conversation persistence failed", { error });
  });
}

function withSessionMessageId(
  message: DailyCareThreadMessage,
  phaseIndex: number,
  index: number,
): DailyCareThreadMessage {
  return {
    ...message,
    id: dailyCareMessageId(message.sender, phaseIndex, message.id, index),
  };
}

type UseDailyCareMessageSessionOptions = {
  insight: DailyCareInsight;
  metrics: ReportMetric[];
  labels: AppLocale["report"];
  persona: Persona;
  settings: GeneralSettings;
  prefersReducedMotion: boolean;
  onComplete: () => void;
};

export function useDailyCareMessageSession({
  insight,
  metrics,
  labels,
  persona,
  settings,
  prefersReducedMotion,
  onComplete,
}: UseDailyCareMessageSessionOptions) {
  const phasesRef = useRef<DailyCarePhase[]>(buildDailyCarePhases(insight));
  const insightRef = useRef(insight);
  const labelsRef = useRef(labels);
  const metricsRef = useRef(metrics);
  const personaRef = useRef(persona);
  const settingsRef = useRef(settings);

  insightRef.current = insight;
  labelsRef.current = labels;
  metricsRef.current = metrics;
  personaRef.current = persona;
  settingsRef.current = settings;

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [messages, setMessages] = useState<DailyCareThreadMessage[]>([]);
  const [replies, setReplies] = useState<DailyCareReply[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const messagesRef = useRef(messages);
  const revealTokenRef = useRef(0);

  messagesRef.current = messages;

  useEffect(() => {
    const revealToken = ++revealTokenRef.current;
    let cancelled = false;

    async function revealPhase() {
      const phase = phasesRef.current[phaseIndex];
      if (!phase) return;

      setReplies([]);
      setIsTyping(true);

      if (!prefersReducedMotion) {
        await sleep(DAILY_CARE_PRE_LLM_PAUSE_MS);
      }
      if (cancelled || revealTokenRef.current !== revealToken) return;

      const history = messagesRef.current;
      const latestUserReply = [...history]
        .reverse()
        .find(
          (message): message is Extract<DailyCareThreadMessage, { kind: "text" }> =>
            message.sender === "user" && message.kind === "text",
        )?.text;

      const beat = await generateDailyCareBeat({
        phase,
        phaseIndex,
        totalPhases: phasesRef.current.length,
        insight: insightRef.current,
        metrics: metricsRef.current,
        labels: labelsRef.current,
        persona: personaRef.current,
        settings: settingsRef.current,
        history,
        latestUserReply,
      });

      for (const [index, item] of beat.messages.entries()) {
        if (cancelled || revealTokenRef.current !== revealToken) return;

        if (index > 0 && !prefersReducedMotion) {
          await sleep(DAILY_CARE_INTER_BUBBLE_MS);
        }
        if (cancelled || revealTokenRef.current !== revealToken) return;

        const preview = item.kind === "text" ? item.text : item.lead;
        const delay = typingDelayMs(preview, prefersReducedMotion);

        if (delay > 0) {
          setIsTyping(true);
          await sleep(delay);
        }
        if (cancelled || revealTokenRef.current !== revealToken) return;

        const sessionItem = withSessionMessageId(item, phaseIndex, index);
        setMessages((current) => [...current, sessionItem]);
        persistDailyCareTextMessage(personaRef.current, sessionItem);
      }

      if (cancelled || revealTokenRef.current !== revealToken) return;
      setIsTyping(false);
      setReplies(beat.replies.slice(0, 2));
    }

    void revealPhase();

    return () => {
      cancelled = true;
    };
  }, [phaseIndex, prefersReducedMotion]);

  const selectReply = useCallback(
    (reply: DailyCareReply) => {
      const userMessage: DailyCareThreadMessage = {
        id: dailyCareMessageId("user", phaseIndex, reply.id, messagesRef.current.length),
        sender: "user",
        kind: "text",
        text: reply.label,
      };

      setMessages((current) => [
        ...current,
        userMessage,
      ]);
      persistDailyCareTextMessage(personaRef.current, userMessage);
      setReplies([]);

      if (phaseIndex >= phasesRef.current.length - 1) {
        window.setTimeout(onComplete, prefersReducedMotion ? 0 : 720);
        return;
      }

      setPhaseIndex((index) => index + 1);
    },
    [onComplete, phaseIndex, prefersReducedMotion],
  );

  const submitCustomReply = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      selectReply({ id: "custom", label: trimmed });
    },
    [selectReply],
  );

  return {
    messages,
    replies,
    isTyping,
    selectReply,
    submitCustomReply,
  };
}
