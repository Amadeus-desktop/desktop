import { Store } from "@tauri-apps/plugin-store";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import { initialSettings } from "./settings";
import type { GeneralSettings } from "./types";

const SETTINGS_STORE_PATH = "settings.json";
const SETTINGS_KEY = "general";

let browserSettings = initialSettings;

export async function loadGeneralSettings(): Promise<GeneralSettings> {
  if (!isTauriRuntime()) {
    return browserSettings;
  }

  const store = await Store.load(SETTINGS_STORE_PATH, {
    defaults: {
      [SETTINGS_KEY]: initialSettings,
    },
  });

  return (await store.get<GeneralSettings>(SETTINGS_KEY)) ?? initialSettings;
}

export async function saveGeneralSettings(settings: GeneralSettings) {
  if (!isTauriRuntime()) {
    browserSettings = settings;
    return;
  }

  const store = await Store.load(SETTINGS_STORE_PATH, {
    defaults: {
      [SETTINGS_KEY]: initialSettings,
    },
  });
  await store.set(SETTINGS_KEY, settings);
}
