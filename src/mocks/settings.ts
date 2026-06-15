import type { GeneralSettings } from "../features/settings/types";
import { initialSettings } from "../features/settings/settings";

let browserSettings: GeneralSettings = { ...initialSettings };

export function readBrowserSettings(): GeneralSettings {
  return { ...initialSettings, ...browserSettings };
}

export function writeBrowserSettings(settings: GeneralSettings): GeneralSettings {
  browserSettings = settings;
  return browserSettings;
}

export const browserPreviewDetail = "browser preview";
