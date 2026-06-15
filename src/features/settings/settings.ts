import type { AppLocale } from "../../i18n";
import type { GeneralSettings, ModelRoute, TalkFrequency } from "./types";

export const initialSettings: GeneralSettings = {
  locale: "ko",
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
