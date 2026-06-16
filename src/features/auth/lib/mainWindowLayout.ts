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

type LogicalRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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

async function readMainWindowOuterLogicalRect(): Promise<LogicalRect | null> {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return null;

  const [position, size, scaleFactor] = await Promise.all([
    webviewWindow.outerPosition(),
    webviewWindow.outerSize(),
    webviewWindow.scaleFactor(),
  ]);

  return {
    x: position.x / scaleFactor,
    y: position.y / scaleFactor,
    width: size.width / scaleFactor,
    height: size.height / scaleFactor,
  };
}

export async function readMainWindowLogicalSize() {
  const rect = await readMainWindowOuterLogicalRect();
  if (!rect) return null;

  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export async function centerMainWindowOnMonitor() {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;

  await webviewWindow.center();
}

async function setMainWindowLogicalSizeOnMonitor(
  width: number,
  height: number,
  animated = false,
) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;

  if (isTauriRuntime()) {
    await invoke("set_main_window_logical_size_command", {
      width,
      height,
      animated,
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

export async function applyMainWindowLayoutMode(
  mode: MainWindowLayoutMode,
  animated = false,
) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;
  const beganAt = performance.now();

  await ensureMainWindowVisible(webviewWindow);
  logger.info("window", "main layout apply started", { mode });

  if (mode === "onboarding") {
    await webviewWindow.setMinSize(
      new LogicalSize(
        onboardingWindowPolicy.minWidth,
        onboardingWindowPolicy.minHeight,
      ),
    );
    await setMainWindowLogicalSizeOnMonitor(
      onboardingWindowPolicy.width,
      onboardingWindowPolicy.height,
      animated,
    );
    logger.info("window", "main layout apply completed", {
      mode,
      animated,
      durationMs: Math.round(performance.now() - beganAt),
      width: onboardingWindowPolicy.width,
      height: onboardingWindowPolicy.height,
    });
    return;
  }

  const saved = readControlCenterWindowSize();
  const next = clampControlCenterSize(
    saved?.width ?? controlCenterWindowPolicy.defaultWidth,
    saved?.height ?? controlCenterWindowPolicy.defaultHeight,
  );

  await webviewWindow.setMinSize(
    new LogicalSize(
      controlCenterWindowPolicy.minWidth,
      controlCenterWindowPolicy.minHeight,
    ),
  );
  await setMainWindowLogicalSizeOnMonitor(next.width, next.height, animated);
  logger.info("window", "main layout apply completed", {
    mode,
    animated,
    durationMs: Math.round(performance.now() - beganAt),
    width: next.width,
    height: next.height,
  });
}

export async function animateMainWindowLayoutMode(
  mode: MainWindowLayoutMode,
  durationMs = 480,
) {
  logger.info("window", "main native resize animation requested", {
    mode,
    durationMs,
    policy: "native-window-frame",
  });
  await applyMainWindowLayoutMode(mode, true);
}

export function requestMainWindowLayoutMode(mode: MainWindowLayoutMode) {
  return enqueueMainWindowLayout(() => applyMainWindowLayoutMode(mode));
}

export function requestAnimatedMainWindowLayoutMode(
  mode: MainWindowLayoutMode,
  durationMs?: number,
) {
  return enqueueMainWindowLayout(() => animateMainWindowLayoutMode(mode, durationMs));
}

export async function animateMainWindowToOnboarding(durationMs = 480) {
  await animateMainWindowLayoutMode("onboarding", durationMs);
}

export async function animateMainWindowToControlCenter(durationMs = 480) {
  await animateMainWindowLayoutMode("control-center", durationMs);
}
