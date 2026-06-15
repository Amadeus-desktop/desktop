import type { AppLocale } from "../../i18n";
import type { GeneralSettings, ModelRoute, TalkFrequency } from "./types";
import type { AccentColorId, AppearanceMode } from "../../ui/tokens/appearance";
import { normalizePersonaId } from "../../domain/persona/types";

export const initialSettings: GeneralSettings = {
  locale: "ko",
  appearance: "system",
  accentColor: "rose",
  companionPersonaId: "warm_friend",
  talkFrequency: "balanced",
  modelRoute: "api-first",
  localFallbackEnabled: true,
  nickname: "작업자",
  nightCareEnabled: true,
  analysisEnabled: true,
  proactiveTriggerEnabled: true,
  privacyFilterEnabled: true,
  customPrivacyKeywords: [],
  localModelPath: null,
  llamaServerBinaryPath: null,
  llamaServerHost: "127.0.0.1",
  llamaServerPort: 8080,
};

export function normalizeGeneralSettings(
  settings: Partial<GeneralSettings> & { accentTheme?: string },
): GeneralSettings {
  const merged = { ...initialSettings, ...settings };
  const accentColor = merged.accentColor ?? merged.accentTheme;

  return {
    ...merged,
    companionPersonaId: normalizePersonaId(merged.companionPersonaId),
    accentColor: isAccentColor(accentColor)
      ? accentColor
      : initialSettings.accentColor,
    appearance: isAppearance(merged.appearance)
      ? merged.appearance
      : initialSettings.appearance,
  };
}

function isAccentColor(value: unknown): value is AccentColorId {
  return (
    value === "rose" ||
    value === "lavender" ||
    value === "sky" ||
    value === "mint" ||
    value === "peach"
  );
}

function isAppearance(value: unknown): value is AppearanceMode {
  return value === "dark" || value === "light" || value === "system";
}

export function getTalkFrequencyOptions(locale: AppLocale) {
  return (Object.entries(locale.settings.talkFrequency.options) as Array<
    [TalkFrequency, string]
  >).map(([value, label]) => ({ value, label }));
}

export function getModelRouteOptions(locale: AppLocale) {
  return (Object.entries(locale.settings.modelRoute.options) as Array<
    [ModelRoute, string]
  >).map(([value, label]) => ({ value, label }));
}

export function getLocaleOptions(locale: AppLocale) {
  return (Object.entries(locale.settings.locale.options) as Array<
    [GeneralSettings["locale"], string]
  >).map(([value, label]) => ({ value, label }));
}

export function getAppearanceOptions(locale: AppLocale) {
  return (Object.entries(locale.settings.appearance.options) as Array<
    [AppearanceMode, string]
  >).map(([value, label]) => ({ value, label }));
}
