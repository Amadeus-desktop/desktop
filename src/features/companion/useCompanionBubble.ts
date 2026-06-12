import { useEffect, useState } from "react";
import { initialChatMessages, initialCompanionMessage } from "./companion";
import {
  createContextEvent,
  createUserReaction,
  createUtteranceEvent,
} from "../timeline/timelineRepository";

export function useCompanionBubble() {
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState(initialChatMessages);
  const [draft, setDraft] = useState("");
  const [activeUtteranceId, setActiveUtteranceId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function recordInitialUtterance() {
      const contextEvent = await createContextEvent({
        appName: "Amadeus",
        windowTitle: "Companion Shell",
        eventType: "mock_trigger",
        metadataJson: JSON.stringify({ trigger: "deep_pause" }),
      });
      const utterance = await createUtteranceEvent({
        triggerType: "deep_pause",
        speakabilityScore: 72,
        message: initialCompanionMessage,
        provider: "mock",
        contextEventId: contextEvent.id,
      });

      if (!cancelled) {
        setActiveUtteranceId(utterance.id);
      }
    }

    void recordInitialUtterance();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bubbleVisible) return;

    const timeoutId = window.setTimeout(() => {
      setBubbleVisible(false);
    }, 7000);

    return () => window.clearTimeout(timeoutId);
  }, [bubbleVisible]);

  return {
    bubbleVisible,
    chatOpen,
    message: initialCompanionMessage,
    messages,
    draft,
    setDraft,
    sendMessage: () => {
      const text = draft.trim();
      if (!text) return;

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text,
        },
      ]);
      setDraft("");
      void recordReaction(activeUtteranceId, "replied");
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

async function recordReaction(
  utteranceEventId: string | null,
  reactionType: string,
) {
  await createUserReaction({
    utteranceEventId,
    reactionType,
  });
}
