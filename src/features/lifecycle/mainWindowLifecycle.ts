import {
  requestAnimatedMainWindowLayoutMode,
  requestMainWindowLayoutMode,
  type MainWindowLayoutMode,
} from "../auth/lib/mainWindowLayout";
import { logger } from "../../observability/logger";

export type MainWindowLayoutReason =
  | "initial-hydration"
  | "login-complete"
  | "auth-callback"
  | "onboarding-complete"
  | "logout"
  | "tray-open"
  | "protocol-open";

export type MainWindowLayoutRequest = {
  mode: MainWindowLayoutMode;
  reason: MainWindowLayoutReason;
  animated?: boolean;
  durationMs?: number;
  priority?: number;
};

export type MainWindowLifecycleDeps = {
  applyLayoutMode: (mode: MainWindowLayoutMode) => Promise<void>;
  animateLayoutMode: (
    mode: MainWindowLayoutMode,
    durationMs?: number,
  ) => Promise<void>;
  log?: typeof logger;
};

let nextMainWindowLayoutRequestId = 1;

export function createMainWindowLifecycle({
  applyLayoutMode,
  animateLayoutMode,
  log = logger,
}: MainWindowLifecycleDeps) {
  return {
    async requestMainWindowLayout(request: MainWindowLayoutRequest) {
      const requestId = nextMainWindowLayoutRequestId;
      nextMainWindowLayoutRequestId += 1;
      const requestedAt = performance.now();
      log.info("window", "main lifecycle layout requested", {
        requestId,
        mode: request.mode,
        reason: request.reason,
        animated: Boolean(request.animated),
        durationMs: request.durationMs,
        observabilityPriority: request.priority ?? 0,
      });

      try {
        if (request.animated) {
          await animateLayoutMode(request.mode, request.durationMs);
        } else {
          await applyLayoutMode(request.mode);
        }
        log.info("window", "main lifecycle layout completed", {
          requestId,
          mode: request.mode,
          reason: request.reason,
          animated: Boolean(request.animated),
          observabilityPriority: request.priority ?? 0,
          totalMs: Math.round(performance.now() - requestedAt),
        });
      } catch (error) {
        log.error("window", "main lifecycle layout failed", {
          requestId,
          mode: request.mode,
          reason: request.reason,
          animated: Boolean(request.animated),
          observabilityPriority: request.priority ?? 0,
          totalMs: Math.round(performance.now() - requestedAt),
          error,
        });
        throw error;
      }
    },
  };
}

const mainWindowLifecycle = createMainWindowLifecycle({
  applyLayoutMode: requestMainWindowLayoutMode,
  animateLayoutMode: requestAnimatedMainWindowLayoutMode,
});

export const requestMainWindowLayout =
  mainWindowLifecycle.requestMainWindowLayout;
