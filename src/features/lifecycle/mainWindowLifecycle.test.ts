import { describe, expect, it, vi } from "vitest";
import { createMainWindowLifecycle } from "./mainWindowLifecycle";

describe("createMainWindowLifecycle", () => {
  it("routes non-animated requests to the immediate layout path", async () => {
    const applyLayoutMode = vi.fn().mockResolvedValue(undefined);
    const animateLayoutMode = vi.fn().mockResolvedValue(undefined);
    const log = { info: vi.fn() } as never;
    const lifecycle = createMainWindowLifecycle({
      applyLayoutMode,
      animateLayoutMode,
      log,
    });

    await lifecycle.requestMainWindowLayout({
      mode: "onboarding",
      reason: "initial-hydration",
      priority: 10,
    });

    expect(applyLayoutMode).toHaveBeenCalledWith("onboarding");
    expect(animateLayoutMode).not.toHaveBeenCalled();
  });

  it("routes animated requests with duration to the animation path", async () => {
    const applyLayoutMode = vi.fn().mockResolvedValue(undefined);
    const animateLayoutMode = vi.fn().mockResolvedValue(undefined);
    const log = { info: vi.fn() } as never;
    const lifecycle = createMainWindowLifecycle({
      applyLayoutMode,
      animateLayoutMode,
      log,
    });

    await lifecycle.requestMainWindowLayout({
      mode: "control-center",
      reason: "onboarding-complete",
      animated: true,
      durationMs: 360,
      priority: 50,
    });

    expect(animateLayoutMode).toHaveBeenCalledWith("control-center", 360);
    expect(applyLayoutMode).not.toHaveBeenCalled();
  });
});
