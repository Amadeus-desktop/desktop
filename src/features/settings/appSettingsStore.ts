import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createExternalStore } from "../../lib/createExternalStore";
import { type LocaleCode } from "../../i18n";
import {
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
import type { CharacterId } from "../character/types";

type AppSettingsSnapshot = {
  settings: GeneralSettings;
  hydrated: boolean;
  revision: number;
};

const settingsStore = createExternalStore<AppSettingsSnapshot>({
  settings: initialSettings,
  hydrated: false,
  revision: 0,
});

let confirmedSettings: GeneralSettings = initialSettings;
let hydratePromise: Promise<GeneralSettings> | null = null;
let persistTimer: number | null = null;
let persistSequence = 0;
let pendingHydrationPatch: Partial<GeneralSettings> | null = null;

export function getAppSettingsSnapshot() {
  return settingsStore.getSnapshot();
}

function replaceSnapshot(
  settings: GeneralSettings,
  options: {
    hydrated?: boolean;
    bumpRevision?: boolean;
    notify?: boolean;
  } = {},
) {
  const current = settingsStore.getSnapshot();
  const normalized = normalizeGeneralSettings(settings);
  settingsStore.setSnapshot(
    {
      settings: normalized,
      hydrated: options.hydrated ?? current.hydrated,
      revision: options.bumpRevision ? current.revision + 1 : current.revision,
    },
    { notify: options.notify ?? true },
  );
}

export function applyAppSettings(
  settings: GeneralSettings,
  options: { hydrated?: boolean; persist?: boolean; bumpRevision?: boolean } = {},
) {
  replaceSnapshot(settings, {
    hydrated: options.hydrated,
    bumpRevision: options.bumpRevision,
  });

  if (options.persist === false || !settingsStore.getSnapshot().hydrated) {
    return;
  }

  schedulePersist(settingsStore.getSnapshot().settings);
}

export function patchAppSettings(patch: Partial<GeneralSettings>) {
  if (!settingsStore.getSnapshot().hydrated) {
    pendingHydrationPatch = { ...pendingHydrationPatch, ...patch };
  }
  applyAppSettings({
    ...settingsStore.getSnapshot().settings,
    ...patch,
  });
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
  const snapshot = settingsStore.getSnapshot();
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
        return settingsStore.getSnapshot().settings;
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

export function subscribeAppSettings(listener: () => void) {
  return settingsStore.subscribe(listener);
}

export function useAppSettings() {
  ensureSettingsSync();

  return useSyncExternalStore(
    subscribeAppSettings,
    getAppSettingsSnapshot,
    getAppSettingsSnapshot,
  );
}

export function useSettings() {
  const { settings, revision } = useAppSettings();

  const setLocale = useCallback(
    (value: LocaleCode) => patchAppSettings({ locale: value }),
    [],
  );
  const setAppearance = useCallback(
    (value: AppearanceMode) => patchAppSettings({ appearance: value }),
    [],
  );
  const setAccentColor = useCallback(
    (value: AccentColorId) => patchAppSettings({ accentColor: value }),
    [],
  );
  const setCharacterId = useCallback(
    (value: CharacterId) => patchAppSettings({ characterId: value }),
    [],
  );
  const setCompanionPersonaId = useCallback(
    (value: GeneralSettings["companionPersonaId"]) =>
      patchAppSettings({ companionPersonaId: value }),
    [],
  );
  const setTalkFrequency = useCallback(
    (value: TalkFrequency) => patchAppSettings({ talkFrequency: value }),
    [],
  );
  const setModelRoute = useCallback(
    (value: ModelRoute) => patchAppSettings({ modelRoute: value }),
    [],
  );
  const setLocalFallbackEnabled = useCallback(
    (value: boolean) => patchAppSettings({ localFallbackEnabled: value }),
    [],
  );
  const setNickname = useCallback(
    (value: string) => patchAppSettings({ nickname: value }),
    [],
  );
  const setNightCareEnabled = useCallback(
    (value: boolean) => patchAppSettings({ nightCareEnabled: value }),
    [],
  );
  const setAnalysisEnabled = useCallback(
    (value: boolean) => patchAppSettings({ analysisEnabled: value }),
    [],
  );
  const setProactiveTriggerEnabled = useCallback(
    (value: boolean) => patchAppSettings({ proactiveTriggerEnabled: value }),
    [],
  );
  const setPrivacyFilterEnabled = useCallback(
    (value: boolean) => patchAppSettings({ privacyFilterEnabled: value }),
    [],
  );
  const setCustomPrivacyKeywords = useCallback(
    (value: string[]) => patchAppSettings({ customPrivacyKeywords: value }),
    [],
  );
  const setLocalModelPath = useCallback(
    (value: string | null) => patchAppSettings({ localModelPath: value }),
    [],
  );
  const setLlamaServerBinaryPath = useCallback(
    (value: string | null) => patchAppSettings({ llamaServerBinaryPath: value }),
    [],
  );
  const setLlamaServerHost = useCallback(
    (value: string) => patchAppSettings({ llamaServerHost: value }),
    [],
  );
  const setLlamaServerPort = useCallback(
    (value: number) => patchAppSettings({ llamaServerPort: value }),
    [],
  );

  return useMemo(
    () => ({
      ...settings,
      settingsRevision: revision,
      setLocale,
      setAppearance,
      setAccentColor,
      setCharacterId,
      setCompanionPersonaId,
      setTalkFrequency,
      setModelRoute,
      setLocalFallbackEnabled,
      setNickname,
      setNightCareEnabled,
      setAnalysisEnabled,
      setProactiveTriggerEnabled,
      setPrivacyFilterEnabled,
      setCustomPrivacyKeywords,
      setLocalModelPath,
      setLlamaServerBinaryPath,
      setLlamaServerHost,
      setLlamaServerPort,
      talkFrequencyOptions: getTalkFrequencyOptions,
      modelRouteOptions: getModelRouteOptions,
      localeOptions: getLocaleOptions,
      appearanceOptions: getAppearanceOptions,
    }),
    [
      settings,
      revision,
      setLocale,
      setAppearance,
      setAccentColor,
      setCharacterId,
      setCompanionPersonaId,
      setTalkFrequency,
      setModelRoute,
      setLocalFallbackEnabled,
      setNickname,
      setNightCareEnabled,
      setAnalysisEnabled,
      setProactiveTriggerEnabled,
      setPrivacyFilterEnabled,
      setCustomPrivacyKeywords,
      setLocalModelPath,
      setLlamaServerBinaryPath,
      setLlamaServerHost,
      setLlamaServerPort,
    ],
  );
}
