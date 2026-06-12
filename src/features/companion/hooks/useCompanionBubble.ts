import { useEffect, useState } from "react";
import { initialChatMessages, initialCompanionMessage } from "../model/companion";

export function useCompanionBubble() {
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState(initialChatMessages);
  const [draft, setDraft] = useState("");

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
    },
    showBubble: () => setBubbleVisible(true),
    dismissBubble: () => setBubbleVisible(false),
    openChat: () => {
      setChatOpen(true);
      setBubbleVisible(false);
    },
    closeChat: () => setChatOpen(false),
  };
}
