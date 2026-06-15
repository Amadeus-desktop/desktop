import { useSyncExternalStore } from "react";
import { base as enBase } from "./en/base";
import { base as jaBase } from "./ja/base";
import { base as koBase } from "./ko/base";
import type { AppLocale, CompanionLocale, LocaleCode } from "./types";

export const LOCALE_TAGS: Record<LocaleCode, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

const locales: Record<LocaleCode, AppLocale> = {
  ko: koBase,
  en: enBase,
  ja: jaBase,
};

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
