import { describe, expect, it } from "vitest";
import { normalizeMateIconKind } from "./mateIcons";

describe("normalizeMateIconKind", () => {
  it("accepts supported mate icon kinds", () => {
    expect(normalizeMateIconKind("bubble")).toBe("bubble");
    expect(normalizeMateIconKind("letter")).toBe("letter");
    expect(normalizeMateIconKind("star")).toBe("star");
    expect(normalizeMateIconKind("orb")).toBe("orb");
  });

  it("falls back unknown values to bubble", () => {
    expect(normalizeMateIconKind("unknown")).toBe("bubble");
  });
});
