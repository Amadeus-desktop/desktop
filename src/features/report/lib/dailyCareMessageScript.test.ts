import { describe, expect, it } from "vitest";
import { getAppLocale } from "../../../i18n";
import { buildDailyCarePhases } from "./dailyCarePhases";
import { fallbackDailyCareBeat } from "./dailyCareLlm";
import { splitCompanionBubbles } from "./dailyCareMessageScript";

describe("dailyCareMessageScript", () => {
  it("splits companion text into short bubbles", () => {
    expect(splitCompanionBubbles("첫 문장. 둘째 문장")).toEqual([
      "첫 문장.",
      "둘째 문장",
    ]);
  });
});

describe("dailyCarePhases", () => {
  it("orders reflection phases for the AI session", () => {
    const phases = buildDailyCarePhases({
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

    expect(phases.map((phase) => phase.kind)).toEqual([
      "welcome",
      "summary",
      "activity",
      "keywords",
      "closing",
    ]);
  });
});

describe("dailyCareLlm fallback", () => {
  it("returns multiple reply options", () => {
    const labels = getAppLocale("ko").report;
    const beat = fallbackDailyCareBeat({
      phase: { kind: "welcome" },
      phaseIndex: 0,
      totalPhases: 5,
      insight: {
        heroPrompt: "",
        keywords: [],
        closingNote: "",
        companionNarrative: "",
        activityDetails: [],
      },
      metrics: [],
      labels,
      persona: {
        id: "eiren-fantasy-guardian",
        name: "에이렌",
        shortLabel: "에이렌",
        description: "",
        icon: "star",
      },
      settings: {
        locale: "ko",
        appearance: "dark",
        accentColor: "rose",
        characterId: "seoyeon-modern-senior",
        companionPersonaId: "eiren-fantasy-guardian",
        companionMateIcon: "star",
        talkFrequency: "balanced",
        modelRoute: "api-first",
        localFallbackEnabled: true,
        nickname: "작업자",
        nightCareEnabled: true,
        analysisEnabled: true,
        proactiveTriggerEnabled: true,
        privacyFilterEnabled: true,
        customPrivacyKeywords: [],
        localModelPath: null,
        llamaServerBinaryPath: null,
        llamaServerHost: "127.0.0.1",
        llamaServerPort: 8080,
      },
      history: [],
    });

    expect(beat.replies.length).toBeGreaterThanOrEqual(2);
  });
});
