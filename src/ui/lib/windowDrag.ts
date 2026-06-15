import type { PointerEvent as ReactPointerEvent } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../lib/tauri/runtime";

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, label, [role='button'], [data-no-drag]";

export function createWindowDragHandler() {
  return (event: ReactPointerEvent) => {
    if (!isTauriRuntime() || event.button !== 0) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;

    event.stopPropagation();
    void getCurrentWebviewWindow().startDragging().catch(() => {
      // Drag may fail if the pointer is no longer pressed.
    });
  };
}

export function startWindowDrag() {
  if (!isTauriRuntime()) return;
  void getCurrentWebviewWindow().startDragging().catch(() => {});
}
