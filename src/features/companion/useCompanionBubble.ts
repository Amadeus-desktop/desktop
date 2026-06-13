import { useEffect, useRef, useState } from "react";
import { initialChatMessages, initialCompanionMessage } from "./companion";
import { createUserReaction } from "../timeline/timelineRepository";
import {
  pollTriggerEngine,
  recordTriggerReactionForScoring,
  runTriggerEngineOnce,
} from "../trigger/triggerRepository";
import { generateChatReply } from "../llm/llmRepository";
import type { TriggerRunResult } from "../trigger/types";

const TRIGGER_POLL_INTERVAL_MS = 60_000;

let initialTriggerPromise: Promise<TriggerRunResult> | null = null;

export function useCompanionBubble() {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState(initialCompanionMessage);
  const [messages, setMessages] = useState(initialChatMessages);
  const [draft, setDraft] = useState("");
  const [activeUtteranceId, setActiveUtteranceId] = useState<string | null>(
    null,
  );
  const uiStateRef = useRef({
    bubbleVisible: false,
    chatOpen: false,
  });

  useEffect(() => {
    uiStateRef.current = {
      bubbleVisible,
      chatOpen,
    };
  }, [bubbleVisible, chatOpen]);

  useEffect(() => {
    let cancelled = false;

    function presentTriggerResult(result: TriggerRunResult) {
      if (!result.utteranceEvent) return;

      const utterance = result.utteranceEvent;
      setMessage(utterance.message);
      setActiveUtteranceId(utterance.id);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: utterance.id,
          sender: "companion",
          text: utterance.message,
        },
      ]);
      setBubbleVisible(true);
    }

    async function requestInitialTrigger() {
      const result = await requestInitialTriggerOnce();
      if (cancelled) return;

      presentTriggerResult(result);
    }

    async function requestScheduledTrigger() {
      if (uiStateRef.current.bubbleVisible || uiStateRef.current.chatOpen) {
        return;
      }

      const result = await pollTriggerEngine([]);
      if (cancelled || !result.runResult) return;

      presentTriggerResult(result.runResult);
    }

    void requestInitialTrigger().catch(() => {});
    const intervalId = window.setInterval(() => {
      void requestScheduledTrigger().catch(() => {});
    }, TRIGGER_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!bubbleVisible) return;

    const timeoutId = window.setTimeout(() => {
      setBubbleVisible(false);
      if (activeUtteranceId) {
        void recordReaction(activeUtteranceId, "ignored");
      }
    }, 7000);

    return () => window.clearTimeout(timeoutId);
  }, [activeUtteranceId, bubbleVisible]);

  return {
    bubbleVisible,
    chatOpen,
    message,
    messages,
    draft,
    setDraft,
    sendMessage: () => {
      const text = draft.trim();
      if (!text) return;

      const userMessage = {
        id: `user-${Date.now()}`,
        sender: "user" as const,
        text,
      };
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setDraft("");
      void recordReaction(activeUtteranceId, "replied");
      void generateChatReply(nextMessages).then((generation) => {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: `companion-${Date.now()}`,
            sender: "companion",
            text: generation.message,
          },
        ]);
      });
    },
    showBubble: () => setBubbleVisible(true),
    dismissBubble: () => {
      setBubbleVisible(false);
      void recordReaction(activeUtteranceId, "dismissed");
    },
    openChat: () => {
      setChatOpen(true);
      setBubbleVisible(false);
      void recordReaction(activeUtteranceId, "opened");
    },
    closeChat: () => {
      setChatOpen(false);
      void recordReaction(activeUtteranceId, "closed");
    },
  };
}

function requestInitialTriggerOnce() {
  if (!initialTriggerPromise) {
    initialTriggerPromise = runTriggerEngineOnce([]).catch((error) => {
      initialTriggerPromise = null;
      throw error;
    });
  }

  return initialTriggerPromise;
}

async function recordReaction(
  utteranceEventId: string | null,
  reactionType: string,
) {
  await Promise.all([
    createUserReaction({
      utteranceEventId,
      reactionType,
    }),
    recordTriggerReactionForScoring(reactionType),
  ]);
}
