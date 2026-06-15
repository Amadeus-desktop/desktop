import { resyncTauriCompanionWindow } from "./useTauriCompanionWindow";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";

const COMPANION_SPACE_CHANGED_EVENT = "companion-space-changed";

export function useCompanionWindowLifecycle() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    const window = getCurrentWebviewWindow();
    if (window.label !== "companion") return;

    const unlisteners: Array<() => void> = [];

    void window
      .listen("tauri://focus", () => {
        logger.info("window", "companion focus event requested resync");
        void resyncTauriCompanionWindow();
      })
      .then((unlisten) => {
        unlisteners.push(unlisten);
      });

    void window
      .listen("tauri://scale-change", () => {
        logger.info("window", "companion scale-change event requested resync");
        void resyncTauriCompanionWindow();
      })
      .then((unlisten) => {
        unlisteners.push(unlisten);
      });

    void listen(COMPANION_SPACE_CHANGED_EVENT, () => {
      logger.info("window", "companion space-change event requested resync");
      void resyncTauriCompanionWindow();
    }).then((unlisten) => {
      unlisteners.push(unlisten);
    });

    return () => {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);
}
