import { describe, expect, it } from "vitest";
import { formatNudgePreview } from "./formatNudgePreview";

describe("formatNudgePreview", () => {
  it("keeps one short sentence as-is", () => {
    expect(formatNudgePreview("오늘 많이 버텼네.")).toBe("오늘 많이 버텼네.");
  });

  it("limits preview to about two sentences", () => {
    expect(
      formatNudgePreview("첫 문장입니다. 두 번째 문장입니다. 세 번째는 숨깁니다."),
    ).toBe("첫 문장입니다. 두 번째 문장입니다.");
  });
});
