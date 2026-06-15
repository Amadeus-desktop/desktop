import { useCallback, useEffect, useMemo, useState } from "react";
import { getPersonas } from "../../../domain/persona/registry";
import { useI18n } from "../../../i18n";
import { generatePocketIntro } from "../../../mocks/companion";
import {
  patchAppSettings,
  useAppSettings,
} from "../../settings";
import {
  createUserReaction,
} from "../../timeline";
import {
  recordTriggerReactionForScoring,
} from "../../trigger";
import { resolveCompanionReply } from "../lib/reply";
import { patchCompanionSession } from "../lib/companionSessionStore";
import type { CompanionMessage, PersonaId } from "../types";
import { useCompanionSessionState } from "./useCompanionSessionState";
import { useCompanionTimeline } from "./useCompanionTimeline";
import { useCompanionTrigger } from "./useCompanionTrigger";

type UseCompanionShellOptions = {
  companionEnabled?: boolean;
};

export function useCompanionShell({
  companionEnabled = true,
}: UseCompanionShellOptions = {}) {
  const locale = useI18n();
  const { settings } = useAppSettings();
  const t = locale.companion;
  const personas = useMemo(() => getPersonas(locale), [locale]);
  const {
    mode,
    draft,
    setDraft,
    nudge,
    messages,
    setMessages,
    activeUtteranceId,
    transitionMode,
  } = useCompanionSessionState();
  const selectedPersonaId = settings.companionPersonaId;
  const [isSending, setIsSending] = useState(false);
  const { events: timelineEvents, refreshTimeline } = useCompanionTimeline();

  const selectedPersona = personas[selectedPersonaId];
  const personaList = useMemo(() => Object.values(personas), [personas]);

  const canPresentTrigger =
    mode === "quiet" || mode === "sleep";

  const recordReaction = useCallback(
    async (reactionType: string, options?: { score?: boolean }) => {
      await createUserReaction({
        reactionType,
        utteranceEventId: activeUtteranceId,
      });
      if (options?.score !== false) {
        await recordTriggerReactionForScoring(reactionType);
      }
      refreshTimeline();
    },
    [activeUtteranceId, refreshTimeline],
  );

  const presentNudge = useCallback(
    async (message: string, utteranceEventId: string | null) => {
      patchCompanionSession({
        nudge: message,
        activeUtteranceId: utteranceEventId,
      });
      await transitionMode("nudge");
      refreshTimeline();
    },
    [refreshTimeline, transitionMode],
  );

  useCompanionTrigger({
    enabled: companionEnabled && settings.proactiveTriggerEnabled,
    settings,
    canPresent: canPresentTrigger,
    onTrigger: ({ message, utteranceEventId }) => {
      void presentNudge(message, utteranceEventId);
    },
  });

  useEffect(() => {
    if (companionEnabled) return;
    if (mode === "nudge" || mode === "new_note") {
      void transitionMode("quiet");
    }
  }, [companionEnabled, mode, transitionMode]);

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
      return;
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
    (personaId: PersonaId) => {
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
    recordReaction,
    selectedPersona,
    setDraft,
    setMessages,
    settings,
    transitionMode,
  ]);

  const showPresence = mode === "quiet" || mode === "new_note" || mode === "sleep";

  return {
    mode,
    t,
    selectedPersona,
    personaList,
    selectedPersonaId,
    draft,
    nudge,
    messages,
    timelineEvents,
    showPresence,
    isSending,
    modelRoute: settings.modelRoute,
    nightCareEnabled: settings.nightCareEnabled,
    nickname: settings.nickname,
    setDraft,
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
