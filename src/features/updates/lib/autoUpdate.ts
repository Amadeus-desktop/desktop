import { logger as defaultLogger } from "../../../observability/logger";
import { isTauriRuntime as detectTauriRuntime } from "../../../lib/tauri/runtime";

type UpdateCheckResult = {
  version?: string;
  downloadAndInstall: () => Promise<void>;
} | null;

type AutoUpdateLogger = {
  info: (scope: string, message: string, data?: Record<string, unknown>) => void;
  warn: (scope: string, message: string, data?: Record<string, unknown>) => void;
};

type AutoUpdateOptions = {
  isTauriRuntime?: boolean;
  delayMs?: number;
  check?: () => Promise<UpdateCheckResult>;
  relaunch?: () => Promise<void>;
  logger?: AutoUpdateLogger;
};

const DEFAULT_UPDATE_DELAY_MS = 8_000;

function describeUpdateError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown";
  }
}

async function defaultCheck(): Promise<UpdateCheckResult> {
  const { check } = await import("@tauri-apps/plugin-updater");
  return check();
}

async function defaultRelaunch(): Promise<void> {
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

export function scheduleAutoUpdateCheck(options: AutoUpdateOptions = {}) {
  const {
    isTauriRuntime = detectTauriRuntime(),
    delayMs = DEFAULT_UPDATE_DELAY_MS,
    check = defaultCheck,
    relaunch = defaultRelaunch,
    logger = defaultLogger,
  } = options;

  if (!isTauriRuntime) return;

  window.setTimeout(() => {
    void (async () => {
      try {
        const update = await check();
        if (!update) {
          logger.info("updates", "no update available");
          return;
        }

        logger.info("updates", "update available", {
          version: update.version ?? "unknown",
        });
        await update.downloadAndInstall();
        logger.info("updates", "update installed, relaunching");
        await relaunch();
      } catch (error) {
        logger.warn("updates", "auto update check failed", {
          error: describeUpdateError(error),
        });
      }
    })();
  }, delayMs);
}
