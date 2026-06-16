import { describe, expect, it } from "vitest";
import { getAppLocale } from "../../../i18n";
import { buildDailyCareSummarySteps } from "./dailyCareSummarySteps";
import { buildDailyCareTurns, splitCompanionBubbles } from "./dailyCareMessageScript";

describe("dailyCareMessageScript", () => {
  it("splits companion text into short bubbles", () => {
    expect(splitCompanionBubbles("첫 문장. 둘째 문장")).toEqual([
      "첫 문장.",
      "둘째 문장",
    ]);
  });

  it("builds star-rail style turns with reply options", () => {
    const labels = getAppLocale("ko");
    const steps = buildDailyCareSummarySteps([], [], {
      heroPrompt: "prompt",
      keywords: ["차분함"],
      closingNote: "오늘도 수고 많았어.",
      companionNarrative: "오늘은 한글을 많이 붙잡고 있었구나.",
      activityDetails: [
        {
          id: "activity-1",
          label: "한글",
          kind: "work",
          summary: "오래 머물렀어.",
          totalDurationMs: 60 * 60 * 1000,
          eventCount: 3,
        },
      ],
    });
    const turns = buildDailyCareTurns(steps, labels.report);

    expect(turns[0]?.replies[0]?.label).toBe("볼까?");
    expect(turns[turns.length - 1]?.replies[0]?.label).toBe("오늘 마무리하기");
    expect(turns.some((turn) => turn.companionItems.some((item) => item.kind === "activity"))).toBe(
      true,
    );
  });
});
