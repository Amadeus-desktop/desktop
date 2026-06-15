import type { LocaleCode } from "../../i18n/types";
import type { PersonaId } from "../../domain/persona/types";
import type { AccentColorId, AppearanceMode } from "../../ui/tokens/appearance";

export type TalkFrequency = "quiet" | "balanced" | "active";
export type ModelRoute = "api-first" | "local-first" | "template";

export type GeneralSettings = {
  locale: LocaleCode;
  appearance: AppearanceMode;
  accentColor: AccentColorId;
  companionPersonaId: PersonaId;
  talkFrequency: TalkFrequency;
  modelRoute: ModelRoute;
  localFallbackEnabled: boolean;
  nickname: string;
  nightCareEnabled: boolean;
  analysisEnabled: boolean;
  proactiveTriggerEnabled: boolean;
  privacyFilterEnabled: boolean;
  customPrivacyKeywords: string[];
  localModelPath: string | null;
  llamaServerBinaryPath: string | null;
  llamaServerHost: string;
  llamaServerPort: number;
};
