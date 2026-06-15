import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "Sign in",
    permissions: "Permissions",
    setup: "Get started",
  },
  permissions: {
    headline: "Screen context needs your permission",
    subheadline:
      "Amadeus never stores your screen. It reads short local text only when context is needed.",
    bullets: [
      "No continuous recording or storage",
      "Sensitive windows are never captured",
      "You can turn this off anytime in Settings",
    ],
    screenStatus: "Screen Recording",
    ocrStatus: "OCR",
    granted: "Granted",
    needed: "Required",
    unavailable: "Unavailable",
    checking: "Checking…",
    openSettings: "Open System Settings",
    checkAgain: "Check again",
    next: "Next",
    skip: "Later — continue in basic mode",
  },
  setup: {
    headline: "Choose your companion",
    subheadline: "You can change the route and persona later in Settings.",
    modelLabel: "Response route",
    modelApi: "Cloud API",
    modelLocal: "On device",
    modelLocalHint: "Set the model path later in Settings → Advanced.",
    personaLabel: "Persona",
    continue: "Get started",
  },
};
