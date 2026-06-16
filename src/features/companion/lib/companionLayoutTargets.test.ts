import { describe, expect, it } from "vitest";
import {
  COMPANION_STACK_PADDING_PX,
  getCompanionModeContentFloor,
  mergeCompanionContentRect,
} from "./companionLayoutTargets";

describe("companionLayoutTargets", () => {
  it("uses the quiet icon footprint for presence-only modes", () => {
    expect(getCompanionModeContentFloor("quiet")).toEqual({
      width: 44 + COMPANION_STACK_PADDING_PX,
      height: 44 + COMPANION_STACK_PADDING_PX,
    });
  });

  it("uses the chat panel footprint for pocket and deep modes", () => {
    expect(getCompanionModeContentFloor("pocket")).toEqual({
      width: 368 + COMPANION_STACK_PADDING_PX,
      height: 448 + COMPANION_STACK_PADDING_PX,
    });
    expect(getCompanionModeContentFloor("deep")).toEqual(
      getCompanionModeContentFloor("pocket"),
    );
  });

  it("raises clipped measurements to the active mode floor", () => {
    expect(
      mergeCompanionContentRect({ width: 64, height: 64 }, "pocket"),
    ).toEqual({
      width: 368 + COMPANION_STACK_PADDING_PX,
      height: 448 + COMPANION_STACK_PADDING_PX,
    });
  });
});
