import type { CompanionMessage, CompanionMode } from "../types";

type CompanionSession = {
  mode: CompanionMode;
  nudge: string;
  messages: CompanionMessage[];
  draft: string;
  activeUtteranceId: string | null;
  initialized: boolean;
};

const session: CompanionSession = {
  mode: "quiet",
  nudge: "",
  messages: [],
  draft: "",
  activeUtteranceId: null,
  initialized: false,
};

export function getCompanionSession() {
  return session;
}

export function patchCompanionSession(
  patch: Partial<Omit<CompanionSession, "initialized">>,
) {
  Object.assign(session, patch);
  session.initialized = true;
}

export function markCompanionSessionInitialized() {
  session.initialized = true;
}
