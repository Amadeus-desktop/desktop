export const APP_SHELL_PANEL_IDS = {
  sidebar: "sidebar",
  main: "main",
} as const;

export const APP_SHELL_LAYOUT_ID = "amadeus:control-center";

export const sidebarPanelPolicy = {
  defaultSize: "240px",
  minSize: "200px",
  maxSize: "320px",
  groupResizeBehavior: "preserve-pixel-size",
} as const;

export const mainPanelPolicy = {
  minSize: "420px",
  groupResizeBehavior: "preserve-relative-size",
} as const;

/** Fallback when localStorage has no saved layout (240px / 760px ≈ 32%). */
export const defaultAppShellLayout = {
  [APP_SHELL_PANEL_IDS.sidebar]: 32,
  [APP_SHELL_PANEL_IDS.main]: 68,
};

export const APP_SHELL_PANEL_ID_LIST = [
  APP_SHELL_PANEL_IDS.sidebar,
  APP_SHELL_PANEL_IDS.main,
] as const;
