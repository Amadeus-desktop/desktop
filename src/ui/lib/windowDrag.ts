import type { MouseEvent as ReactMouseEvent } from "react";
import { startMainWindowDrag } from "../../lib/tauri/mainWindowChrome";
import { isTauriRuntime } from "../../lib/tauri/runtime";

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, label, [role='button'], [data-no-drag]";

export function createWindowDragHandler() {
  return (event: ReactMouseEvent) => {
    if (!isTauriRuntime() || event.button !== 0) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;

    void startMainWindowDrag();
  };
}

export function startWindowDrag() {
  if (!isTauriRuntime()) return;
  void startMainWindowDrag();
}
