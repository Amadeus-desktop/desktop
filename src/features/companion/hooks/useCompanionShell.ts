import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPersonas } from "../../../domain/persona/registry";
import { useI18n } from "../../../i18n";
import { createTimelineEvent } from "../lib/state";
import {
  generateDeepReply,
  generateNudge,
  generatePocketIntro,
  mockMemory,
  mockWorld,
} from "../mock/provider";
import type {
  CompanionMessage,
  CompanionMode,
  LocalTimelineEvent,
  PersonaId,
  TimelineEventType,
} from "../types";
import type { TriggerType } from "../../../domain/trigger/types";
import { syncCompanionWindow } from "../window/syncCompanionWindow";

const MOCK_TRIGGER_TYPE: TriggerType = "milestone";
const MOCK_TRIGGER_DELAY_MS = 900;

export function useCompanionShell() {
  const locale = useI18n();
  const t = locale.companion;
  const personas = useMemo(() => getPersonas(locale), [locale]);
  const [mode, setMode] = useState<CompanionMode>("quiet");
  const [selectedPersonaId, setSelectedPersonaId] =
    useState<PersonaId>("warm_friend");
  const [draft, setDraft] = useState("");
  const [nudge, setNudge] = useState("");
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<LocalTimelineEvent[]>(
    [],
  );
  const triggerPresentedRef = useRef(false);

  const selectedPersona = personas[selectedPersonaId];
  const personaList = useMemo(() => Object.values(personas), [personas]);

  const appendEvent = useCallback(
    (type: TimelineEventType, nextMode: CompanionMode, label: string) => {
      setTimelineEvents((currentEvents) => [
        ...currentEvents,
        createTimelineEvent(type, nextMode, label),
      ]);
    },
    [],
  );

  const transitionMode = useCallback(async (nextMode: CompanionMode) => {
    await syncCompanionWindow(nextMode);
    setMode(nextMode);
  }, []);

  useEffect(() => {
    void syncCompanionWindow("quiet");
  }, []);

  useEffect(() => {
    if (triggerPresentedRef.current) return;

    const timeoutId = window.setTimeout(() => {
      const nextNudge = generateNudge(MOCK_TRIGGER_TYPE, selectedPersona);

      triggerPresentedRef.current = true;
      setNudge(nextNudge);
      void transitionMode("new_note");
      appendEvent("nudge_shown", "new_note", nextNudge);
    }, MOCK_TRIGGER_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [appendEvent, selectedPersona, transitionMode]);

  const openPocket = useCallback(async () => {
    const intro = generatePocketIntro(nudge, selectedPersona);

    setMessages([
      {
        id: `companion-intro-${Date.now()}`,
        sender: "companion",
        text: intro,
      },
    ]);
    appendEvent("note_clicked", "pocket", nudge);
    appendEvent("pocket_opened", "pocket", intro);
    await transitionMode("pocket");
  }, [appendEvent, nudge, selectedPersona, transitionMode]);

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

    if (mode === "quiet") {
      const nextNudge = generateNudge(MOCK_TRIGGER_TYPE, selectedPersona);
      setNudge(nextNudge);
      appendEvent("nudge_shown", "nudge", nextNudge);
      await transitionMode("nudge");
      return;
    }

    if (mode === "new_note") {
      const nextNudge =
        nudge || generateNudge(MOCK_TRIGGER_TYPE, selectedPersona);
      if (!nudge) setNudge(nextNudge);
      appendEvent("nudge_shown", "nudge", nextNudge);
      await transitionMode("nudge");
    }
  }, [
    appendEvent,
    mode,
    nudge,
    openPocket,
    selectedPersona,
    transitionMode,
  ]);

  const dismissNudge = useCallback(async () => {
    appendEvent("dismissed", "quiet", nudge);
    await transitionMode("quiet");
  }, [appendEvent, nudge, transitionMode]);

  const ignoreNudge = useCallback(async () => {
    appendEvent("ignored", "quiet", nudge);
    await transitionMode("quiet");
  }, [appendEvent, nudge, transitionMode]);

  const closePocket = useCallback(async () => {
    await transitionMode("quiet");
  }, [transitionMode]);

  const openDailyCare = useCallback(async () => {
    appendEvent("daily_care_opened", "daily_care", t.dailyCare.intro);
    await transitionMode("daily_care");
  }, [appendEvent, t.dailyCare.intro, transitionMode]);

  const closeDailyCare = useCallback(async () => {
    await transitionMode("quiet");
  }, [transitionMode]);

  const selectPersona = useCallback(
    (personaId: PersonaId) => {
      const nextPersona = personas[personaId];
      setSelectedPersonaId(personaId);

      if (mode !== "pocket") return;

      const nextIntro = generatePocketIntro(nudge, nextPersona);
      setMessages([
        {
          id: `companion-intro-${Date.now()}`,
          sender: "companion",
          text: nextIntro,
        },
      ]);
    },
    [mode, nudge, personas],
  );

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;

    const userMessage: CompanionMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
    };
    const replyText = generateDeepReply(
      text,
      selectedPersona,
      mockMemory,
      mockWorld[selectedPersona.id],
    );
    const replyMessage: CompanionMessage = {
      id: `companion-${Date.now()}`,
      sender: "companion",
      text: replyText,
    };

    setDraft("");
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      replyMessage,
    ]);
    appendEvent("user_input", "deep", text);
    appendEvent("deep_reply", "deep", replyText);
    await transitionMode("deep");
  }, [appendEvent, draft, selectedPersona, transitionMode]);

  const showPresence =
    mode === "quiet" ||
    mode === "new_note" ||
    mode === "sleep" ||
    mode === "nudge";

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
