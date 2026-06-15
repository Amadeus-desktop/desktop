import type { PerceptionMessages } from "../modules/perception";

export const perception: PerceptionMessages = {
  eyebrow: "Together",
  title: "Staying together",
  description: "Choose how quietly your companion stays nearby. Sensitive screens are masked automatically.",
  sections: {
    basics: "Basics",
    details: "Details",
  },
  analysis: {
    label: "Stay nearby",
    subtitle: "Gently notice what you're doing to time check-ins",
    switchLabel: "Stay nearby",
  },
  proactiveTrigger: {
    label: "Reach out first",
    subtitle: "Softly check in when you stall or drift",
    switchLabel: "Reach out first",
  },
  privacyFilter: {
    label: "Hide sensitive screens",
    subtitle: "Skip password, finance, and messenger screens",
    switchLabel: "Hide sensitive screens",
  },
  privacyKeywords: {
    label: "Extra hidden words",
    subtitle: "Comma-separated patterns to mask",
    inputLabel: "Hidden words",
  },
  liveContext: {
    activeApp: "Current app",
    windowTitle: "Window",
    stateSync: "Status",
    category: "Category",
  },
  privacyCard: {
    title: "Privacy shield",
    description: "Account, password, and ID patterns stay out of context.",
    active: "On",
    inactive: "Off",
    blocked: "Masked",
    screenPermission: "Screen permission",
    permissionGranted: "Granted",
    permissionNeeded: "Needs review",
    sensitiveState: "Sensitive state",
    passed: "Clear",
    reasons: {
      password_manager: "Password",
      finance: "Finance",
      messaging: "Messaging",
      email: "Email",
      government: "Government",
      authentication: "Authentication",
      custom_keyword: "Custom keyword",
    },
  },
  status: {
    sensitiveBlocked: "Resting on a sensitive screen",
    analysisWaiting: "Staying nearby quietly",
    analysisPaused: "Taking a break",
    analysisLoading: "Checking status…",
    analysisError: "Couldn't load status",
  },
  advanced: {
    toggle: "Show details",
    hint: "Live screen state and filter details",
  },
  contextLabels: {
    idleActive: "Active ({seconds}s idle)",
    idlePaused: "Idle ({minutes}m idle)",
    categories: {
      work: "Work app",
      non_work: "Non-work app",
      unknown: "Unknown",
    },
  },
};
