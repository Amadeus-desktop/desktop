import {
  DEFAULT_APPEARANCE,
  resolveAppearance,
  type AppearanceMode,
} from "../tokens/appearance";

export function applyAppearance(mode: AppearanceMode = DEFAULT_APPEARANCE) {
  const resolved = resolveAppearance(mode);
  const root = document.documentElement;

  root.dataset.appearance = mode;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
}
