import { getAccentColor } from "../tokens/appearance";

const roseAccent = getAccentColor("rose");

/** Default shell CSS custom properties (dark). */
export const shellVariablesDark = {
  "--accent": roseAccent.accent,
  "--accent-soft": roseAccent.accentSoft,
  "--accent-rgb": roseAccent.accentRgb,
  "--accent-gradient-from": roseAccent.gradientFrom,
  "--accent-gradient-to": roseAccent.gradientTo,
  "--accent-on": roseAccent.onAccent,
  "--shell-bg": "#1c1c1e",
  "--shell-panel": "#252528",
  "--shell-panel-strong": "#2c2c30",
  "--shell-row": "#222226",
  "--shell-row-hover": "#2a2a2e",
  "--shell-border": "#3a3a40",
  "--shell-border-subtle": "#333338",
  "--shell-border-strong": "#48484f",
  "--shell-sidebar": "#161618",
  "--shell-sidebar-border": "#2e2e32",
  "--shell-ink": "#ffffff",
  "--shell-ink-muted": "rgb(255 255 255 / 0.52)",
  "--shell-ink-faint": "rgb(255 255 255 / 0.42)",
} as const;

/** Light appearance overrides (applied via `.light` on `html`). */
export const shellVariablesLight = {
  "--shell-bg": "#ebebef",
  "--shell-panel": "#ffffff",
  "--shell-panel-strong": "#f5f5f7",
  "--shell-row": "#ffffff",
  "--shell-row-hover": "#f2f2f7",
  "--shell-border": "#d1d1d6",
  "--shell-border-subtle": "#e5e5ea",
  "--shell-border-strong": "#c7c7cc",
  "--shell-sidebar": "#f2f2f7",
  "--shell-sidebar-border": "#d1d1d6",
  "--shell-ink": "#1c1c1e",
  "--shell-ink-muted": "rgb(28 28 30 / 0.62)",
  "--shell-ink-faint": "rgb(28 28 30 / 0.48)",
} as const;
