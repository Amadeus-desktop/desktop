import { useSyncExternalStore } from "react";
import {
  getOnboardingSnapshot,
  hydrateOnboardingProgress,
  markPermissionsDone,
  markSetupDone,
  subscribeToOnboarding,
} from "./onboardingStore";
import { ONBOARDING_STEP_ORDER, type OnboardingStep } from "./types";

function resolveCurrentStep(
  isAuthenticated: boolean,
  progress: { permissionsDone: boolean; setupDone: boolean },
): OnboardingStep {
  if (!isAuthenticated) return "login";
  if (!progress.permissionsDone) return "permissions";
  return "setup";
}

export function useOnboarding(isAuthenticated: boolean) {
  const { progress, hydrated } = useSyncExternalStore(
    subscribeToOnboarding,
    getOnboardingSnapshot,
    getOnboardingSnapshot,
  );

  const isComplete = isAuthenticated && progress.setupDone;
  const currentStep = resolveCurrentStep(isAuthenticated, progress);
  const showOnboardingShell = !isComplete;

  return {
    hydrated,
    permissionsDone: progress.permissionsDone,
    setupDone: progress.setupDone,
    isComplete,
    currentStep,
    showOnboardingShell,
    stepOrder: ONBOARDING_STEP_ORDER,
    hydrate: hydrateOnboardingProgress,
    markPermissionsDone,
    markSetupDone,
  };
}
