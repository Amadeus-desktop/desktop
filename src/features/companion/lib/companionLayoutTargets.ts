import type { CompanionMode } from "../types";

/** Stack padding from `companionStyles.stack` (`p-2.5` × 2). */
export const COMPANION_STACK_PADDING_PX = 20;

export type CompanionContentRect = {
  width: number;
  height: number;
};

/** Tailwind token sizes at the default 16px root (see `tailwind.config.ts`). */
const CHAT_PRESENCE_ICON_PX = 44; // size-11 / chat-fab
const CHAT_NUDGE_WIDTH_PX = 296; // w-chat-nudge = 18.5rem
const CHAT_PANEL_WIDTH_PX = 368; // w-chat-panel = 23rem
const CHAT_PANEL_HEIGHT_PX = 448; // h-chat-panel = 28rem

const QUIET_CONTENT: CompanionContentRect = {
  width: CHAT_PRESENCE_ICON_PX + COMPANION_STACK_PADDING_PX,
  height: CHAT_PRESENCE_ICON_PX + COMPANION_STACK_PADDING_PX,
};

const NUDGE_CONTENT: CompanionContentRect = {
  width: CHAT_NUDGE_WIDTH_PX + COMPANION_STACK_PADDING_PX,
  height: 120 + COMPANION_STACK_PADDING_PX,
};

const PANEL_CONTENT: CompanionContentRect = {
  width: CHAT_PANEL_WIDTH_PX + COMPANION_STACK_PADDING_PX,
  height: CHAT_PANEL_HEIGHT_PX + COMPANION_STACK_PADDING_PX,
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
    case "daily_care":
      return PANEL_CONTENT;
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

  return {
    width: Math.max(measured.width, floor.width),
    height: Math.max(measured.height, floor.height),
  };
}
