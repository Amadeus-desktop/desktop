import { useCallback, useEffect, useMemo, useState } from "react";
import { getPersonas } from "../../../domain/persona/registry";
import { useI18n } from "../../../i18n";
import { useAppSettings } from "../../settings";
import { patchCompanionSession, resetCompanionSession } from "../lib/companionSessionStore";
import { useCompanionChatActions } from "./useCompanionChatActions";
import { useCompanionReactions } from "./useCompanionReactions";
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

  const { recordReaction } = useCompanionReactions(
    activeUtteranceId,
    refreshTimeline,
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
    resetCompanionSession();
    if (mode === "nudge" || mode === "new_note") {
      void transitionMode("quiet");
    }
  }, [companionEnabled, mode, transitionMode]);

  const chatActions = useCompanionChatActions({
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
  });

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
    ...chatActions,
  };
}
