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

export function createMainWindowLifecycle({
  applyLayoutMode,
  animateLayoutMode,
  log = logger,
}: MainWindowLifecycleDeps) {
  return {
    requestMainWindowLayout(request: MainWindowLayoutRequest) {
      log.info("window", "main lifecycle layout requested", {
        mode: request.mode,
        reason: request.reason,
        animated: Boolean(request.animated),
        durationMs: request.durationMs,
        priority: request.priority ?? 0,
      });

      if (request.animated) {
        return animateLayoutMode(request.mode, request.durationMs);
      }

      return applyLayoutMode(request.mode);
    },
  };
}

const mainWindowLifecycle = createMainWindowLifecycle({
  applyLayoutMode: requestMainWindowLayoutMode,
  animateLayoutMode: requestAnimatedMainWindowLayoutMode,
});

export const requestMainWindowLayout =
  mainWindowLifecycle.requestMainWindowLayout;
