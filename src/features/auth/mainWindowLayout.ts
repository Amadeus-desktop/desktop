import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import {
  controlCenterWindowPolicy,
  onboardingWindowPolicy,
  readControlCenterWindowSize,
  type ControlCenterWindowSize,
} from "../../ui/layout/controlCenterPreferences";

export type MainWindowLayoutMode = "control-center" | "onboarding";

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
    webviewWindow.innerSize(),
    webviewWindow.scaleFactor(),
  ]);

  return {
    width: Math.round(size.width / scaleFactor),
    height: Math.round(size.height / scaleFactor),
  };
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
    await webviewWindow.setSize(
      new LogicalSize(
        onboardingWindowPolicy.width,
        onboardingWindowPolicy.height,
      ),
    );
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
  await webviewWindow.setSize(new LogicalSize(next.width, next.height));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export async function animateMainWindowLayoutMode(
  mode: MainWindowLayoutMode,
  durationMs = 420,
) {
  const webviewWindow = getMainWebviewWindow();
  if (!webviewWindow) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return;
  }

  const windowRef = webviewWindow;

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

      void windowRef.setSize(new LogicalSize(width, height));

      if (progress >= 1) {
        resolve();
        return;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });

  if (mode === "control-center") {
    await windowRef.setMinSize(
      new LogicalSize(
        controlCenterWindowPolicy.minWidth,
        controlCenterWindowPolicy.minHeight,
      ),
    );
  }
}

export async function animateMainWindowToOnboarding(durationMs = 420) {
  await animateMainWindowLayoutMode("onboarding", durationMs);
}

export async function animateMainWindowToControlCenter(durationMs = 420) {
  await animateMainWindowLayoutMode("control-center", durationMs);
}
