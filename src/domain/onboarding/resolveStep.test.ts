import { describe, expect, it } from "vitest";
import { emptyOnboardingProgress } from "./progress";
import {
  isOnboardingComplete,
  resolveOnboardingStep,
  shouldShowOnboardingShell,
} from "./resolveStep";
import { ONBOARDING_STEP_ORDER } from "./constants";

describe("onboarding domain", () => {
  it("walks login -> permissions -> modelRoute -> setup after authentication", () => {
    const initial = emptyOnboardingProgress();

    expect(resolveOnboardingStep(false, initial)).toBe("login");
    expect(resolveOnboardingStep(true, initial)).toBe("permissions");

    const afterPermissions: typeof initial = {
      permissionsDone: true,
      modelRouteDone: false,
      setupDone: false,
    };
    expect(resolveOnboardingStep(true, afterPermissions)).toBe("modelRoute");

    const afterModelRoute: typeof initial = {
      permissionsDone: true,
      modelRouteDone: true,
      setupDone: false,
    };
    expect(resolveOnboardingStep(true, afterModelRoute)).toBe("setup");
    expect(ONBOARDING_STEP_ORDER).toEqual([
      "login",
      "permissions",
      "modelRoute",
      "setup",
    ]);
  });

  it("resets to login after progress reset", () => {
    const reset = emptyOnboardingProgress();
    expect(resolveOnboardingStep(false, reset)).toBe("login");
    expect(resolveOnboardingStep(true, reset)).toBe("permissions");
    expect(isOnboardingComplete(true, reset)).toBe(false);
    expect(shouldShowOnboardingShell(true, reset)).toBe(true);
  });

  it("forces login step during logout transition", () => {
    const done = { permissionsDone: true, modelRouteDone: true, setupDone: true };
    expect(resolveOnboardingStep(true, done, true)).toBe("login");
    expect(shouldShowOnboardingShell(true, done, true)).toBe(true);
  });
});
