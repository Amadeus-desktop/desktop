import { invoke } from "@tauri-apps/api/core";
import {
  browserPreviewDetail,
  readBrowserSettings,
  writeBrowserSettings,
} from "../../mocks/settings";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import { initialSettings, normalizeGeneralSettings } from "./settings";
import type { GeneralSettings } from "./types";

export type LlamaSidecarStatus = {
  configured: boolean;
  running: boolean;
  detail: string;
};

export async function loadGeneralSettings(): Promise<GeneralSettings> {
  if (!isTauriRuntime()) {
    return normalizeGeneralSettings(readBrowserSettings());
  }

  const settings = await invoke<GeneralSettings>("get_app_settings");
  return normalizeGeneralSettings({ ...initialSettings, ...settings });
}

export async function saveGeneralSettings(
  settings: GeneralSettings,
): Promise<GeneralSettings> {
  if (!isTauriRuntime()) {
    return writeBrowserSettings(normalizeGeneralSettings(settings));
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
      detail: browserPreviewDetail,
    };
  }

  return invoke<LlamaSidecarStatus>("get_llama_sidecar_status");
}

export { loadLlmProviderHealth, generateTestUtterance } from "../llm/llmRepository";
export type { LlmProviderHealth, LlmGeneration } from "../llm/types";
