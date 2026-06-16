import { describe, expect, it } from "vitest";
import { buildDailyCareSummarySteps } from "./dailyCareSummarySteps";

describe("buildDailyCareSummarySteps", () => {
  it("builds welcome, narrative, activity, keywords, and closing steps", () => {
    const steps = buildDailyCareSummarySteps(
      [
        {
          id: "together-time",
          label: "함께 있었던 시간",
          value: "2시간",
          tone: "rose",
        },
      ],
      [],
      {
        heroPrompt: "",
        keywords: ["차분함"],
        closingNote: "오늘도 수고했어.",
        companionNarrative: "오늘은 한글을 많이 붙잡고 있었구나.",
        activityDetails: [
          {
            id: "work:한글",
            label: "한글",
            kind: "work",
            summary: "한글을 꽤 오래 붙잡고 있었어.",
            totalDurationMs: 62 * 60 * 1000,
            eventCount: 1,
          },
        ],
      },
    );

    expect(steps.map((step) => step.kind)).toEqual([
      "welcome",
      "narrative",
      "activity",
      "keywords",
      "closing",
    ]);
  });
});
