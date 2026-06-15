import { resyncTauriCompanionWindow } from "./useTauriCompanionWindow";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";

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

    return () => {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);
}
