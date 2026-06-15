import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "./runtime";

export async function toggleWebviewDevTools() {
  if (!isTauriRuntime()) return;

  const window = getCurrentWebviewWindow();
  await invoke("plugin:webview|internal_toggle_devtools", {
    label: window.label,
  });
}
