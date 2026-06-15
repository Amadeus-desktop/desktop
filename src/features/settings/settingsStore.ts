import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import { initialSettings } from "./settings";
import type { GeneralSettings } from "./types";

let browserSettings = initialSettings;

export type LlamaSidecarStatus = {
  configured: boolean;
  running: boolean;
  detail: string;
};

export async function loadGeneralSettings(): Promise<GeneralSettings> {
  if (!isTauriRuntime()) {
    return { ...initialSettings, ...browserSettings };
  }

  const settings = await invoke<GeneralSettings>("get_app_settings");
  return { ...initialSettings, ...settings };
}

export async function saveGeneralSettings(
  settings: GeneralSettings,
): Promise<GeneralSettings> {
  if (!isTauriRuntime()) {
    browserSettings = settings;
    return browserSettings;
  }

  return invoke<GeneralSettings>("update_app_settings", {
    settings,
  });
}

export async function loadLlamaSidecarStatus(): Promise<LlamaSidecarStatus> {
  if (!isTauriRuntime()) {
    return {
      configured: false,
      running: false,
      detail: "browser preview",
    };
  }

  return invoke<LlamaSidecarStatus>("get_llama_sidecar_status");
}
