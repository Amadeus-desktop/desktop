import type { Layout } from "react-resizable-panels";

export const CONTROL_CENTER_PANEL_LAYOUT_KEY = "amadeus:control-center";
export const CONTROL_CENTER_WINDOW_KEY = "amadeus:control-center-window";

export type ControlCenterWindowSize = {
  width: number;
  height: number;
};

export const controlCenterWindowPolicy = {
  defaultWidth: 840,
  defaultHeight: 560,
  minWidth: 680,
  minHeight: 480,
} as const;

export const onboardingWindowPolicy = {
  width: 340,
  height: 720,
  minWidth: 320,
  minHeight: 600,
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

export function readControlCenterPanelLayout(): Layout | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CONTROL_CENTER_PANEL_LAYOUT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Layout;
    if (
      typeof parsed.sidebar !== "number" ||
      typeof parsed.main !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
