import type { OnboardingProgress, OnboardingStep } from "./types";

export function resolveOnboardingStep(
  isAuthenticated: boolean,
  progress: OnboardingProgress,
  forceLoginStep = false,
): OnboardingStep {
  if (forceLoginStep) return "login";
  if (!isAuthenticated) return "login";
  if (!progress.permissionsDone) return "permissions";
  if (!progress.modelRouteDone) return "modelRoute";
  return "setup";
}

export function isOnboardingComplete(
  isAuthenticated: boolean,
  progress: OnboardingProgress,
): boolean {
  return isAuthenticated && progress.setupDone;
}

export function shouldShowOnboardingShell(
  isAuthenticated: boolean,
  progress: OnboardingProgress,
  logoutTransitioning = false,
): boolean {
  return logoutTransitioning || !isOnboardingComplete(isAuthenticated, progress);
}
