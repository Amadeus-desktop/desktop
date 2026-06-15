import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        chat: {
          surface: "#fff8f9",
          "surface-dark": "#14121a",
          header: "#fff0f3",
          "header-dark": "#1c1924",
          border: "#f0e4e8",
          "border-dark": "#2e2938",
          ink: "#2d2430",
          "ink-dark": "#f3eef5",
          muted: "#9b8a94",
          "muted-dark": "#8e8498",
          faint: "#b8a8b2",
          "faint-dark": "#6b6374",
          accent: "#e879a9",
          "accent-dark": "#f06595",
          "bubble-companion": "#ffffff",
          "bubble-companion-dark": "#252230",
          "bubble-user": "#ffe0eb",
          "bubble-user-dark": "#4a3348",
          "bubble-user-ink": "#5c3344",
          "bubble-user-ink-dark": "#ffe4ef",
          input: "#f5f0f2",
          "input-dark": "#221f2b",
          "fab-from": "#fbb6ce",
          "fab-to": "#c4b5fd",
          "fab-from-dark": "#9d4b7a",
          "fab-to-dark": "#5b4b8a",
        },
      },
      width: {
        "chat-fab": "2rem",
        "chat-nudge": "17.5rem",
        "chat-panel": "22.5rem",
      },
      height: {
        "chat-fab": "2rem",
        "chat-panel": "27.5rem",
        "chat-header": "3.25rem",
        "chat-input": "3rem",
      },
      size: {
        "chat-fab": "2rem",
        "chat-avatar": "1.75rem",
      },
      maxWidth: {
        "chat-nudge": "17.5rem",
        "chat-panel": "22.5rem",
      },
      maxHeight: {
        "chat-panel": "27.5rem",
      },
      borderRadius: {
        "chat-panel": "1.25rem",
        "chat-nudge": "1rem",
        "chat-bubble": "1.125rem",
        "chat-input": "9999px",
        "chat-fab": "9999px",
      },
      fontSize: {
        "chat-xs": ["11px", { lineHeight: "1.45" }],
        "chat-sm": ["13px", { lineHeight: "1.55" }],
        "chat-base": ["14px", { lineHeight: "1.6" }],
        "chat-title": ["15px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      boxShadow: {
        "chat-panel":
          "0 8px 32px rgb(45 36 48 / 0.1), 0 1px 2px rgb(45 36 48 / 0.06)",
        "chat-panel-dark":
          "0 12px 40px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(255 255 255 / 0.04)",
        "chat-fab": "0 2px 10px rgb(232 121 169 / 0.35)",
        "chat-fab-dark": "0 2px 12px rgb(0 0 0 / 0.4)",
      },
      keyframes: {
        "chat-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "chat-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.04)" },
        },
      },
      animation: {
        "chat-in": "chat-in 200ms ease-out forwards",
        "chat-pulse": "chat-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
