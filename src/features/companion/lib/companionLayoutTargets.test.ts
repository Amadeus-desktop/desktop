import { describe, expect, it } from "vitest";
import {
  COMPANION_STACK_GAP_PX,
  COMPANION_STACK_PADDING_PX,
  getCompanionModeContentFloor,
  mergeCompanionContentRect,
} from "./companionLayoutTargets";

const ANCHOR_FOOTPRINT_PX = 44;
const ANCHOR_STACK_PX = ANCHOR_FOOTPRINT_PX + COMPANION_STACK_GAP_PX;
const NOTE_BUBBLE_STACK_PX = 120 + COMPANION_STACK_GAP_PX + ANCHOR_STACK_PX + COMPANION_STACK_PADDING_PX;

describe("companionLayoutTargets", () => {
  it("uses the quiet icon footprint for presence-only modes", () => {
    expect(getCompanionModeContentFloor("quiet")).toEqual({
      width: ANCHOR_FOOTPRINT_PX + COMPANION_STACK_PADDING_PX,
      height: ANCHOR_FOOTPRINT_PX + COMPANION_STACK_PADDING_PX,
    });
  });

  it("uses compact note-bubble footprint for nudge only", () => {
    expect(getCompanionModeContentFloor("nudge")).toEqual({
      width: 296 + COMPANION_STACK_PADDING_PX,
      height: NOTE_BUBBLE_STACK_PX,
    });
  });

  it("uses the full chat panel footprint for pocket and deep modes", () => {
    const panelFloor = {
      width: 368 + COMPANION_STACK_PADDING_PX,
      height: 448 + COMPANION_STACK_GAP_PX + ANCHOR_STACK_PX + COMPANION_STACK_PADDING_PX,
    };

    expect(getCompanionModeContentFloor("pocket")).toEqual(panelFloor);
    expect(getCompanionModeContentFloor("deep")).toEqual(panelFloor);
  });

  it("raises clipped measurements to the active mode floor", () => {
    expect(
      mergeCompanionContentRect({ width: 64, height: 64 }, "pocket"),
    ).toEqual(getCompanionModeContentFloor("pocket"));
  });
});
