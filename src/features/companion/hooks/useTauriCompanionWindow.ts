import { invoke } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";
import { COMPANION_WINDOW_MEASURE_INSET } from "../lib/measureInsets";
import { getCompanionLayoutMode } from "../lib/companionLayoutMode";
import { mergeCompanionContentRect } from "../lib/companionLayoutTargets";
import { measureCompanionContentRect } from "../lib/measureCompanionContent";
import type { CompanionMode } from "../types";
import {
  computeCompanionWindowSize,
  shouldSkipCompanionResize,
  type CompanionWindowSize,
} from "./companionWindowSyncPolicy";

let contentElement: HTMLElement | null = null;
let lastAppliedSize: CompanionWindowSize | null = null;
let lastAppliedLayoutMode: CompanionMode | null = null;
let syncInFlight = false;
let pendingSyncElement: HTMLElement | null = null;
let pendingForceResync = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

const COMPANION_RESIZE_DEBOUNCE_MS = 80;

type CompanionWindowSyncOptions = {
  forcePositionSync?: boolean;
  forceResync?: boolean;
};

function clearAppliedCompanionWindowSize() {
  lastAppliedSize = null;
  lastAppliedLayoutMode = null;
}

export async function syncTauriWindowToElement(
  element: HTMLElement | null,
  options: CompanionWindowSyncOptions = {},
) {
  if (!element || !isTauriRuntime()) return;

  if (syncInFlight) {
    pendingSyncElement = element;
    pendingForceResync = pendingForceResync || options.forceResync === true;
    logger.info("window", "companion native resize coalesced while in-flight");
    return;
  }

  const window = getCurrentWebviewWindow();
  if (window.label !== "companion") return;

  const layoutMode = getCompanionLayoutMode();
  const measured = measureCompanionContentRect(element);
  const contentRect = mergeCompanionContentRect(measured, layoutMode);
  const nextSize = computeCompanionWindowSize(
    contentRect,
    COMPANION_WINDOW_MEASURE_INSET,
  );
  if (
    shouldSkipCompanionResize(
      lastAppliedSize,
      nextSize,
      layoutMode,
      lastAppliedLayoutMode,
    )
  ) {
    logger.info("window", "companion native resize skipped unchanged size", {
      width: nextSize.width,
      height: nextSize.height,
      layoutMode,
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
    lastAppliedLayoutMode = layoutMode;
    await invoke("sync_companion_window_position", {
      width: nextSize.width,
      height: nextSize.height,
    });
    const durationMs = performance.now() - beganAt;
    const level = durationMs > 34 ? "warn" : "info";
    logger[level]("window", "companion native resize synced", {
      durationMs: Math.round(durationMs),
      width: nextSize.width,
      height: nextSize.height,
      layoutMode,
    });
  } catch (error) {
    logger.error("window", "companion native resize failed", {
      layoutMode,
      width: nextSize.width,
      height: nextSize.height,
      error,
    });
  } finally {
    syncInFlight = false;
  }

  const pending = pendingSyncElement;
  const forcePending = pendingForceResync;
  pendingSyncElement = null;
  pendingForceResync = false;
  if (pending) {
    if (forcePending) {
      clearAppliedCompanionWindowSize();
    }
    void syncTauriWindowToElement(pending, {
      forcePositionSync: options.forcePositionSync,
    });
  }
}

export async function resyncTauriCompanionWindow() {
  if (!contentElement) return;
  scheduleTauriWindowSync(contentElement, { forcePositionSync: true });
}

/** Mode transitions need an immediate, non-debounced resize with a fresh measure. */
export function forceResyncTauriCompanionWindow() {
  if (!contentElement) return;

  clearAppliedCompanionWindowSize();
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  void syncTauriWindowToElement(contentElement, { forceResync: true });
}

function scheduleTauriWindowSync(
  element: HTMLElement,
  options: CompanionWindowSyncOptions & { forceResync?: boolean } = {},
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
        clearAppliedCompanionWindowSize();
        pendingSyncElement = null;
        pendingForceResync = false;
      }
    };
  }, []);

  return ref;
}
