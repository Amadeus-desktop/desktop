import { invoke } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../../lib/tauriRuntime";
import type { CompanionMode } from "../types";
import { COMPANION_WINDOW_LAYOUTS } from "./layouts";

export async function syncCompanionWindow(mode: CompanionMode) {
  if (!isTauriRuntime()) return;

  const window = getCurrentWebviewWindow();
  if (window.label !== "companion") return;

  const layout = COMPANION_WINDOW_LAYOUTS[mode];
  await window.setSize(new LogicalSize(layout.width, layout.height));
  await invoke("sync_companion_window_position");
}
