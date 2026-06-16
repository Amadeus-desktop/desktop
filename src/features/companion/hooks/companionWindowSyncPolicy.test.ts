import { describe, expect, it } from "vitest";
import {
  computeCompanionWindowSize,
  shouldSkipCompanionResize,
} from "./companionWindowSyncPolicy";

describe("companionWindowSyncPolicy", () => {
  it("rounds content size up and applies measuring inset", () => {
    expect(computeCompanionWindowSize({ width: 31.2, height: 18.1 }, 4)).toEqual({
      width: 40,
      height: 27,
    });
  });

  it("never returns a zero sized native window", () => {
    expect(computeCompanionWindowSize({ width: -10, height: 0 }, 0)).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("skips native resize when the last applied size and mode are unchanged", () => {
    expect(
      shouldSkipCompanionResize(
        { width: 40, height: 40 },
        { width: 40, height: 40 },
        "quiet",
        "quiet",
      ),
    ).toBe(true);
  });

  it("does not skip native resize when either dimension changes", () => {
    expect(
      shouldSkipCompanionResize(
        { width: 40, height: 40 },
        { width: 41, height: 40 },
        "quiet",
        "quiet",
      ),
    ).toBe(false);
    expect(
      shouldSkipCompanionResize(null, { width: 40, height: 40 }, "quiet", null),
    ).toBe(false);
  });

  it("does not skip native resize when the layout mode changes", () => {
    expect(
      shouldSkipCompanionResize(
        { width: 84, height: 84 },
        { width: 84, height: 84 },
        "pocket",
        "quiet",
      ),
    ).toBe(false);
  });
});
