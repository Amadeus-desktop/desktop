import { useSyncExternalStore } from "react";
import { locale as enLocale } from "./en";
import { locale as jaLocale } from "./ja";
import { locale as koLocale } from "./ko";
import { assertLocaleKeyParity } from "./parity";
import type { AppLocale, CompanionLocale, LocaleCode } from "./types";

export const LOCALE_TAGS: Record<LocaleCode, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

const locales: Record<LocaleCode, AppLocale> = {
  ko: koLocale,
  en: enLocale,
  ja: jaLocale,
};

if (import.meta.env.DEV) {
  assertLocaleKeyParity();
}

const LOCALE_CODES = Object.keys(locales) as LocaleCode[];

let currentLocale: LocaleCode = "ko";
const listeners = new Set<() => void>();

export function setLocale(locale: LocaleCode) {
  if (!LOCALE_CODES.includes(locale)) return;
  currentLocale = locale;
  document.documentElement.lang = LOCALE_TAGS[locale];
  listeners.forEach((listener) => listener());
}

export function getLocale(): LocaleCode {
  return currentLocale;
}

export function getAppLocale(locale: LocaleCode = currentLocale): AppLocale {
  return locales[locale];
}

export function formatLocaleTime(date: Date, locale = currentLocale): string {
  return date.toLocaleTimeString(LOCALE_TAGS[locale], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useI18n() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => locales[currentLocale],
    () => locales.ko,
  );
}

/** Companion components receive `labels` props — alias for clarity. */
export function useCompanionI18n(): CompanionLocale {
  return useI18n().companion;
}

export function setCompanionLocale(locale: LocaleCode) {
  setLocale(locale);
}

export type { AppLocale, CompanionLocale, LocaleCode };
export type {
  CharacterMessages,
  CommonMessages,
  CompanionMessages,
  ControlCenterMessages,
  LlmMessages,
  PerceptionMessages,
  PersonaMessages,
  ReportMessages,
  SettingsMessages,
  AuthMessages,
} from "./modules";
export { assertLocaleKeyParity, getLocaleKeyPaths } from "./parity";
