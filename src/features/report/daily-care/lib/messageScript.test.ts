import { describe, expect, it } from "vitest";
import { getAppLocale } from "../../../../i18n";
import { buildDailyCarePhases } from "./phases";
import { buildDailyCareContext, fallbackDailyCareBeat, pickPresetReplies } from "./llm";
import { splitCompanionBubbles } from "./messageScript";

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
  const labels = getAppLocale("ko").report;
  const baseInput = {
    totalPhases: 5,
    insight: {
      heroPrompt: "",
      keywords: ["은은함", "다시 돌아옴"],
      closingNote: "",
      companionNarrative: "오늘은 한글 과제를 오래 붙잡고 있었구나.",
      activityDetails: [
        {
          id: "activity-1",
          label: "한글 과제",
          kind: "work" as const,
          summary: "한글 과제를 1시간 넘게 이어갔어.",
          totalDurationMs: 62 * 60 * 1000,
          eventCount: 4,
        },
      ],
    },
    metrics: [
      {
        id: "work-time",
        label: "집중한 시간",
        value: "1시간 2분",
        tone: "rose" as const,
      },
    ],
    labels,
    persona: {
      id: "eiren-fantasy-guardian" as const,
      name: "에이렌",
      shortLabel: "에이렌",
      description: "",
      icon: "star" as const,
    },
    settings: {
      locale: "ko" as const,
      appearance: "dark" as const,
      accentColor: "rose" as const,
      characterId: "seoyeon-modern-senior" as const,
      companionPersonaId: "eiren-fantasy-guardian" as const,
      companionMateIcon: "star" as const,
      talkFrequency: "balanced" as const,
      modelRoute: "api-first" as const,
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
  };

  it("returns multiple reply options", () => {
    const beat = fallbackDailyCareBeat({
      ...baseInput,
      phase: { kind: "welcome" },
      phaseIndex: 0,
    });

    expect(beat.replies).toHaveLength(2);
  });

  it("rotates preset reply pairs by phase", () => {
    const welcomeA = pickPresetReplies({
      ...baseInput,
      phase: { kind: "welcome" },
      phaseIndex: 0,
    });
    const welcomeB = pickPresetReplies({
      ...baseInput,
      phase: { kind: "welcome" },
      phaseIndex: 1,
    });

    expect(welcomeA).toHaveLength(2);
    expect(welcomeB).toHaveLength(2);
    expect(welcomeA[0]?.label).not.toBe(welcomeB[0]?.label);
  });

  it("uses concrete activity-aware reply options", () => {
    const replies = pickPresetReplies({
      ...baseInput,
      phase: {
        kind: "activity",
        activity: baseInput.insight.activityDetails[0],
      },
      phaseIndex: 2,
    });

    expect(replies).toHaveLength(2);
    expect(replies.map((reply) => reply.label).join(" ")).toContain("한글 과제");
  });

  it("marks redacted daily care context as available to cloud prompts", () => {
    const context = buildDailyCareContext({
      ...baseInput,
      phase: { kind: "summary", narrative: baseInput.insight.companionNarrative },
      phaseIndex: 1,
    });

    expect(context.allowed_surface).toBe("both");
    expect(context.summary).toContain("한글 과제");
    expect(context.summary).toContain("latestUserReply");
  });
});
