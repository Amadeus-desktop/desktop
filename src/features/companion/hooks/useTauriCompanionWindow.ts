import { invoke } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";
import { COMPANION_WINDOW_MEASURE_INSET } from "../lib/measureInsets";
import {
  computeCompanionWindowSize,
  shouldSkipCompanionResize,
  type CompanionWindowSize,
} from "./companionWindowSyncPolicy";

let contentElement: HTMLElement | null = null;
let lastAppliedSize: CompanionWindowSize | null = null;
let syncInFlight = false;
let pendingSyncElement: HTMLElement | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

const COMPANION_RESIZE_DEBOUNCE_MS = 80;

type CompanionWindowSyncOptions = {
  forcePositionSync?: boolean;
};

export async function syncTauriWindowToElement(
  element: HTMLElement | null,
  options: CompanionWindowSyncOptions = {},
) {
  if (!element || !isTauriRuntime()) return;

  if (syncInFlight) {
    pendingSyncElement = element;
    logger.info("window", "companion native resize coalesced while in-flight");
    return;
  }

  const window = getCurrentWebviewWindow();
  if (window.label !== "companion") return;

  const nextSize = computeCompanionWindowSize(
    element.getBoundingClientRect(),
    COMPANION_WINDOW_MEASURE_INSET,
  );
  if (shouldSkipCompanionResize(lastAppliedSize, nextSize)) {
    logger.info("window", "companion native resize skipped unchanged size", {
      width: nextSize.width,
      height: nextSize.height,
      forcePositionSync: Boolean(options.forcePositionSync),
    });
    if (options.forcePositionSync) {
      await invoke("sync_companion_window_position");
      logger.info("window", "companion position-only sync completed", {
        width: nextSize.width,
        height: nextSize.height,
      });
    }
    return;
  }

  const beganAt = performance.now();
  syncInFlight = true;

  try {
    await window.setSize(new LogicalSize(nextSize.width, nextSize.height));
    lastAppliedSize = nextSize;
    await invoke("sync_companion_window_position");
    const durationMs = performance.now() - beganAt;
    const level = durationMs > 34 ? "warn" : "info";
    logger[level]("window", "companion native resize synced", {
      durationMs: Math.round(durationMs),
      width: nextSize.width,
      height: nextSize.height,
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
  scheduleTauriWindowSync(contentElement, { forcePositionSync: true });
}

function scheduleTauriWindowSync(
  element: HTMLElement,
  options: CompanionWindowSyncOptions = {},
) {
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void syncTauriWindowToElement(element, options);
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
