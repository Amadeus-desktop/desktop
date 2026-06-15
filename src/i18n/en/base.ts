import type { AppLocale } from "../types";

export const base: AppLocale = {
  common: {
    appName: "Amadeus",
    activeCompanion: "Active Companion",
    loading: "Loading…",
    empty: "Nothing here yet.",
  },
  controlCenter: {
    tabs: {
      character: "Character",
      settings: "General",
      perception: "Screen Context",
      report: "Work Report",
    },
    sections: {
      character: "Character",
      currentMode: "Current Mode",
    },
  },
  settings: {
    eyebrow: "Preferences",
    title: "General Settings",
    description:
      "Configure proactive speech, model routing, and night-time care.",
    sections: {
      conversation: "Conversation",
      model: "Model",
      language: "Language",
    },
    locale: {
      label: "Display language",
      subtitle: "UI and companion message language",
      options: {
        ko: "한국어",
        en: "English",
        ja: "日本語",
      },
    },
    talkFrequency: {
      label: "Speech frequency",
      subtitle: "Default intensity without disrupting your flow",
      options: {
        quiet: "Quiet and subtle",
        balanced: "Balanced and gentle",
        active: "Energetic and proactive",
      },
    },
    nickname: {
      label: "Nickname",
      subtitle: "Name used in bubbles and chat",
      inputLabel: "Nickname",
    },
    nightCare: {
      label: "Night care",
      subtitle: "Shorter, softer tone late at night",
      switchLabel: "Night care",
    },
    modelRoute: {
      label: "LLM routing",
      subtitle: "Default response path and local priority",
      options: {
        "api-first": "API first",
        "local-first": "Local first",
        template: "Template",
      },
    },
    localFallback: {
      label: "Local fallback",
      subtitle: "Switch to llama.cpp when API fails",
      switchLabel: "Local LLM fallback",
    },
    localModelPath: {
      label: "GGUF model path",
      subtitle: "Local model file for llama.cpp",
      inputLabel: "Model path",
    },
    llamaBinaryPath: {
      label: "llama-server path",
      subtitle: "Binary inside the app data sidecars folder",
      inputLabel: "Binary path",
    },
    llamaServer: {
      label: "llama.cpp server",
      subtitle: "Local sidecar connection",
      hostLabel: "Host",
      portLabel: "Port",
    },
    sidecarStatus: {
      label: "Local server status",
      running: "Running",
      configured: "Ready",
      unconfigured: "Not configured",
      checking: "Checking…",
    },
  },
  character: {
    eyebrow: "Amadeus Persona",
    title: "Choose a character",
    description:
      "Companion profiles that tune tone and reaction intensity to your workflow.",
    section: "Character",
    currentMode: "Current Mode",
    currentModeTemplate: "Bubbles and chat tone follow {name}.",
    profiles: {
      ruda: {
        name: "Ruda",
        description: "Playful little-sister energy",
      },
      emilia: {
        name: "Emilia",
        description: "Quietly caring warmth",
      },
      daon: {
        name: "Daon",
        description: "Calm, steady comfort",
      },
    },
  },
  perception: {
    eyebrow: "Context Guardrail",
    title: "Screen context guide",
    description:
      "Combines screen capture, app logs, and idle signals to decide when to speak.",
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
    liveContext: {
      activeApp: "Active app",
      windowTitle: "Window title",
      stateSync: "State sync",
      category: "App category",
    },
    privacyCard: {
      title: "Privacy filter",
      description:
        "Account, password, and ID patterns are excluded from context.",
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
    },
  },
  report: {
    eyebrow: "Daily Review",
    title: "Work report",
    description: "Today's focus time and proactive speech history in one view.",
    sections: {
      summary: "Summary",
      timeline: "Timeline",
    },
    metrics: {
      focusTime: "Focus time together today",
      utterances: "Gentle nudges from your companion",
    },
    timeline: {
      loading: "Loading timeline…",
      empty: "No timeline entries yet.",
    },
    fallback: {
      focusTimeValue: "3h 45m",
      utterancesValue: "6",
    },
  },
  companion: {
    presence: {
      open: "Open Amadeus",
      wake: "Wake Amadeus",
      newMessage: "New note",
    },
    status: {
      quiet: "Quietly nearby",
      pocket: "Picking up from your last note",
      deep: "Listening a little deeper",
      dailyCare: "Closing the day together",
      sleep: "Resting",
    },
    nudge: {
      close: "Close note",
      ignore: "I'm okay for now",
    },
    chat: {
      close: "Close chat",
      send: "Send",
      waiting: "One line is enough.",
      placeholder: "One line is enough",
      placeholderDeep: "You can keep going",
      dailyCareLink: "Fold today together?",
    },
    dailyCare: {
      subtitle: "Today's small record",
      title: "You worked hard today.",
      close: "Close Daily Care",
      intro: "Want to look back at what you pushed through?",
      togetherTime: "Time together",
      togetherTimeValue: "2h 40m",
      noteCount: "Notes from Amadeus",
      noteCountValue: "3",
      keywords: "Today's mood keywords",
      keywordValue: "Endurance · Stuck · Restart",
      closing: "A short note from Amadeus",
      closingMessage:
        "It doesn't have to be smooth. Starting again today is already enough.",
    },
    dev: {
      persona: "Persona",
      timeline: "Local Timeline",
      timelineEmpty: "No events yet",
    },
  },
  persona: {
    warm_friend: {
      name: "Ama",
      shortLabel: "Warm friend",
      description: "Keeps pressure low with realistic, short check-ins.",
    },
    fantasy_guardian: {
      name: "Amadeus",
      shortLabel: "Fantasy guardian",
      description: "A restrained guardian tone that protects tired moments.",
    },
  },
};
