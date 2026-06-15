import { invoke } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";
import { COMPANION_WINDOW_MEASURE_INSET } from "../lib/measureInsets";

let contentElement: HTMLElement | null = null;
let lastAppliedSize: { width: number; height: number } | null = null;
let syncInFlight = false;
let pendingSyncElement: HTMLElement | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

const COMPANION_RESIZE_DEBOUNCE_MS = 80;

export async function syncTauriWindowToElement(element: HTMLElement | null) {
  if (!element || !isTauriRuntime()) return;

  if (syncInFlight) {
    pendingSyncElement = element;
    logger.info("window", "companion native resize coalesced while in-flight");
    return;
  }

  const window = getCurrentWebviewWindow();
  if (window.label !== "companion") return;

  const { width, height } = element.getBoundingClientRect();
  const inset = COMPANION_WINDOW_MEASURE_INSET;
  const nextWidth = Math.max(1, Math.ceil(width) + inset * 2);
  const nextHeight = Math.max(1, Math.ceil(height) + inset * 2);
  if (
    lastAppliedSize?.width === nextWidth &&
    lastAppliedSize.height === nextHeight
  ) {
    logger.info("window", "companion native resize skipped unchanged size", {
      width: nextWidth,
      height: nextHeight,
    });
    return;
  }

  const beganAt = performance.now();
  syncInFlight = true;

  try {
    await window.setSize(new LogicalSize(nextWidth, nextHeight));
    lastAppliedSize = { width: nextWidth, height: nextHeight };
    await invoke("sync_companion_window_position");
    const durationMs = performance.now() - beganAt;
    const level = durationMs > 34 ? "warn" : "info";
    logger[level]("window", "companion native resize synced", {
      durationMs: Math.round(durationMs),
      width: nextWidth,
      height: nextHeight,
    });
  } finally {
    syncInFlight = false;
  }

  const pending = pendingSyncElement;
  pendingSyncElement = null;
  if (pending) {
    scheduleTauriWindowSync(pending);
  }
}

export async function resyncTauriCompanionWindow() {
  if (!contentElement) return;
  scheduleTauriWindowSync(contentElement);
}

function scheduleTauriWindowSync(element: HTMLElement) {
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void syncTauriWindowToElement(element);
  }, COMPANION_RESIZE_DEBOUNCE_MS);
}

export function useTauriCompanionWindow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const element = ref.current;
    if (!element) return;

    contentElement = element;

    const sync = () => scheduleTauriWindowSync(element);

    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (syncTimer !== null) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }
      if (contentElement === element) {
        contentElement = null;
        lastAppliedSize = null;
        pendingSyncElement = null;
      }
    };
  }, []);

  return ref;
}
