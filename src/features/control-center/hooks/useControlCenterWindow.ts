import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import {
  writeControlCenterWindowSize,
} from "../../../ui/layout/controlCenterPreferences";
import {
  clampControlCenterSize,
  readMainWindowLogicalSize,
} from "../../auth/lib/mainWindowLayout";

export function useControlCenterWindow(enabled = true) {
  useEffect(() => {
    if (!enabled || !isTauriRuntime()) return;

    const webviewWindow = getCurrentWebviewWindow();
    if (webviewWindow.label !== "main") return;

    let disposed = false;
    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    let unlisten: (() => void) | undefined;

    function persistCurrentSize(options: { ignoreDisposed?: boolean } = {}) {
      void readMainWindowLogicalSize().then((size) => {
        if ((!options.ignoreDisposed && disposed) || !size) return;
        writeControlCenterWindowSize(
          clampControlCenterSize(size.width, size.height),
        );
      });
    }

    void (async () => {
      unlisten = await webviewWindow.onResized(() => {
        if (persistTimer !== null) {
          clearTimeout(persistTimer);
        }

        persistTimer = setTimeout(() => {
          persistTimer = null;
          if (disposed) return;
          persistCurrentSize();
        }, 120);
      });
    })();

    return () => {
      persistCurrentSize({ ignoreDisposed: true });
      disposed = true;
      if (persistTimer !== null) {
        clearTimeout(persistTimer);
      }
      unlisten?.();
    };
  }, [enabled]);
}
