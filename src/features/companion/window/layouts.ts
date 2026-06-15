import type { CompanionMode } from "../types";

export type CompanionWindowLayout = {
  width: number;
  height: number;
};

export const COMPANION_WINDOW_LAYOUTS: Record<
  CompanionMode,
  CompanionWindowLayout
> = {
  quiet: { width: 40, height: 40 },
  new_note: { width: 40, height: 40 },
  sleep: { width: 40, height: 40 },
  nudge: { width: 296, height: 188 },
  pocket: { width: 368, height: 468 },
  deep: { width: 368, height: 508 },
  daily_care: { width: 368, height: 508 },
};
