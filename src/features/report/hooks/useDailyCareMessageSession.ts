import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DailyCareReply,
  DailyCareThreadMessage,
  DailyCareTurn,
} from "../lib/dailyCareMessageScript";

const FIRST_TYPING_MS = 560;
const BETWEEN_TYPING_MS = 420;

type UseDailyCareMessageSessionOptions = {
  turns: DailyCareTurn[];
  prefersReducedMotion: boolean;
  onComplete: () => void;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useDailyCareMessageSession({
  turns,
  prefersReducedMotion,
  onComplete,
}: UseDailyCareMessageSessionOptions) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [messages, setMessages] = useState<DailyCareThreadMessage[]>([]);
  const [replies, setReplies] = useState<DailyCareReply[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const revealTokenRef = useRef(0);

  useEffect(() => {
    const turn = turns[turnIndex];
    if (!turn) return;

    const revealToken = ++revealTokenRef.current;
    let cancelled = false;

    async function revealTurn() {
      setReplies([]);
      setIsTyping(true);

      for (const [index, item] of turn.companionItems.entries()) {
        if (cancelled || revealTokenRef.current !== revealToken) return;

        if (!prefersReducedMotion) {
          await sleep(index === 0 ? FIRST_TYPING_MS : BETWEEN_TYPING_MS);
        }

        if (cancelled || revealTokenRef.current !== revealToken) return;
        setMessages((current) => [...current, item]);
      }

      if (cancelled || revealTokenRef.current !== revealToken) return;
      setIsTyping(false);
      setReplies(turn.replies);
    }

    void revealTurn();

    return () => {
      cancelled = true;
    };
  }, [prefersReducedMotion, turnIndex, turns]);

  const selectReply = useCallback(
    (reply: DailyCareReply) => {
      setMessages((current) => [
        ...current,
        {
          id: `user-${turnIndex}-${reply.id}-${current.length}`,
          sender: "user",
          kind: "text",
          text: reply.label,
        },
      ]);
      setReplies([]);

      if (turnIndex >= turns.length - 1) {
        onComplete();
        return;
      }

      setTurnIndex((index) => index + 1);
    },
    [onComplete, turnIndex, turns.length],
  );

  return {
    messages,
    replies,
    isTyping,
    selectReply,
  };
}
