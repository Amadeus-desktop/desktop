import plugin from "tailwindcss/plugin";
import { shellVariablesDark, shellVariablesLight } from "./shellVariables";

const noDragSelectors = [
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "label",
  "nav",
  "[role='button']",
  "[data-separator]",
  "[data-panel]",
  "[data-no-drag]",
  ".tauri-no-drag",
];

const noDragRule = {
  "-webkit-app-region": "no-drag",
  "app-region": "no-drag",
} as const;

/** Base + Tauri window utilities. Registered from `tailwind.config.ts`. */
export const amadeusTailwindPlugin = plugin(({ addBase, addUtilities }) => {
  addBase({
    ":root": {
      ...shellVariablesDark,
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "var(--shell-ink)",
      background: "transparent",
      fontSynthesis: "none",
      textRendering: "optimizeLegibility",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    ".dark": {
      color: "var(--shell-ink)",
    },
    ".light": {
      ...shellVariablesLight,
      color: "var(--shell-ink)",
    },
    "html, body, #root": {
      height: "100%",
      minHeight: "100%",
      background: "transparent !important",
    },
    body: {
      margin: "0",
    },
    "button, input, select": {
      font: "inherit",
    },
    button: {
      cursor: "default",
    },
    "[data-tauri-drag-region]": {
      "-webkit-app-region": "drag",
      "app-region": "drag",
      userSelect: "none",
    },
    ...Object.fromEntries(noDragSelectors.map((selector) => [selector, noDragRule])),
    "::-webkit-scrollbar": {
      width: "0",
      height: "0",
      display: "none",
    },
    "html, body, #root, .scrollbar-hide": {
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    },
    ".scrollbar-hide::-webkit-scrollbar": {
      display: "none",
    },
    "@media (prefers-reduced-motion: reduce)": {
      ".motion-safe-animate": {
        animation: "none !important",
      },
    },
    "[data-tauri] .motion-safe-animate": {
      animation: "none !important",
    },
  });

  addUtilities({
    ".tauri-no-drag": noDragRule,
    ".tauri-titlebar": {
      "-webkit-app-region": "drag",
      "app-region": "drag",
      userSelect: "none",
      touchAction: "none",
    },
    ".tauri-interactive": {
      cursor: "pointer",
      pointerEvents: "auto",
      ...noDragRule,
    },
    ".tauri-interactive-zone": {
      pointerEvents: "auto",
    },
    ".tauri-interactive-zone *": {
      pointerEvents: "auto",
    },
  });
});
