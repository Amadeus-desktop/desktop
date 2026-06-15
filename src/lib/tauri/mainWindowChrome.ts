import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "./runtime";

const TRANSPARENT = { red: 0, green: 0, blue: 0, alpha: 0 } as const;

export async function startMainWindowDrag() {
  if (!isTauriRuntime()) return;
  await invoke("start_main_window_drag");
}

export async function ensureMainWebviewTransparency() {
  if (!isTauriRuntime()) return;

  const window = getCurrentWebviewWindow();
  if (window.label !== "main") return;

  await window.setBackgroundColor(TRANSPARENT);
}
