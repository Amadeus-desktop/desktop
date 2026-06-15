import type { Config } from "tailwindcss";
import { amadeusTailwindPlugin } from "./src/ui/theme/tailwindPlugin";

const motionEase = "cubic-bezier(0.2, 0.8, 0.2, 1)";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        chat: {
          surface: "#1e1e22",
          "surface-dark": "#1e1e22",
          header: "#252528",
          "header-dark": "#252528",
          border: "#3a3a40",
          "border-dark": "#3a3a40",
          ink: "#f5f5f7",
          "ink-dark": "#f5f5f7",
          muted: "#a1a1a6",
          "muted-dark": "#a1a1a6",
          faint: "#6e6e73",
          "faint-dark": "#6e6e73",
          accent: "#0a84ff",
          "accent-dark": "#0a84ff",
          "bubble-companion": "#2a2a30",
          "bubble-companion-dark": "#2a2a30",
          "bubble-user": "#1a3a5c",
          "bubble-user-dark": "#1a3a5c",
          "bubble-user-ink": "#f5f5f7",
          "bubble-user-ink-dark": "#f5f5f7",
          input: "#2a2a30",
          "input-dark": "#2a2a30",
          "fab-from": "#fda4af",
          "fab-to": "#a78bfa",
          "fab-from-dark": "#fda4af",
          "fab-to-dark": "#a78bfa",
        },
      },
      width: {
        "chat-fab": "2.75rem",
        "chat-nudge": "18.5rem",
        "chat-panel": "23rem",
      },
      height: {
        "chat-fab": "2.75rem",
        "chat-panel": "28rem",
        "chat-header": "3.5rem",
        "chat-input": "3rem",
      },
      size: {
        "chat-fab": "2.75rem",
        "chat-avatar": "2rem",
      },
      maxWidth: {
        "chat-nudge": "18.5rem",
        "chat-panel": "23rem",
      },
      maxHeight: {
        "chat-panel": "28rem",
      },
      borderRadius: {
        "chat-panel": "1.375rem",
        "chat-nudge": "1.25rem",
        "chat-bubble": "1rem",
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
        glass:
          "0 18px 48px rgb(0 0 0 / 0.28), inset 0 1px 0 rgb(255 255 255 / 0.08)",
        "glass-sm":
          "0 8px 24px rgb(0 0 0 / 0.2), inset 0 1px 0 rgb(255 255 255 / 0.06)",
        "glass-inset": "inset 0 1px 0 rgb(255 255 255 / 0.08)",
        "chat-panel": "0 12px 40px rgb(0 0 0 / 0.35)",
        "chat-panel-dark": "0 12px 40px rgb(0 0 0 / 0.35)",
        "chat-fab": "none",
        "chat-fab-dark": "none",
        "persona-glow": "0 0 0 1px rgb(255 255 255 / 0.08)",
      },
      keyframes: {
        "chat-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "chat-pulse": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.03)" },
        },
        "window-appear": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "window-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "tab-panel-enter": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "onboarding-enter": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "onboarding-step-enter": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "chat-in": `chat-in 240ms ${motionEase} forwards`,
        "chat-pulse": "chat-pulse 3.2s ease-in-out infinite",
        "window-appear": `window-appear 420ms ${motionEase}`,
        "window-fade-in": `window-fade-in 360ms ${motionEase}`,
        "tab-panel-enter": `tab-panel-enter 280ms ${motionEase}`,
        "onboarding-enter": `onboarding-enter 360ms ${motionEase}`,
        "onboarding-step-enter": `onboarding-step-enter 280ms ${motionEase}`,
      },
    },
  },
  plugins: [amadeusTailwindPlugin],
} satisfies Config;
