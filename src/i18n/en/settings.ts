import type { SettingsMessages } from "../modules/settings";

export const settings: SettingsMessages = {
  eyebrow: "Preferences",
  title: "General Settings",
  description: "Set how your companion speaks, what to call you, and how often to reach out.",
  sections: {
    conversation: "Together",
    model: "Model · Connection",
    language: "Language",
  },
  advanced: {
    toggle: "Advanced",
    hint: "Local model, LLM routing, test utterance",
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
    subtitle: "Real-use intensity plus a fast QA-only test mode",
    options: {
      quiet: "Quiet and subtle",
      balanced: "Balanced and gentle",
      active: "Energetic and proactive",
      test: "QA test only · checks every 2s",
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
  modelPreset: {
    label: "Recommended local model",
    subtitle: "Default pick for 8GB RAM laptops",
    recommended: "Qwen2.5-3B-Instruct GGUF (Q4_K_M, ~2GB)",
  },
  llmHealth: {
    label: "LLM provider status",
    checking: "Checking…",
    available: "Available",
    unavailable: "Unavailable",
  },
  testUtterance: {
    label: "Test utterance",
    subtitle: "Generate a short companion line with the current route.",
    button: "Run test",
    running: "Generating…",
  },
  appearance: {
    label: "Theme",
    subtitle: "App brightness — dark, light, or follow system",
    options: {
      dark: "Dark",
      light: "Light",
      system: "System",
    },
  },
  accentColor: {
    label: "Accent color",
    subtitle: "Buttons, toggles, and highlight color",
    options: {
      rose: "Rose",
      lavender: "Lavender",
      sky: "Sky",
      mint: "Mint",
      peach: "Peach",
    },
  },
  companionPersona: {
    label: "Companion persona",
    subtitle: "Tone and relationship settings",
    icons: {
      bubble: "Bubble",
      letter: "Letter",
      star: "Star",
      orb: "Orb",
    },
  },
  mateIcon: {
    label: "Mate",
    subtitle: "Bottom-right HUD icon — outline follows your accent color",
    icons: {
      bubble: "Chat",
      letter: "Mail",
      star: "Star",
      orb: "Orb",
    },
  },
};
