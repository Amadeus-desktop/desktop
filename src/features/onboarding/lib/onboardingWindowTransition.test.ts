import { describe, expect, it, vi } from "vitest";
import { completeOnboardingWindowTransition } from "./onboardingWindowTransition";

describe("completeOnboardingWindowTransition", () => {
  it("does not call fallback when animation succeeds", async () => {
    const animateToControlCenter = vi.fn().mockResolvedValue(undefined);
    const applyLayoutMode = vi.fn().mockResolvedValue(undefined);

    await completeOnboardingWindowTransition({
      animateToControlCenter,
      applyLayoutMode,
    });

    expect(animateToControlCenter).toHaveBeenCalledTimes(1);
    expect(applyLayoutMode).not.toHaveBeenCalled();
  });

  it("applies control-center layout when animation fails", async () => {
    const animateToControlCenter = vi.fn().mockRejectedValue(new Error("janky resize"));
    const applyLayoutMode = vi.fn().mockResolvedValue(undefined);
    const logError = vi.fn();

    await completeOnboardingWindowTransition({
      animateToControlCenter,
      applyLayoutMode,
      logError,
    });

    expect(applyLayoutMode).toHaveBeenCalledWith("control-center");
    expect(logError).toHaveBeenCalledWith(
      "onboarding window transition failed",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it("keeps onboarding completion non-blocking when fallback also fails", async () => {
    const animateToControlCenter = vi.fn().mockRejectedValue(new Error("animation failed"));
    const applyLayoutMode = vi.fn().mockRejectedValue(new Error("layout failed"));
    const logError = vi.fn();

    await expect(
      completeOnboardingWindowTransition({
        animateToControlCenter,
        applyLayoutMode,
        logError,
      }),
    ).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(
      "onboarding window layout fallback failed",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});
