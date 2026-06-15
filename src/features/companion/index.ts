export { CompanionShell } from "./shell/CompanionShell";
export { CompanionViewport } from "./shell/CompanionViewport";
export { useCompanionShell } from "./hooks/useCompanionShell";
export { useCompanionDevTools } from "./hooks/useCompanionDevTools";
export { useCompanionTrigger } from "./hooks/useCompanionTrigger";
export { useCompanionTimeline } from "./hooks/useCompanionTimeline";
export {
  useCompanionI18n,
  setCompanionLocale,
  useI18n,
  setLocale,
} from "../../i18n";
export { companionStyles } from "./ui/styles";
export {
  resyncTauriCompanionWindow,
  syncTauriWindowToElement,
  useTauriCompanionWindow,
} from "./hooks/useTauriCompanionWindow";
export { resolveCompanionReply } from "./lib/reply";
export { generatePocketIntro } from "./lib/pocketIntro";
export {
  getCompanionSessionSnapshot,
  patchCompanionSession,
  resetCompanionSession,
  subscribeToCompanionSession,
} from "./lib/companionSessionStore";
export type {
  CompanionMessage,
  CompanionMode,
  Persona,
  PersonaId,
} from "./types";
export type { TriggerType } from "../../domain/trigger/types";
