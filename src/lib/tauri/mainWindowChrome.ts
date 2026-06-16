import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { logger } from "../../observability/logger";
import { isTauriRuntime } from "./runtime";

const TRANSPARENT = { red: 0, green: 0, blue: 0, alpha: 0 } as const;

export async function startMainWindowDrag() {
  if (!isTauriRuntime()) return;

  const window = getCurrentWebviewWindow();
  if (window.label !== "main") return;

  await window.startDragging();
}

/**
 * Companion HUD only — main window must keep a hit-testable webview surface on macOS.
 * Setting alpha 0 on main breaks clicks/hover in WKWebView (browser dev mode skips this).
 */
export async function ensureCompanionWebviewTransparency() {
  if (!isTauriRuntime()) return;

  const window = getCurrentWebviewWindow();
  if (window.label !== "companion") return;

  await window.setBackgroundColor(TRANSPARENT);
}

/**
 * Nudge WindowServer/WKWebView to drop stale compositor tiles (same effect as toggling DevTools).
 * See: https://stackoverflow.com/questions/77344488/tauri-transparent-window-only-works-when-resized
 */
export async function kickMainWindowCompositor() {
  if (!isTauriRuntime()) return;

  const window = getCurrentWebviewWindow();
  if (window.label !== "main") return;
  const beganAt = performance.now();

  const [size, scaleFactor] = await Promise.all([
    window.outerSize(),
    window.scaleFactor(),
  ]);

  const width = Math.max(1, Math.round(size.width / scaleFactor));
  const height = Math.max(1, Math.round(size.height / scaleFactor));

  await window.setSize(new LogicalSize(width + 1, height));
  await window.setSize(new LogicalSize(width, height));
  const durationMs = Math.round(performance.now() - beganAt);
  const level = durationMs > 34 ? "warn" : "info";
  logger[level]("window", "main compositor kick completed", {
    durationMs,
    width,
    height,
  });
}

let compositorKickTimer: ReturnType<typeof setTimeout> | null = null;
let compositorKickInFlight = false;

/** Coalesce multiple kick requests into a single 1px resize after layout settles. */
export function scheduleMainWindowCompositorKick(delayMs = 200) {
  if (!isTauriRuntime()) return;

  if (compositorKickTimer !== null) {
    clearTimeout(compositorKickTimer);
  }

  compositorKickTimer = window.setTimeout(() => {
    compositorKickTimer = null;
    if (compositorKickInFlight) return;

    compositorKickInFlight = true;
    logger.info("window", "main compositor kick scheduled", { delayMs });
    void kickMainWindowCompositor()
      .catch((error) => {
        logger.error("window", "main compositor kick failed", { error });
      })
      .finally(() => {
        compositorKickInFlight = false;
      });
  }, delayMs);
}
