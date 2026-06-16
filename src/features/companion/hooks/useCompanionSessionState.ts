import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getCompanionSessionSnapshot,
  markCompanionSessionInitialized,
  patchCompanionSession,
  subscribeToCompanionSession,
} from "../lib/companionSessionStore";
import type { CompanionMessage, CompanionMode } from "../types";
import { forceResyncTauriCompanionWindow } from "./useTauriCompanionWindow";

export function useCompanionSessionState() {
  const session = useSyncExternalStore(
    subscribeToCompanionSession,
    getCompanionSessionSnapshot,
    getCompanionSessionSnapshot,
  );

  useEffect(() => {
    if (session.initialized) return;
    markCompanionSessionInitialized();
  }, [session.initialized]);

  const transitionMode = useCallback(async (nextMode: CompanionMode) => {
    patchCompanionSession({ mode: nextMode });
    forceResyncTauriCompanionWindow();
  }, []);

  const setDraft = useCallback(
    (value: string | ((previous: string) => string)) => {
      const current = getCompanionSessionSnapshot().draft;
      patchCompanionSession({
        draft: typeof value === "function" ? value(current) : value,
      });
    },
    [],
  );

  const setNudge = useCallback((value: string) => {
    patchCompanionSession({ nudge: value });
  }, []);

  const setMessages = useCallback(
    (
      value:
        | CompanionMessage[]
        | ((previous: CompanionMessage[]) => CompanionMessage[]),
    ) => {
      const current = getCompanionSessionSnapshot().messages;
      patchCompanionSession({
        messages: typeof value === "function" ? value(current) : value,
      });
    },
    [],
  );

  return {
    mode: session.mode,
    draft: session.draft,
    setDraft,
    nudge: session.nudge,
    setNudge,
    messages: session.messages,
    setMessages,
    activeUtteranceId: session.activeUtteranceId,
    transitionMode,
  };
}
