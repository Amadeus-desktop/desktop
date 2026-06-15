export type OnboardingStep = "login" | "permissions" | "setup";

export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  "login",
  "permissions",
  "setup",
];

export type OnboardingProgress = {
  permissionsDone: boolean;
  setupDone: boolean;
};

export type PermissionReadiness = {
  screenGranted: boolean;
  ocrAvailable: boolean;
  ready: boolean;
  loading: boolean;
};

export type SetupModelChoice = "api" | "local";
