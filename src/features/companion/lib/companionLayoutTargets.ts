import type { CompanionMode } from "../types";

/** Stack padding from `companionStyles.stack` (`p-2.5` × 2). */
export const COMPANION_STACK_PADDING_PX = 20;

/** Vertical gap between expanded panel and mate anchor (`gap-2.5`). */
export const COMPANION_STACK_GAP_PX = 10;

export type CompanionContentRect = {
  width: number;
  height: number;
};

/** Tailwind token sizes at the default 16px root (see `tailwind.config.ts`). */
const CHAT_PRESENCE_ICON_PX = 44;
const CHAT_NUDGE_WIDTH_PX = 296;
const CHAT_PANEL_WIDTH_PX = 368;
const CHAT_PANEL_HEIGHT_PX = 448;
const NOTE_BUBBLE_MIN_HEIGHT_PX = 120;

const ANCHOR_STACK_HEIGHT_PX =
  CHAT_PRESENCE_ICON_PX + COMPANION_STACK_GAP_PX;

const QUIET_CONTENT: CompanionContentRect = {
  width: CHAT_PRESENCE_ICON_PX + COMPANION_STACK_PADDING_PX,
  height: CHAT_PRESENCE_ICON_PX + COMPANION_STACK_PADDING_PX,
};

const NOTE_BUBBLE_STACK_HEIGHT_PX =
  NOTE_BUBBLE_MIN_HEIGHT_PX +
  COMPANION_STACK_GAP_PX +
  ANCHOR_STACK_HEIGHT_PX +
  COMPANION_STACK_PADDING_PX;

const NUDGE_CONTENT: CompanionContentRect = {
  width: CHAT_NUDGE_WIDTH_PX + COMPANION_STACK_PADDING_PX,
  height: NOTE_BUBBLE_STACK_HEIGHT_PX,
};

const PANEL_CONTENT: CompanionContentRect = {
  width: CHAT_PANEL_WIDTH_PX + COMPANION_STACK_PADDING_PX,
  height:
    CHAT_PANEL_HEIGHT_PX +
    COMPANION_STACK_GAP_PX +
    ANCHOR_STACK_HEIGHT_PX +
    COMPANION_STACK_PADDING_PX,
};

export function getCompanionModeContentFloor(
  mode: CompanionMode,
): CompanionContentRect | null {
  switch (mode) {
    case "quiet":
    case "sleep":
    case "new_note":
      return QUIET_CONTENT;
    case "nudge":
      return NUDGE_CONTENT;
    case "pocket":
    case "deep":
      return PANEL_CONTENT;
    case "daily_care":
      return {
        width: CHAT_PANEL_WIDTH_PX + COMPANION_STACK_PADDING_PX,
        height: CHAT_PANEL_HEIGHT_PX + COMPANION_STACK_PADDING_PX,
      };
    default:
      return null;
  }
}

export function mergeCompanionContentRect(
  measured: CompanionContentRect,
  mode: CompanionMode,
): CompanionContentRect {
  const floor = getCompanionModeContentFloor(mode);
  if (!floor) {
    return measured;
  }

  if (mode === "nudge") {
    return {
      width: Math.max(measured.width, floor.width),
      height: Math.max(measured.height, floor.height),
    };
  }

  return {
    width: Math.max(measured.width, floor.width),
    height: Math.max(measured.height, floor.height),
  };
}
