export { CompanionShell } from "./shell/CompanionShell";
export { CompanionViewport } from "./shell/CompanionViewport";
export { useCompanionShell } from "./hooks/useCompanionShell";
export { useCompanionTheme } from "./hooks/useCompanionTheme";
export { useCompanionDevTools } from "./hooks/useCompanionDevTools";
export {
  useCompanionI18n,
  setCompanionLocale,
  useI18n,
  setLocale,
} from "./i18n";
export { companionStyles } from "./ui/styles";
export { syncCompanionWindow } from "./window/syncCompanionWindow";
export { COMPANION_WINDOW_LAYOUTS } from "./window/layouts";
export { createTimelineEvent } from "./lib/state";
export { generateNudge, generatePocketIntro, generateDeepReply } from "./mock/provider";
export type {
  CompanionMessage,
  CompanionMode,
  LocalTimelineEvent,
  Persona,
  PersonaId,
  TimelineEventType,
} from "./types";
export type { TriggerType } from "../../domain/trigger/types";
