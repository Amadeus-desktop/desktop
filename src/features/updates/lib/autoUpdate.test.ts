import { describe, expect, it, vi } from "vitest";
import { scheduleAutoUpdateCheck } from "./autoUpdate";

describe("scheduleAutoUpdateCheck", () => {
  it("skips update checks outside Tauri runtime", () => {
    vi.useFakeTimers();
    const check = vi.fn();

    scheduleAutoUpdateCheck({
      isTauriRuntime: false,
      delayMs: 10,
      check,
      relaunch: vi.fn(),
      logger: { warn: vi.fn(), info: vi.fn() },
    });

    vi.advanceTimersByTime(10);

    expect(check).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("downloads, installs, and relaunches when an update exists", async () => {
    vi.useFakeTimers();
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    const relaunch = vi.fn().mockResolvedValue(undefined);
    const logger = { warn: vi.fn(), info: vi.fn() };

    scheduleAutoUpdateCheck({
      isTauriRuntime: true,
      delayMs: 10,
      check: vi.fn().mockResolvedValue({
        version: "0.2.0",
        downloadAndInstall,
      }),
      relaunch,
      logger,
    });

    await vi.advanceTimersByTimeAsync(10);

    expect(downloadAndInstall).toHaveBeenCalledOnce();
    expect(relaunch).toHaveBeenCalledOnce();
    expect(logger.warn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
