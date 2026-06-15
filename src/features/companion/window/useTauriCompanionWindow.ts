import { invoke } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../../../lib/tauriRuntime";

let contentElement: HTMLElement | null = null;

export async function syncTauriWindowToElement(element: HTMLElement | null) {
  if (!element || !isTauriRuntime()) return;

  const window = getCurrentWebviewWindow();
  if (window.label !== "companion") return;

  const { width, height } = element.getBoundingClientRect();
  const nextWidth = Math.max(1, Math.ceil(width));
  const nextHeight = Math.max(1, Math.ceil(height));

  await window.setSize(new LogicalSize(nextWidth, nextHeight));
  await invoke("sync_companion_window_position");
}

export async function resyncTauriCompanionWindow() {
  await syncTauriWindowToElement(contentElement);
}

export function useTauriCompanionWindow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const element = ref.current;
    if (!element) return;

    contentElement = element;

    const sync = () => {
      void syncTauriWindowToElement(element);
    };

    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (contentElement === element) {
        contentElement = null;
      }
    };
  }, []);

  return ref;
}
