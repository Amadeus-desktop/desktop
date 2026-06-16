import type { Layout } from "react-resizable-panels";

export const CONTROL_CENTER_PANEL_LAYOUT_KEY = "amadeus:control-center";
export const CONTROL_CENTER_PANEL_LAYOUT_STORAGE_KEY =
  "amadeus:control-center-panel-layout";
export const CONTROL_CENTER_WINDOW_KEY = "amadeus:control-center-window";

export type ControlCenterWindowSize = {
  width: number;
  height: number;
};

export type ControlCenterPanelLayout = {
  sidebar: number;
  main: number;
};

export const controlCenterWindowPolicy = {
  defaultWidth: 840,
  defaultHeight: 560,
  minWidth: 680,
  minHeight: 480,
} as const;

export const onboardingWindowPolicy = {
  width: 360,
  height: 580,
  minWidth: 320,
  minHeight: 460,
} as const;

export function readControlCenterWindowSize():
  | ControlCenterWindowSize
  | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CONTROL_CENTER_WINDOW_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ControlCenterWindowSize;
    if (
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number" ||
      !Number.isFinite(parsed.width) ||
      !Number.isFinite(parsed.height)
    ) {
      return null;
    }

    return {
      width: Math.round(parsed.width),
      height: Math.round(parsed.height),
    };
  } catch {
    return null;
  }
}

export function writeControlCenterWindowSize(size: ControlCenterWindowSize) {
  localStorage.setItem(
    CONTROL_CENTER_WINDOW_KEY,
    JSON.stringify({
      width: Math.round(size.width),
      height: Math.round(size.height),
    }),
  );
}

export function readControlCenterPanelLayout(): ControlCenterPanelLayout | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CONTROL_CENTER_PANEL_LAYOUT_STORAGE_KEY);
    if (!raw) return null;

    return normalizeControlCenterPanelLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeControlCenterPanelLayout(layout: Layout) {
  const normalized = normalizeControlCenterPanelLayout(layout);
  if (!normalized) return;

  localStorage.setItem(
    CONTROL_CENTER_PANEL_LAYOUT_STORAGE_KEY,
    JSON.stringify(normalized),
  );
}

function normalizeControlCenterPanelLayout(
  value: unknown,
): ControlCenterPanelLayout | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ControlCenterPanelLayout>;
  if (
    typeof candidate.sidebar !== "number" ||
    typeof candidate.main !== "number" ||
    !Number.isFinite(candidate.sidebar) ||
    !Number.isFinite(candidate.main)
  ) {
    return null;
  }

  const sidebar = Math.max(20, Math.min(candidate.sidebar, 45));
  const main = Math.max(55, Math.min(candidate.main, 80));
  const total = sidebar + main;
  if (total <= 0) return null;

  return {
    sidebar: Math.round((sidebar / total) * 1000) / 10,
    main: Math.round((main / total) * 1000) / 10,
  };
}
