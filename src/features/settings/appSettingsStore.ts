import { useSyncExternalStore } from "react";
import { setLocale, type LocaleCode } from "../../i18n";
import { applyAccentColor } from "../../ui/theme/applyAccentColor";
import { applyAppearance } from "../../ui/theme/applyAppearance";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_APPEARANCE,
  type AccentColorId,
  type AppearanceMode,
} from "../../ui/tokens/appearance";
import {
  getAppearanceOptions,
  getLocaleOptions,
  getModelRouteOptions,
  getTalkFrequencyOptions,
  initialSettings,
  normalizeGeneralSettings,
} from "./settings";
import {
  broadcastSettingsChanged,
  listenForSettingsChanges,
} from "./settingsBroadcast";
import { loadGeneralSettings, saveGeneralSettings } from "./settingsStore";
import type { GeneralSettings, ModelRoute, TalkFrequency } from "./types";

type AppSettingsSnapshot = {
  settings: GeneralSettings;
  hydrated: boolean;
  revision: number;
};

let snapshot: AppSettingsSnapshot = {
  settings: initialSettings,
  hydrated: false,
  revision: 0,
};
let confirmedSettings: GeneralSettings = initialSettings;

const listeners = new Set<() => void>();
let hydratePromise: Promise<GeneralSettings> | null = null;
let persistTimer: number | null = null;
let persistSequence = 0;
let pendingHydrationPatch: Partial<GeneralSettings> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribeAppSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAppSettingsSnapshot() {
  return snapshot;
}

function replaceSnapshot(
  settings: GeneralSettings,
  options: { hydrated?: boolean; bumpRevision?: boolean } = {},
) {
  const normalized = normalizeGeneralSettings(settings);
  snapshot = {
    settings: normalized,
    hydrated: options.hydrated ?? snapshot.hydrated,
    revision: options.bumpRevision ? snapshot.revision + 1 : snapshot.revision,
  };
  setLocale(normalized.locale);
  applyAppearance(normalized.appearance ?? DEFAULT_APPEARANCE);
  applyAccentColor(normalized.accentColor ?? DEFAULT_ACCENT_COLOR);
  notify();
}

export function applyAppSettings(
  settings: GeneralSettings,
  options: { hydrated?: boolean; persist?: boolean; bumpRevision?: boolean } = {},
) {
  replaceSnapshot(settings, {
    hydrated: options.hydrated,
    bumpRevision: options.bumpRevision,
  });

  if (options.persist === false || !snapshot.hydrated) {
    return;
  }

  schedulePersist(snapshot.settings);
}

export function patchAppSettings(patch: Partial<GeneralSettings>) {
  if (!snapshot.hydrated) {
    pendingHydrationPatch = { ...pendingHydrationPatch, ...patch };
  }
  applyAppSettings({ ...snapshot.settings, ...patch });
}

function schedulePersist(settings: GeneralSettings) {
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
  }

  const sequence = ++persistSequence;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void saveGeneralSettings(settings)
      .then(async (savedSettings) => {
        if (sequence !== persistSequence) return;
        confirmedSettings = savedSettings;
        replaceSnapshot(savedSettings, { bumpRevision: true });
        await broadcastSettingsChanged(savedSettings);
      })
      .catch(() => {
        if (sequence !== persistSequence) return;
        replaceSnapshot(confirmedSettings, { bumpRevision: true });
      });
  }, 250);
}

export async function hydrateAppSettings(): Promise<GeneralSettings> {
  if (snapshot.hydrated) {
    return snapshot.settings;
  }

  if (!hydratePromise) {
    hydratePromise = loadGeneralSettings()
      .then((loadedSettings) => {
        const pendingPatch = pendingHydrationPatch;
        pendingHydrationPatch = null;
        const nextSettings = pendingPatch
          ? normalizeGeneralSettings({ ...loadedSettings, ...pendingPatch })
          : loadedSettings;
        confirmedSettings = loadedSettings;
        applyAppSettings(nextSettings, {
          hydrated: true,
          persist: !!pendingPatch,
          bumpRevision: true,
        });
        return snapshot.settings;
      })
      .finally(() => {
        hydratePromise = null;
      });
  }

  return hydratePromise;
}

let settingsListenerAttached = false;

export function ensureSettingsSync() {
  if (settingsListenerAttached) return;
  settingsListenerAttached = true;

  void hydrateAppSettings();
  listenForSettingsChanges((settings) => {
    applyAppSettings(settings, { persist: false, bumpRevision: true });
  });
}

export function useAppSettings() {
  ensureSettingsSync();

  const currentSnapshot = useSyncExternalStore(
    subscribeAppSettings,
    getAppSettingsSnapshot,
    () => snapshot,
  );

  return currentSnapshot;
}

export function useSettings() {
  const { settings, revision } = useAppSettings();

  return {
    ...settings,
    settingsRevision: revision,
    setLocale: (value: LocaleCode) => patchAppSettings({ locale: value }),
    setAppearance: (value: AppearanceMode) =>
      patchAppSettings({ appearance: value }),
    setAccentColor: (value: AccentColorId) =>
      patchAppSettings({ accentColor: value }),
    setCompanionPersonaId: (value: GeneralSettings["companionPersonaId"]) =>
      patchAppSettings({ companionPersonaId: value }),
    setTalkFrequency: (value: TalkFrequency) =>
      patchAppSettings({ talkFrequency: value }),
    setModelRoute: (value: ModelRoute) => patchAppSettings({ modelRoute: value }),
    setLocalFallbackEnabled: (value: boolean) =>
      patchAppSettings({ localFallbackEnabled: value }),
    setNickname: (value: string) => patchAppSettings({ nickname: value }),
    setNightCareEnabled: (value: boolean) =>
      patchAppSettings({ nightCareEnabled: value }),
    setAnalysisEnabled: (value: boolean) =>
      patchAppSettings({ analysisEnabled: value }),
    setProactiveTriggerEnabled: (value: boolean) =>
      patchAppSettings({ proactiveTriggerEnabled: value }),
    setPrivacyFilterEnabled: (value: boolean) =>
      patchAppSettings({ privacyFilterEnabled: value }),
    setCustomPrivacyKeywords: (value: string[]) =>
      patchAppSettings({ customPrivacyKeywords: value }),
    setLocalModelPath: (value: string | null) =>
      patchAppSettings({ localModelPath: value }),
    setLlamaServerBinaryPath: (value: string | null) =>
      patchAppSettings({ llamaServerBinaryPath: value }),
    setLlamaServerHost: (value: string) =>
      patchAppSettings({ llamaServerHost: value }),
    setLlamaServerPort: (value: number) =>
      patchAppSettings({ llamaServerPort: value }),
    talkFrequencyOptions: getTalkFrequencyOptions,
    modelRouteOptions: getModelRouteOptions,
    localeOptions: getLocaleOptions,
    appearanceOptions: getAppearanceOptions,
  };
}
