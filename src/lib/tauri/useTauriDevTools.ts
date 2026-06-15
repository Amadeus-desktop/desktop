import { useEffect } from "react";
import { toggleWebviewDevTools } from "./devTools";
import { isTauriRuntime } from "./runtime";

function isDevToolsHotkey(event: KeyboardEvent) {
  if (event.code !== "KeyI") return false;

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return isMac
    ? event.metaKey && event.altKey && !event.shiftKey
    : event.ctrlKey && event.shiftKey && !event.altKey;
}

/** Cmd+Option+I (macOS) / Ctrl+Shift+I — opens native WebView inspector. */
export function useTauriDevTools() {
  useEffect(() => {
    if (!import.meta.env.DEV || !isTauriRuntime()) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (!isDevToolsHotkey(event)) return;
      event.preventDefault();
      void toggleWebviewDevTools();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
