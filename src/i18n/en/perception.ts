import type { PerceptionMessages } from "../modules/perception";

export const perception: PerceptionMessages = {
  eyebrow: "Context Guardrail",
  title: "Screen context guide",
  description: "Combines screen capture, app logs, and idle signals to decide when to speak.",
  sections: {
    capture: "Capture",
    liveContext: "Live Context",
  },
  analysis: {
    label: "Screen analysis",
    subtitle: "Summarize only the current window and context shifts",
    switchLabel: "Screen analysis",
  },
  proactiveTrigger: {
    label: "Proactive speech queue",
    subtitle: "Record long stalls and drift as speech candidates",
    switchLabel: "Proactive speech queue",
  },
  privacyFilter: {
    label: "Sensitive data filter",
    subtitle: "Mask locally before analysis",
    switchLabel: "Sensitive data filter",
  },
  privacyKeywords: {
    label: "Custom keywords",
    subtitle: "Comma-separated patterns treated as sensitive",
    inputLabel: "Sensitive keywords",
  },
  liveContext: {
    activeApp: "Active app",
    windowTitle: "Window title",
    stateSync: "State sync",
    category: "App category",
  },
  privacyCard: {
    title: "Privacy filter",
    description: "Account, password, and ID patterns are excluded from context.",
    active: "Active",
    inactive: "Inactive",
    blocked: "Blocked",
    screenPermission: "Screen permission",
    permissionGranted: "Granted",
    permissionNeeded: "Needs review",
    sensitiveState: "Sensitive state",
    passed: "Passed",
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
    sensitiveBlocked: "Sensitive context blocked",
    analysisWaiting: "Waiting to analyze",
    analysisPaused: "Analysis paused",
    analysisLoading: "Refreshing context",
    analysisError: "Context refresh failed",
  },
  contextLabels: {
    idleActive: "ACTIVE ({seconds}s idle)",
    idlePaused: "IDLE ({minutes}m idle)",
    categories: {
      work: "Work app",
      non_work: "Non-work app",
      unknown: "Unknown",
    },
  },
};
