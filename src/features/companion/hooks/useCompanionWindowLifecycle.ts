import { resyncTauriCompanionWindow } from "./useTauriCompanionWindow";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";

const COMPANION_SPACE_CHANGED_EVENT = "companion-space-changed";

export function useCompanionWindowLifecycle() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    const window = getCurrentWebviewWindow();
    if (window.label !== "companion") return;

    const unlisteners: Array<() => void> = [];

    void window
      .listen("tauri://focus", () => {
        void resyncTauriCompanionWindow();
      })
      .then((unlisten) => {
        unlisteners.push(unlisten);
      });

    void window
      .listen("tauri://scale-change", () => {
        void resyncTauriCompanionWindow();
      })
      .then((unlisten) => {
        unlisteners.push(unlisten);
      });

    void listen(COMPANION_SPACE_CHANGED_EVENT, () => {
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
