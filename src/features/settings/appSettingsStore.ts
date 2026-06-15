import { useSyncExternalStore } from "react";
import { setLocale, type LocaleCode } from "../../i18n";
import {
  getLocaleOptions,
  getModelRouteOptions,
  getTalkFrequencyOptions,
  initialSettings,
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

const listeners = new Set<() => void>();
let hydratePromise: Promise<GeneralSettings> | null = null;
let persistTimer: number | null = null;
let persistSequence = 0;

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
  snapshot = {
    settings,
    hydrated: options.hydrated ?? snapshot.hydrated,
    revision: options.bumpRevision ? snapshot.revision + 1 : snapshot.revision,
  };
  setLocale(settings.locale);
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

  schedulePersist(settings);
}

export function patchAppSettings(patch: Partial<GeneralSettings>) {
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
        replaceSnapshot(savedSettings, { bumpRevision: true });
        await broadcastSettingsChanged(savedSettings);
      })
      .catch(() => {
        if (sequence !== persistSequence) return;
        replaceSnapshot(settings, { bumpRevision: true });
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
        applyAppSettings(loadedSettings, {
          hydrated: true,
          persist: false,
          bumpRevision: true,
        });
        return loadedSettings;
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
  };
}
