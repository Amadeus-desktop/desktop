import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../lib/tauri/runtime";
import { logger } from "../../observability/logger";

export type FrontendReadyWindowLabel = "main" | "companion";

const FIRST_PAINT_EVENT_BY_WINDOW: Record<FrontendReadyWindowLabel, string> = {
  main: "main_window_first_paint",
  companion: "companion_window_first_paint",
};

export function scheduleFrontendFirstPaintRecord(
  windowLabel: FrontendReadyWindowLabel,
) {
  if (!isTauriRuntime()) return;

  const event = FIRST_PAINT_EVENT_BY_WINDOW[windowLabel];
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const occurredAtMs = Math.round(performance.now());
      logger.info("startup", "frontend first paint observed", {
        windowLabel,
        event,
        occurredAtMs,
      });
      void invoke("record_frontend_ready", {
        windowLabel,
        event,
        occurredAtMs,
      }).catch((error) => {
        logger.warn("startup", "frontend first paint record failed", {
          windowLabel,
          event,
          error,
        });
      });
    });
  });
}
