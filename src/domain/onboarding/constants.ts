import type { OnboardingStep } from "./types";

export const ONBOARDING_STORAGE_VERSION = 4;

export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  "login",
  "permissions",
  "modelRoute",
  "setup",
];
