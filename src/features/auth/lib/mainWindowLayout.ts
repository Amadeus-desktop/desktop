import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { createSerializedAsyncQueue } from "../../../lib/async/serializedAsyncQueue";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { scheduleMainWindowCompositorKick } from "../../../lib/tauri/mainWindowChrome";
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

async function setMainWindowLogicalSizeCentered(width: number, height: number) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;

  const rect = await readMainWindowOuterLogicalRect();
  if (!rect) {
    await webviewWindow.setSize(new LogicalSize(width, height));
    await webviewWindow.center();
    return;
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const nextX = Math.round(centerX - width / 2);
  const nextY = Math.round(centerY - height / 2);

  await webviewWindow.setSize(new LogicalSize(width, height));
  await webviewWindow.setPosition(new LogicalPosition(nextX, nextY));
}

async function setMainWindowLogicalSizeOnMonitor(width: number, height: number) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) return;

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

export async function applyMainWindowLayoutMode(mode: MainWindowLayoutMode) {
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
    );
    scheduleMainWindowCompositorKick();
    logger.info("window", "main layout apply completed", {
      mode,
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
  await setMainWindowLogicalSizeOnMonitor(next.width, next.height);
  scheduleMainWindowCompositorKick();
  logger.info("window", "main layout apply completed", {
    mode,
    durationMs: Math.round(performance.now() - beganAt),
    width: next.width,
    height: next.height,
  });
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export async function animateMainWindowLayoutMode(
  mode: MainWindowLayoutMode,
  durationMs = 480,
) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return;
  }

  await ensureMainWindowVisible(webviewWindow);
  logger.info("window", "main layout animation started", {
    mode,
    durationMs,
  });

  const start = (await readMainWindowLogicalSize()) ?? {
    width: controlCenterWindowPolicy.defaultWidth,
    height: controlCenterWindowPolicy.defaultHeight,
  };

  const target =
    mode === "onboarding"
      ? {
          width: onboardingWindowPolicy.width,
          height: onboardingWindowPolicy.height,
        }
      : clampControlCenterSize(
          readControlCenterWindowSize()?.width ??
            controlCenterWindowPolicy.defaultWidth,
          readControlCenterWindowSize()?.height ??
            controlCenterWindowPolicy.defaultHeight,
        );

  if (mode === "onboarding") {
    await webviewWindow.setMinSize(
      new LogicalSize(
        onboardingWindowPolicy.minWidth,
        onboardingWindowPolicy.minHeight,
      ),
    );
  }

  const beganAt = performance.now();
  let frameCount = 0;
  let slowFrameCount = 0;
  let maxFrameMs = 0;
  let loggedSlowFrames = 0;

  while (true) {
    const frameBeganAt = performance.now();
    const progress = easeOutCubic(
      Math.min(1, (performance.now() - beganAt) / durationMs),
    );
    const width = Math.round(
      start.width + (target.width - start.width) * progress,
    );
    const height = Math.round(
      start.height + (target.height - start.height) * progress,
    );

    await setMainWindowLogicalSizeCentered(width, height);
    frameCount += 1;
    const frameMs = performance.now() - frameBeganAt;
    maxFrameMs = Math.max(maxFrameMs, frameMs);
    if (frameMs > 34) {
      slowFrameCount += 1;
      if (loggedSlowFrames < 5) {
        loggedSlowFrames += 1;
        logger.warn("window", "main layout animation slow native resize frame", {
          mode,
          frameMs: Math.round(frameMs),
          width,
          height,
          progress: Number(progress.toFixed(3)),
        });
      }
    }

    if (progress >= 1) {
      break;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  if (mode === "onboarding") {
    await setMainWindowLogicalSizeOnMonitor(target.width, target.height);
  } else {
    await webviewWindow.setMinSize(
      new LogicalSize(
        controlCenterWindowPolicy.minWidth,
        controlCenterWindowPolicy.minHeight,
      ),
    );
    await setMainWindowLogicalSizeOnMonitor(target.width, target.height);
  }

  scheduleMainWindowCompositorKick();
  logger.info("window", "main layout animation completed", {
    mode,
    frameCount,
    slowFrameCount,
    maxFrameMs: Math.round(maxFrameMs),
    totalMs: Math.round(performance.now() - beganAt),
    targetWidth: target.width,
    targetHeight: target.height,
  });
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
