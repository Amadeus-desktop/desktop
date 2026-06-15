import { useEffect } from "react";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../../lib/tauriRuntime";
import {
  controlCenterWindowPolicy,
  readControlCenterWindowSize,
  writeControlCenterWindowSize,
} from "../../../ui/layout/controlCenterPreferences";

function clampWindowSize(width: number, height: number) {
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

async function readLogicalWindowSize(
  webviewWindow: ReturnType<typeof getCurrentWebviewWindow>,
) {
  const [size, scaleFactor] = await Promise.all([
    webviewWindow.innerSize(),
    webviewWindow.scaleFactor(),
  ]);

  return {
    width: Math.round(size.width / scaleFactor),
    height: Math.round(size.height / scaleFactor),
  };
}

export function useControlCenterWindow(enabled = true) {
  useEffect(() => {
    if (!enabled || !isTauriRuntime()) return;

    const webviewWindow = getCurrentWebviewWindow();
    if (webviewWindow.label !== "main") return;

    let disposed = false;
    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const saved = readControlCenterWindowSize();
      const next = clampWindowSize(
        saved?.width ?? controlCenterWindowPolicy.defaultWidth,
        saved?.height ?? controlCenterWindowPolicy.defaultHeight,
      );

      await webviewWindow.setSize(new LogicalSize(next.width, next.height));

      unlisten = await webviewWindow.onResized(() => {
        if (persistTimer !== null) {
          clearTimeout(persistTimer);
        }

        persistTimer = setTimeout(() => {
          persistTimer = null;
          if (disposed) return;

          void readLogicalWindowSize(webviewWindow).then((size) => {
            if (disposed) return;
            writeControlCenterWindowSize(
              clampWindowSize(size.width, size.height),
            );
          });
        }, 120);
      });
    })();

    return () => {
      disposed = true;
      if (persistTimer !== null) {
        clearTimeout(persistTimer);
      }
      unlisten?.();
    };
  }, [enabled]);
}
