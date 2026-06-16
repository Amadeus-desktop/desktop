import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  SyntheticEvent,
} from "react";
import { startMainWindowDrag } from "../../lib/tauri/mainWindowChrome";
import { isTauriRuntime } from "../../lib/tauri/runtime";

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, label, [role='button'], [data-no-drag]";

function preventNativeDragSideEffects(event: SyntheticEvent) {
  event.preventDefault();
}

export const windowDragGuardProps = {
  onSelectStart: preventNativeDragSideEffects,
  onDragStart: preventNativeDragSideEffects,
} as const;

export function createWindowDragHandler() {
  return (event: ReactMouseEvent) => {
    if (!isTauriRuntime() || event.button !== 0) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;

    // Block text/element selection while the native drag session starts.
    event.preventDefault();
    event.stopPropagation();
    void startMainWindowDrag();
  };
}

export function startWindowDrag() {
  if (!isTauriRuntime()) return;
  void startMainWindowDrag();
}

export type WindowDragRegionProps = {
  onMouseDown: ReturnType<typeof createWindowDragHandler>;
  onSelectStart: (event: ReactDragEvent | React.SyntheticEvent) => void;
  onDragStart: (event: ReactDragEvent) => void;
};

const handleWindowDragMouseDown = createWindowDragHandler();

/** Shared props for leaf drag regions (titlebar strip, panel header, etc.). */
export const windowDragRegionProps: WindowDragRegionProps = {
  onMouseDown: handleWindowDragMouseDown,
  ...windowDragGuardProps,
};
