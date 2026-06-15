import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import {
  controlCenterWindowPolicy,
  onboardingWindowPolicy,
  readControlCenterWindowSize,
  type ControlCenterWindowSize,
} from "../../ui/layout/controlCenterPreferences";

export type MainWindowLayoutMode = "control-center" | "onboarding";

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

  await ensureMainWindowVisible(webviewWindow);

  if (mode === "onboarding") {
    await webviewWindow.setMinSize(
      new LogicalSize(
        onboardingWindowPolicy.minWidth,
        onboardingWindowPolicy.minHeight,
      ),
    );
    await setMainWindowLogicalSizeCentered(
      onboardingWindowPolicy.width,
      onboardingWindowPolicy.height,
    );
    await centerMainWindowOnMonitor();
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
  await setMainWindowLogicalSizeCentered(next.width, next.height);
  await centerMainWindowOnMonitor();
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

  await new Promise<void>((resolve) => {
    const beganAt = performance.now();

    function frame(now: number) {
      const progress = easeOutCubic(
        Math.min(1, (now - beganAt) / durationMs),
      );
      const width = Math.round(
        start.width + (target.width - start.width) * progress,
      );
      const height = Math.round(
        start.height + (target.height - start.height) * progress,
      );

      void setMainWindowLogicalSizeCentered(width, height);

      if (progress >= 1) {
        resolve();
        return;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });

  if (mode === "control-center") {
    await webviewWindow.setMinSize(
      new LogicalSize(
        controlCenterWindowPolicy.minWidth,
        controlCenterWindowPolicy.minHeight,
      ),
    );
  }

  await centerMainWindowOnMonitor();
}

export async function animateMainWindowToOnboarding(durationMs = 480) {
  await animateMainWindowLayoutMode("onboarding", durationMs);
}

export async function animateMainWindowToControlCenter(durationMs = 480) {
  await animateMainWindowLayoutMode("control-center", durationMs);
}
