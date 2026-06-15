import { useEffect, useRef } from "react";
import { logger } from "../../observability/logger";
import { isTauriRuntime } from "./runtime";

const DRAG_THRESHOLD_PX = 4;

/**
 * Hide the webview only after a real drag starts (not on click).
 * macOS transparent WKWebView workaround — Tauri #6876.
 */
export function useTauriWindowDragOpacity<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const element = ref.current;
    if (!element) return;

    let armed = false;
    let hidden = false;
    let startX = 0;
    let startY = 0;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      armed = true;
      hidden = false;
      startX = event.clientX;
      startY = event.clientY;
      logger.info("window", "onboarding drag opacity armed", {
        x: startX,
        y: startY,
      });
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!armed || hidden) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;

      hidden = true;
      document.documentElement.style.opacity = "0";
      logger.warn("window", "onboarding drag opacity hidden", {
        dx,
        dy,
        thresholdPx: DRAG_THRESHOLD_PX,
      });
    };

    const restore = () => {
      const wasArmed = armed;
      const wasHidden = hidden;
      armed = false;
      if (!hidden) return;
      hidden = false;
      requestAnimationFrame(() => {
        document.documentElement.style.opacity = "1";
        logger.info("window", "onboarding drag opacity restored", {
          wasArmed,
          wasHidden,
        });
      });
    };

    const observeClickWithoutHide = () => {
      if (!armed || hidden) return;
      logger.info("window", "onboarding drag ended without opacity hide");
    };

    element.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", observeClickWithoutHide);
    window.addEventListener("mouseup", restore);
    window.addEventListener("blur", restore);

    return () => {
      element.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", observeClickWithoutHide);
      window.removeEventListener("mouseup", restore);
      window.removeEventListener("blur", restore);
      document.documentElement.style.opacity = "1";
    };
  }, []);

  return ref;
}
