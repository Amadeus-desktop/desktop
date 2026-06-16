import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "Sign in",
    permissions: "Context",
    modelRoute: "How to speak",
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
    requestFailed: "Open Privacy & Security > Screen Recording and enable Amadeus.",
    next: "Next",
    skip: "Later",
  },
  modelRoute: {
    headline: "How should they speak to you?",
    subheadline: "Pick what feels right. You can change it anytime.",
    continue: "Next",
    apiHint: "When you're online, they can speak with you right away.",
    localHint: "Only on this device. Nothing leaves your space.",
    options: {
      api: {
        title: "Online",
        description: "Soft and quick",
      },
      local: {
        title: "On device",
        description: "Quiet, just for you",
      },
    },
  },
  setup: {
    headline: "Who stays with you?",
    subheadline: "Pick an icon only. Tone and personality live in Character settings.",
    mateLabel: "Mate",
    continue: "Keep beside me",
  },
  preparing: {
    eyebrow: "One moment",
    title: "Getting things ready",
    subtitle: "Tuning everything to stay beside you.",
    doneEyebrow: "All set",
    doneTitle: "You're all set!",
    doneSubtitle: "Ready to speak beside you now.",
    doneHint: "Starting in a moment.",
  },
};
