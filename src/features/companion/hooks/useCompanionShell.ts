import { useCallback, useEffect, useMemo, useState } from "react";
import {
  normalizeCompanionMateId,
  type CompanionMateId,
} from "../../../domain/mate";
import type { Persona } from "../../../domain/persona";
import { useI18n } from "../../../i18n";
import { useCachedPersonas } from "../../persona/hooks/useCachedPersonas";
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
  const cachedPersonas = useCachedPersonas(locale);
  const mateList = cachedPersonas.personas;
  const matesById = useMemo(
    () =>
      mateList.reduce(
        (personas, persona) => {
          personas[persona.id] = persona;
          return personas;
        },
        {} as Record<CompanionMateId, Persona>,
      ),
    [mateList],
  );
  const {
    mode,
    nudge,
    messages,
    setMessages,
    activeUtteranceId,
    transitionMode,
  } = useCompanionSessionState();
  const selectedPersonaId = normalizeCompanionMateId(settings.companionPersonaId);
  const [isSending, setIsSending] = useState(false);
  const {
    events: timelineEvents,
    workSessions,
    refreshTimeline,
  } = useCompanionTimeline();

  const selectedPersona = matesById[selectedPersonaId];

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
    isSending,
    selectedPersona,
    personas: matesById,
    settings,
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
    mateList,
    selectedPersonaId,
    nudge,
    messages,
    timelineEvents,
    workSessions,
    showPresence,
    isSending,
    modelRoute: settings.modelRoute,
    mateIcon: settings.companionMateIcon,
    nightCareEnabled: settings.nightCareEnabled,
    nickname: settings.nickname,
    userName: settings.nickname.trim() || t.chat.you,
    ...chatActions,
  };
}
