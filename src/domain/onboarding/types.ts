export type OnboardingStep = "login" | "permissions" | "modelRoute" | "setup";

export type OnboardingProgress = {
  permissionsDone: boolean;
  modelRouteDone: boolean;
  setupDone: boolean;
};
