import { describe, expect, it, beforeEach } from "vitest";
import {
  getOnboardingSnapshot,
  markSetupDone,
  resetOnboardingProgress,
  subscribeToOnboarding,
} from "./onboardingStore";

describe("onboardingStore", () => {
  beforeEach(() => {
    resetOnboardingProgress();
  });

  it("keeps a stable snapshot reference until progress changes", () => {
    const first = getOnboardingSnapshot();
    const second = getOnboardingSnapshot();

    expect(first).toBe(second);

    markSetupDone();

    expect(getOnboardingSnapshot()).not.toBe(first);
    expect(getOnboardingSnapshot().progress.setupDone).toBe(true);
  });

  it("notifies subscribers when progress changes", () => {
    let notifications = 0;
    const unsubscribe = subscribeToOnboarding(() => {
      notifications += 1;
    });

    markSetupDone();
    expect(notifications).toBe(1);

    unsubscribe();
  });
});
