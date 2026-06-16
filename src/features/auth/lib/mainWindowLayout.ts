import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { createSerializedAsyncQueue } from "../../../lib/async/serializedAsyncQueue";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";
import {
  controlCenterWindowPolicy,
  onboardingWindowPolicy,
  readControlCenterWindowSize,
  type ControlCenterWindowSize,
} from "../../../ui/layout/controlCenterPreferences";

export type MainWindowLayoutMode = "control-center" | "onboarding";
const enqueueMainWindowLayout = createSerializedAsyncQueue();
export const MAIN_WINDOW_ANIMATION_DURATION_MS = 680;
const MAIN_WINDOW_ANIMATION_COMPLETE_EVENT = "main-window-animation-complete";
const ANIMATION_COMPLETION_TIMEOUT_BUFFER_MS = 400;

function getMainWebviewWindow() {
  if (!isTauriRuntime()) return null;

  const webviewWindow = getCurrentWebviewWindow();
  if (webviewWindow.label !== "main") return null;

  return webviewWindow;
}

async function ensureMainWindowVisible(
  webviewWindow: NonNullable<ReturnType<typeof getMainWebviewWindow>>,
) {
  const visible = await webviewWindow.isVisible();
  if (!visible) {
    await webviewWindow.show();
    await webviewWindow.setFocus();
  }
}

export async function readMainWindowLogicalSize() {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return null;

  const [size, scaleFactor] = await Promise.all([
    webviewWindow.outerSize(),
    webviewWindow.scaleFactor(),
  ]);

  return {
    width: Math.round(size.width / scaleFactor),
    height: Math.round(size.height / scaleFactor),
  };
}

export async function centerMainWindowOnMonitor() {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;

  await webviewWindow.center();
}

async function applyMinSizeForMode(
  webviewWindow: NonNullable<ReturnType<typeof getMainWebviewWindow>>,
  mode: MainWindowLayoutMode,
) {
  if (mode === "onboarding") {
    await webviewWindow.setMinSize(
      new LogicalSize(
        onboardingWindowPolicy.minWidth,
        onboardingWindowPolicy.minHeight,
      ),
    );
    return;
  }

  await webviewWindow.setMinSize(
    new LogicalSize(
      controlCenterWindowPolicy.minWidth,
      controlCenterWindowPolicy.minHeight,
    ),
  );
}

async function setMainWindowLogicalSizeOnMonitor(
  width: number,
  height: number,
) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;

  if (isTauriRuntime()) {
    await invoke("set_main_window_logical_size_command", {
      width,
      height,
    });
    return;
  }

  await webviewWindow.setSize(new LogicalSize(width, height));
  await webviewWindow.center();
}

export function clampControlCenterSize(
  width: number,
  height: number,
): ControlCenterWindowSize {
  return {
    width: Math.max(controlCenterWindowPolicy.minWidth, Math.min(width, 1600)),
    height: Math.max(
      controlCenterWindowPolicy.minHeight,
      Math.min(height, 1200),
    ),
  };
}

function resolveMainWindowTargetSize(mode: MainWindowLayoutMode) {
  if (mode === "onboarding") {
    return {
      width: onboardingWindowPolicy.width,
      height: onboardingWindowPolicy.height,
    };
  }

  const saved = readControlCenterWindowSize();
  return clampControlCenterSize(
    saved?.width ?? controlCenterWindowPolicy.defaultWidth,
    saved?.height ?? controlCenterWindowPolicy.defaultHeight,
  );
}

export async function applyMainWindowLayoutMode(mode: MainWindowLayoutMode) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;
  const beganAt = performance.now();

  await ensureMainWindowVisible(webviewWindow);
  await applyMinSizeForMode(webviewWindow, mode);
  logger.info("window", "main layout apply started", { mode });

  const target = resolveMainWindowTargetSize(mode);
  await setMainWindowLogicalSizeOnMonitor(target.width, target.height);
  logger.info("window", "main layout apply completed", {
    mode,
    durationMs: Math.round(performance.now() - beganAt),
    width: target.width,
    height: target.height,
  });
}

export async function animateMainWindowLayoutMode(
  mode: MainWindowLayoutMode,
  durationMs = MAIN_WINDOW_ANIMATION_DURATION_MS,
) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;

  await ensureMainWindowVisible(webviewWindow);
  await applyMinSizeForMode(webviewWindow, mode);
  const target = resolveMainWindowTargetSize(mode);

  if (!isTauriRuntime()) {
    await applyMainWindowLayoutMode(mode);
    return;
  }

  logger.info("window", "main layout native animation started", {
    mode,
    durationMs,
    width: target.width,
    height: target.height,
    policy: "monitor-centered-native",
  });

  // Hold the serialized layout queue until the NATIVE animation actually
  // finishes. The Rust command starts the NSAnimationContext animation and
  // emits MAIN_WINDOW_ANIMATION_COMPLETE_EVENT on completion. Awaiting that
  // event (instead of guessing with a JS sleep) keeps the queue's guarantee
  // that two window animations can never overlap. A timeout fallback resolves
  // the await if the event is ever missed.
  let settled = false;
  let resolveCompletion: () => void = () => {};
  const completion = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });
  const finish = () => {
    if (settled) return;
    settled = true;
    resolveCompletion();
  };

  const unlisten = await webviewWindow.once(
    MAIN_WINDOW_ANIMATION_COMPLETE_EVENT,
    () => finish(),
  );
  const timer = window.setTimeout(
    finish,
    durationMs + ANIMATION_COMPLETION_TIMEOUT_BUFFER_MS,
  );

  try {
    await invoke("animate_main_window_logical_size_command", {
      width: target.width,
      height: target.height,
      durationMs,
    });
    await completion;
  } finally {
    window.clearTimeout(timer);
    unlisten();
  }

  logger.info("window", "main layout native animation settled", {
    mode,
    durationMs,
  });
}

export function requestMainWindowLayoutMode(mode: MainWindowLayoutMode) {
  return enqueueMainWindowLayout(() => applyMainWindowLayoutMode(mode));
}

export function requestAnimatedMainWindowLayoutMode(
  mode: MainWindowLayoutMode,
  durationMs?: number,
) {
  return enqueueMainWindowLayout(() =>
    animateMainWindowLayoutMode(mode, durationMs),
  );
}
