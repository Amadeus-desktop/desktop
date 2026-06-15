import { ONBOARDING_STORAGE_VERSION } from "./constants";
import type { OnboardingProgress } from "./types";

export const emptyOnboardingProgress = (): OnboardingProgress => ({
  permissionsDone: false,
  modelRouteDone: false,
  setupDone: false,
});

export function normalizeStoredOnboardingProgress(raw: unknown): OnboardingProgress {
  if (!raw || typeof raw !== "object") {
    return emptyOnboardingProgress();
  }

  const parsed = raw as Record<string, unknown>;

  if (parsed.version === ONBOARDING_STORAGE_VERSION) {
    return {
      permissionsDone: parsed.permissionsDone === true,
      modelRouteDone: parsed.modelRouteDone === true,
      setupDone: parsed.setupDone === true,
    };
  }

  const setupDone = parsed.setupDone === true;
  const permissionsDone =
    parsed.permissionsDone === true ||
    parsed.permissionsResolved === true ||
    setupDone;

  return {
    permissionsDone,
    modelRouteDone: setupDone,
    setupDone,
  };
}
