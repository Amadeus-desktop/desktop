import { useEffect } from "react";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../../lib/tauriRuntime";
import {
  controlCenterWindowPolicy,
  readControlCenterWindowSize,
} from "../../../ui/layout/controlCenterPreferences";
import { onboardingWindowPolicy } from "../../../ui/layout/controlCenterPreferences";

function clampControlCenterSize(width: number, height: number) {
  return {
    width: Math.max(
      controlCenterWindowPolicy.minWidth,
      Math.min(width, 1600),
    ),
    height: Math.max(
      controlCenterWindowPolicy.minHeight,
      Math.min(height, 1200),
    ),
  };
}

export function useAuthWindow(isAuthenticated: boolean, hydrated: boolean) {
  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) return;

    const webviewWindow = getCurrentWebviewWindow();
    if (webviewWindow.label !== "main") return;

    void (async () => {
      if (isAuthenticated) {
        const saved = readControlCenterWindowSize();
        const next = clampControlCenterSize(
          saved?.width ?? controlCenterWindowPolicy.defaultWidth,
          saved?.height ?? controlCenterWindowPolicy.defaultHeight,
        );
        await webviewWindow.setSize(new LogicalSize(next.width, next.height));
        return;
      }

      await webviewWindow.setSize(
        new LogicalSize(
          onboardingWindowPolicy.width,
          onboardingWindowPolicy.height,
        ),
      );
    })();
  }, [hydrated, isAuthenticated]);
}
