import { createExternalStore } from "../../../lib/createExternalStore";
import type { CompanionMessage, CompanionMode } from "../types";

export type CompanionSessionSnapshot = {
  mode: CompanionMode;
  nudge: string;
  messages: CompanionMessage[];
  draft: string;
  activeUtteranceId: string | null;
  initialized: boolean;
};

const emptySession: CompanionSessionSnapshot = {
  mode: "quiet",
  nudge: "",
  messages: [],
  draft: "",
  activeUtteranceId: null,
  initialized: false,
};

const companionSessionStore = createExternalStore(emptySession);

export function getCompanionSessionSnapshot() {
  return companionSessionStore.getSnapshot();
}

export function subscribeToCompanionSession(listener: () => void) {
  return companionSessionStore.subscribe(listener);
}

export function patchCompanionSession(
  patch: Partial<Omit<CompanionSessionSnapshot, "initialized">>,
) {
  const current = companionSessionStore.getSnapshot();
  companionSessionStore.setSnapshot({
    ...current,
    ...patch,
    initialized: true,
  });
}

export function markCompanionSessionInitialized() {
  const current = companionSessionStore.getSnapshot();
  if (current.initialized) return;
  companionSessionStore.setSnapshot({ ...current, initialized: true });
}

export function resetCompanionSession() {
  companionSessionStore.setSnapshot({ ...emptySession }, { notify: false });
}

/** @deprecated use getCompanionSessionSnapshot */
export function getCompanionSession() {
  return getCompanionSessionSnapshot();
}
