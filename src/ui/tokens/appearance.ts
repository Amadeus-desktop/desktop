export type AccentColorId = "rose" | "lavender" | "sky" | "mint" | "peach";

export const ACCENT_COLOR_IDS: AccentColorId[] = [
  "rose",
  "lavender",
  "sky",
  "mint",
  "peach",
];

export type AccentColorTokens = {
  accent: string;
  accentSoft: string;
  accentRgb: string;
  gradientFrom: string;
  gradientTo: string;
  onAccent: string;
};

export const accentColors: Record<AccentColorId, AccentColorTokens> = {
  rose: {
    accent: "#f5a8c8",
    accentSoft: "#ffd6e8",
    accentRgb: "245 168 200",
    gradientFrom: "#f8b4d0",
    gradientTo: "#e889b4",
    onAccent: "#2b1520",
  },
  lavender: {
    accent: "#c4b5fd",
    accentSoft: "#ddd6fe",
    accentRgb: "196 181 253",
    gradientFrom: "#ddd6fe",
    gradientTo: "#a78bfa",
    onAccent: "#1e1533",
  },
  sky: {
    accent: "#7dd3fc",
    accentSoft: "#bae6fd",
    accentRgb: "125 211 252",
    gradientFrom: "#bae6fd",
    gradientTo: "#38bdf8",
    onAccent: "#0c1929",
  },
  mint: {
    accent: "#86efac",
    accentSoft: "#bbf7d0",
    accentRgb: "134 239 172",
    gradientFrom: "#bbf7d0",
    gradientTo: "#4ade80",
    onAccent: "#0f2418",
  },
  peach: {
    accent: "#fdba74",
    accentSoft: "#fed7aa",
    accentRgb: "253 186 116",
    gradientFrom: "#fed7aa",
    gradientTo: "#fb923c",
    onAccent: "#2a1608",
  },
};

export const DEFAULT_ACCENT_COLOR: AccentColorId = "rose";

export function getAccentColor(id: AccentColorId): AccentColorTokens {
  return accentColors[id] ?? accentColors[DEFAULT_ACCENT_COLOR];
}

export type AppearanceMode = "dark" | "light" | "system";

export const APPEARANCE_MODES: AppearanceMode[] = ["dark", "light", "system"];

export const DEFAULT_APPEARANCE: AppearanceMode = "system";

export function resolveAppearance(mode: AppearanceMode): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}
