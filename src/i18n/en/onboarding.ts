import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "Sign in",
    permissions: "Context",
    modelRoute: "Response",
    setup: "Companion",
  },
  permissions: {
    headline: "Allow context to stay beside you",
    subheadline: "Nothing is saved. We only read briefly when needed.",
    promiseChips: ["Never stored", "Skips sensitive windows"],
    statusLabel: "Screen Recording",
    granted: "Allowed",
    needed: "Needed",
    checking: "Checking…",
    requestAccess: "Allow access",
    settingsHint: "When Settings opens, enable Amadeus.",
    next: "Next",
    skip: "Later",
  },
  modelRoute: {
    headline: "How should replies arrive?",
    subheadline: "Choose cloud API or local LLM for companion responses.",
    continue: "Next",
    apiHint: "Uses the cloud API when online. You can change this anytime in settings.",
    localHint: "Runs llama.cpp on your device. Model paths live in general settings.",
    options: {
      api: {
        title: "Cloud API",
        description: "Fast, reliable responses",
      },
      local: {
        title: "Local LLM",
        description: "On-device only",
      },
    },
  },
  setup: {
    headline: "Who stays with you?",
    subheadline: "Different tone, same quiet presence.",
    continue: "Keep beside me",
  },
};
