import { useCallback } from "react";
import { logger } from "../../../observability/logger";
import { patchAppSettings } from "../../settings";
import type { GeneralSettings } from "../../settings/types";
import { recordTriggerReactionForScoring } from "../../trigger";
import { generatePocketIntro } from "../lib/pocketIntro";
import {
  persistCompanionMessage,
  restoreCompanionMessagesForPersona,
} from "../lib/conversationPersistence";
import {
  getCompanionSessionSnapshot,
  patchCompanionSession,
} from "../lib/companionSessionStore";
import { resolveCompanionReply } from "../lib/reply";
import type { CompanionMateId } from "../../../domain/mate";
import type {
  CompanionMessage,
  CompanionMode,
  Persona,
} from "../types";

type TransitionMode = (mode: CompanionMode) => Promise<void>;

const POCKET_FIRST_SPEAK_DELAY_MS = 520;

type UseCompanionChatActionsOptions = {
  mode: CompanionMode;
  nudge: string;
  messages: CompanionMessage[];
  isSending: boolean;
  selectedPersona: Persona;
  personas: Record<CompanionMateId, Persona>;
  settings: GeneralSettings;
  setMessages: (
    messages: CompanionMessage[] | ((current: CompanionMessage[]) => CompanionMessage[]),
  ) => void;
  setIsSending: (isSending: boolean) => void;
  transitionMode: TransitionMode;
  recordReaction: (
    reactionType: string,
    options?: { score?: boolean },
  ) => Promise<void>;
};

export function useCompanionChatActions({
  mode,
  nudge,
  messages,
  isSending,
  selectedPersona,
  personas,
  settings,
  setMessages,
  setIsSending,
  transitionMode,
  recordReaction,
}: UseCompanionChatActionsOptions) {
  const openPocket = useCallback(async () => {
    const intro = generatePocketIntro(nudge, selectedPersona);
    const openingId = `companion-intro-${Date.now()}`;

    logger.info("ui", "companion pocket opening", {
      fromMode: mode,
      hasNudge: Boolean(nudge.trim()),
    });

    patchCompanionSession({
      mode: "pocket",
      messages: [],
    });
    setMessages([]);
    setIsSending(true);
    const restoredMessages = await restoreCompanionMessagesForPersona(
      selectedPersona.id,
    ).catch((error) => {
      logger.warn("ui", "conversation restore failed", {
        personaId: selectedPersona.id,
        error,
      });
      return [];
    });
    if (restoredMessages.length > 0) {
      setMessages(restoredMessages);
      setIsSending(false);
      void recordReaction("opened").catch(() => undefined);
      return;
    }
    window.setTimeout(() => {
      const currentSession = getCompanionSessionSnapshot();
      if (currentSession.mode !== "pocket") {
        setIsSending(false);
        return;
      }
      const introMessage: CompanionMessage = {
        id: openingId,
        sender: "companion",
        text: intro,
      };
      setMessages([introMessage]);
      setIsSending(false);
    }, POCKET_FIRST_SPEAK_DELAY_MS);
    void recordReaction("opened").catch(() => undefined);
  }, [mode, nudge, recordReaction, selectedPersona, setIsSending, setMessages]);

  const openIcon = useCallback(async () => {
    logger.info("ui", "companion icon click", {
      mode,
      hasNudge: Boolean(nudge.trim()),
    });

    if (mode === "pocket" || mode === "deep" || mode === "daily_care") {
      return;
    }

    await openPocket();
  }, [mode, nudge, openPocket]);

  const dismissNudge = useCallback(async () => {
    await recordReaction("dismissed");
    patchCompanionSession({ activeUtteranceId: null });
    await transitionMode("quiet");
  }, [recordReaction, transitionMode]);

  const ignoreNudge = useCallback(async () => {
    await recordReaction("ignored");
    patchCompanionSession({ activeUtteranceId: null });
    await transitionMode("quiet");
  }, [recordReaction, transitionMode]);

  const closePocket = useCallback(async () => {
    await recordReaction("closed", { score: true });
    patchCompanionSession({ activeUtteranceId: null, messages: [], draft: "" });
    setMessages([]);
    setIsSending(false);
    await transitionMode("quiet");
  }, [recordReaction, setIsSending, setMessages, transitionMode]);

  const openDailyCare = useCallback(async () => {
    if (!settings.nightCareEnabled) return;
    await recordReaction("daily_care_opened", { score: false });
    await transitionMode("daily_care");
  }, [recordReaction, settings.nightCareEnabled, transitionMode]);

  const closeDailyCare = useCallback(async () => {
    await transitionMode("quiet");
  }, [transitionMode]);

  const selectPersona = useCallback(
    async (personaId: CompanionMateId) => {
      patchAppSettings({ companionPersonaId: personaId });

      if (mode !== "pocket") return;

      setMessages([]);
      setIsSending(true);
      const restoredMessages = await restoreCompanionMessagesForPersona(
        personas[personaId].id,
      ).catch((error) => {
        logger.warn("ui", "conversation restore failed", {
          personaId: personas[personaId].id,
          error,
        });
        return [];
      });
      if (restoredMessages.length > 0) {
        setMessages(restoredMessages);
        setIsSending(false);
        return;
      }

      const nextIntro = generatePocketIntro(nudge, personas[personaId]);
      setMessages([
        {
          id: `companion-intro-${Date.now()}`,
          sender: "companion",
          text: nextIntro,
        },
      ]);
      setIsSending(false);
    },
    [mode, nudge, personas, setIsSending, setMessages],
  );

  const sendMessage = useCallback(async (text: string) => {
    const messageText = text.trim();
    if (!messageText || isSending) return;

    const userMessage: CompanionMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: messageText,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    if (mode !== "deep") {
      void transitionMode("deep");
    }
    setIsSending(true);

    void recordReaction("user_input", { score: false }).catch(() => undefined);
    void persistCompanionMessage({
      personaId: selectedPersona.id,
      message: userMessage,
      role: "user",
      provider: null,
    }).catch((error) => {
      logger.warn("ui", "conversation user persistence failed", { error });
    });

    try {
      const generation = await resolveCompanionReply(
        nextMessages,
        selectedPersona,
        settings,
        {
          currentContext: nudge
            ? {
                source: "user_visible",
                summary: nudge,
                allowed_surface: "both",
              }
            : null,
        },
      );
      const replyMessage: CompanionMessage = {
        id: `companion-${Date.now()}`,
        sender: "companion",
        text: generation.message,
      };

      setMessages((currentMessages) => [...currentMessages, replyMessage]);
      void persistCompanionMessage({
        personaId: selectedPersona.id,
        message: replyMessage,
        role: "assistant",
        provider: generation.provider,
      }).catch((error) => {
        logger.warn("ui", "conversation assistant persistence failed", { error });
      });
      await recordReaction("deep_reply", { score: false });
      await recordTriggerReactionForScoring("replied");
    } finally {
      setIsSending(false);
    }
  }, [
    isSending,
    messages,
    mode,
    nudge,
    recordReaction,
    selectedPersona,
    setIsSending,
    setMessages,
    settings,
    transitionMode,
  ]);

  return {
    openIcon,
    openPocket,
    dismissNudge,
    ignoreNudge,
    closePocket,
    openDailyCare,
    closeDailyCare,
    selectPersona,
    sendMessage,
  };
}
