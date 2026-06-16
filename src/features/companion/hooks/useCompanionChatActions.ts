import { useCallback } from "react";
import { patchAppSettings } from "../../settings";
import type { GeneralSettings } from "../../settings/types";
import { recordTriggerReactionForScoring } from "../../trigger";
import { generatePocketIntro } from "../lib/pocketIntro";
import { patchCompanionSession } from "../lib/companionSessionStore";
import { resolveCompanionReply } from "../lib/reply";
import type { CompanionMateId } from "../../../domain/mate";
import type {
  CompanionMessage,
  CompanionMode,
  Persona,
} from "../types";

type TransitionMode = (mode: CompanionMode) => Promise<void>;

type UseCompanionChatActionsOptions = {
  mode: CompanionMode;
  nudge: string;
  messages: CompanionMessage[];
  draft: string;
  isSending: boolean;
  selectedPersona: Persona;
  personas: Record<CompanionMateId, Persona>;
  settings: GeneralSettings;
  setDraft: (draft: string) => void;
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
  draft,
  isSending,
  selectedPersona,
  personas,
  settings,
  setDraft,
  setMessages,
  setIsSending,
  transitionMode,
  recordReaction,
}: UseCompanionChatActionsOptions) {
  const openPocket = useCallback(async () => {
    const intro = generatePocketIntro(nudge, selectedPersona);

    setMessages([
      {
        id: `companion-intro-${Date.now()}`,
        sender: "companion",
        text: intro,
      },
    ]);
    await recordReaction("opened");
    await transitionMode("pocket");
  }, [nudge, recordReaction, selectedPersona, setMessages, transitionMode]);

  const openIcon = useCallback(async () => {
    if (mode === "sleep") {
      await transitionMode("quiet");
      return;
    }

    if (mode === "pocket" || mode === "deep" || mode === "daily_care") {
      return;
    }

    if (mode === "nudge" && nudge) {
      await openPocket();
      return;
    }

    if (mode === "new_note" && nudge) {
      await transitionMode("nudge");
    }
  }, [mode, nudge, openPocket, transitionMode]);

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
    setDraft("");
    await transitionMode("quiet");
  }, [recordReaction, setDraft, setMessages, transitionMode]);

  const openDailyCare = useCallback(async () => {
    if (!settings.nightCareEnabled) return;
    await recordReaction("daily_care_opened", { score: false });
    await transitionMode("daily_care");
  }, [recordReaction, settings.nightCareEnabled, transitionMode]);

  const closeDailyCare = useCallback(async () => {
    await transitionMode("quiet");
  }, [transitionMode]);

  const selectPersona = useCallback(
    (personaId: CompanionMateId) => {
      patchAppSettings({ companionPersonaId: personaId });

      if (mode !== "pocket") return;

      const nextIntro = generatePocketIntro(nudge, personas[personaId]);
      setMessages([
        {
          id: `companion-intro-${Date.now()}`,
          sender: "companion",
          text: nextIntro,
        },
      ]);
    },
    [mode, nudge, personas, setMessages],
  );

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    const userMessage: CompanionMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
    };
    const nextMessages = [...messages, userMessage];

    setDraft("");
    setIsSending(true);
    setMessages(nextMessages);

    try {
      await recordReaction("user_input", { score: false });
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
      await recordReaction("deep_reply", { score: false });
      await recordTriggerReactionForScoring("replied");
      await transitionMode("deep");
    } finally {
      setIsSending(false);
    }
  }, [
    draft,
    isSending,
    messages,
    nudge,
    recordReaction,
    selectedPersona,
    setDraft,
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
