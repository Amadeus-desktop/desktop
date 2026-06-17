import { useCallback, useRef } from "react";
import { logger } from "../../../observability/logger";
import { patchAppSettings } from "../../settings";
import type { GeneralSettings } from "../../settings/types";
import { recordTriggerReactionForScoring } from "../../trigger";
import { buildPocketOpeningMessages } from "../lib/openingMessages";
import {
  persistCompanionMessage,
  restoreCompanionMessagesForPersona,
} from "../lib/conversationPersistence";
import { buildCompanionCurrentContext } from "../lib/currentContext";
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
  const restoreSequenceRef = useRef(0);

  const beginRestore = useCallback(() => {
    restoreSequenceRef.current += 1;
    return restoreSequenceRef.current;
  }, []);

  const isCurrentRestore = useCallback((restoreId: number) => {
    const currentSession = getCompanionSessionSnapshot();
    return restoreSequenceRef.current === restoreId && currentSession.mode === "pocket";
  }, []);

  const invalidateRestore = useCallback(() => {
    restoreSequenceRef.current += 1;
  }, []);

  const openPocket = useCallback(async () => {
    const openingId = `companion-intro-${Date.now()}`;
    const restoreId = beginRestore();

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
    if (!isCurrentRestore(restoreId)) {
      return;
    }
    const currentContext = await buildCompanionCurrentContext({
      nudge,
    }).catch((error) => {
      logger.warn("ui", "companion opening context build failed", { error });
      return nudge
        ? {
            source: "user_visible" as const,
            summary: nudge,
            allowed_surface: "both" as const,
          }
        : null;
    });
    if (!isCurrentRestore(restoreId)) {
      return;
    }

    const speakFirst = async () => {
      try {
        const generation = await resolveCompanionReply(
          [],
          selectedPersona,
          settings,
          {
            currentContext,
          },
        );
        return {
          id: openingId,
          sender: "companion" as const,
          text: generation.message,
        };
      } catch (error) {
        logger.warn("ui", "companion opening generation failed", { error });
        return buildPocketOpeningMessages({
          nudge,
          persona: selectedPersona,
          openingId,
          restoredMessages: [],
        })[0];
      }
    };

    if (restoredMessages.length > 0) {
      const openingMessage = await speakFirst();
      if (!isCurrentRestore(restoreId)) {
        return;
      }
      setMessages(
        openingMessage ? [openingMessage, ...restoredMessages] : restoredMessages,
      );
      setIsSending(false);
      void recordReaction("opened").catch(() => undefined);
      return;
    }
    window.setTimeout(() => {
      if (!isCurrentRestore(restoreId)) {
        setIsSending(false);
        return;
      }
      void (async () => {
        const openingMessage = await speakFirst();
        if (!isCurrentRestore(restoreId)) {
          setIsSending(false);
          return;
        }
        setMessages(openingMessage ? [openingMessage] : []);
        setIsSending(false);
      })();
    }, POCKET_FIRST_SPEAK_DELAY_MS);
    void recordReaction("opened").catch(() => undefined);
  }, [
    beginRestore,
    isCurrentRestore,
    mode,
    nudge,
    recordReaction,
    selectedPersona,
    setIsSending,
    setMessages,
    settings,
  ]);

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
    invalidateRestore();
    await recordReaction("closed", { score: true });
    patchCompanionSession({ activeUtteranceId: null, messages: [], draft: "" });
    setMessages([]);
    setIsSending(false);
    await transitionMode("quiet");
  }, [invalidateRestore, recordReaction, setIsSending, setMessages, transitionMode]);

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

      const restoreId = beginRestore();
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
      if (!isCurrentRestore(restoreId)) {
        return;
      }
      if (restoredMessages.length > 0) {
        setMessages(
          buildPocketOpeningMessages({
            nudge,
            persona: personas[personaId],
            openingId: `companion-intro-${Date.now()}`,
            restoredMessages,
          }),
        );
        setIsSending(false);
        return;
      }

      setMessages(
        buildPocketOpeningMessages({
          nudge,
          persona: personas[personaId],
          openingId: `companion-intro-${Date.now()}`,
          restoredMessages: [],
        }),
      );
      setIsSending(false);
    },
    [beginRestore, isCurrentRestore, mode, nudge, personas, setIsSending, setMessages],
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
      const currentContext = await buildCompanionCurrentContext({
        nudge,
      }).catch((error) => {
        logger.warn("ui", "companion current context build failed", { error });
        return nudge
          ? {
              source: "user_visible" as const,
              summary: nudge,
              allowed_surface: "both" as const,
            }
          : null;
      });
      const generation = await resolveCompanionReply(
        nextMessages,
        selectedPersona,
        settings,
        {
          currentContext,
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
