import { useSyncExternalStore } from "react";
import {
  isOnboardingComplete,
  ONBOARDING_STEP_ORDER,
  resolveOnboardingStep,
  shouldShowOnboardingShell,
} from "../../../domain/onboarding";
import {
  getOnboardingSnapshot,
  hydrateOnboardingProgress,
  markPermissionsDone,
  markModelRouteDone,
  markSetupDone,
  subscribeToOnboarding,
} from "../store/onboardingStore";

export function useOnboarding(isAuthenticated: boolean, forceLoginStep = false) {
  const { progress, hydrated } = useSyncExternalStore(
    subscribeToOnboarding,
    getOnboardingSnapshot,
    getOnboardingSnapshot,
  );

  const isComplete = isOnboardingComplete(isAuthenticated, progress);
  const currentStep = resolveOnboardingStep(isAuthenticated, progress, forceLoginStep);
  const showOnboardingShell = shouldShowOnboardingShell(
    isAuthenticated,
    progress,
    forceLoginStep,
  );

  return {
    hydrated,
    permissionsDone: progress.permissionsDone,
    modelRouteDone: progress.modelRouteDone,
    setupDone: progress.setupDone,
    isComplete,
    currentStep,
    showOnboardingShell,
    stepOrder: ONBOARDING_STEP_ORDER,
    hydrate: hydrateOnboardingProgress,
    markPermissionsDone,
    markModelRouteDone,
    markSetupDone,
  };
}
