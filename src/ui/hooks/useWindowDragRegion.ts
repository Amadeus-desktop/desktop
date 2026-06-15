import { useEffect, useRef } from "react";
import { startMainWindowDrag } from "../../lib/tauri/mainWindowChrome";
import { isTauriRuntime } from "../../lib/tauri/runtime";

/** Native mousedown → Rust start_dragging (reliable on macOS transparent WebViews). */
export function useWindowDragRegion<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const element = ref.current;
    if (!element) return;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      void startMainWindowDrag();
    };

    element.addEventListener("mousedown", onMouseDown);
    return () => element.removeEventListener("mousedown", onMouseDown);
  }, []);

  return ref;
}
