import { useEffect, useRef } from "react";
import { logger } from "../../observability/logger";
import { isTauriRuntime } from "./runtime";

const DRAG_THRESHOLD_PX = 4;

/** Observe onboarding drag gestures without mutating root opacity. */
export function useTauriWindowDragOpacity<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const element = ref.current;
    if (!element) return;

    let armed = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      armed = true;
      dragging = false;
      startX = event.clientX;
      startY = event.clientY;
      logger.info("window", "onboarding drag armed", {
        x: startX,
        y: startY,
      });
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!armed || dragging) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;

      dragging = true;
      logger.info("window", "onboarding drag threshold crossed", {
        dx,
        dy,
        thresholdPx: DRAG_THRESHOLD_PX,
      });
    };

    const release = () => {
      const wasDragging = dragging;
      armed = false;
      dragging = false;
      logger.info("window", "onboarding drag released", {
        wasDragging,
      });
    };

    const observeClickWithoutHide = () => {
      if (!armed || dragging) return;
      logger.info("window", "onboarding click ended without drag");
    };

    element.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", observeClickWithoutHide);
    window.addEventListener("mouseup", release);
    window.addEventListener("blur", release);

    return () => {
      element.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", observeClickWithoutHide);
      window.removeEventListener("mouseup", release);
      window.removeEventListener("blur", release);
    };
  }, []);

  return ref;
}
