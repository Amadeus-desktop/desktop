import {
  DEFAULT_ACCENT_COLOR,
  getAccentColor,
  type AccentColorId,
} from "../tokens/appearance";

export function applyAccentColor(colorId: AccentColorId = DEFAULT_ACCENT_COLOR) {
  const tokens = getAccentColor(colorId);
  const root = document.documentElement;

  root.dataset.accentColor = colorId;
  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--accent-soft", tokens.accentSoft);
  root.style.setProperty("--accent-rgb", tokens.accentRgb);
  root.style.setProperty("--accent-gradient-from", tokens.gradientFrom);
  root.style.setProperty("--accent-gradient-to", tokens.gradientTo);
  root.style.setProperty("--accent-on", tokens.onAccent);
}
