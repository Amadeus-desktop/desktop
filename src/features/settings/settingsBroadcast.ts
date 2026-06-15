import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import type { GeneralSettings } from "./types";

export const SETTINGS_CHANGED_EVENT = "amadeus:settings-changed";

export async function broadcastSettingsChanged(
  settings: GeneralSettings,
): Promise<void> {
  if (!isTauriRuntime()) {
    window.dispatchEvent(
      new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }),
    );
    return;
  }

  await emit(SETTINGS_CHANGED_EVENT, settings);
}

export function listenForSettingsChanges(
  handler: (settings: GeneralSettings) => void,
): () => void {
  if (!isTauriRuntime()) {
    const listener = (event: Event) => {
      handler((event as CustomEvent<GeneralSettings>).detail);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, listener);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, listener);
  }

  let unlisten: UnlistenFn | undefined;
  void listen<GeneralSettings>(SETTINGS_CHANGED_EVENT, (event) => {
    handler(event.payload);
  }).then((dispose) => {
    unlisten = dispose;
  });

  return () => {
    unlisten?.();
  };
}
