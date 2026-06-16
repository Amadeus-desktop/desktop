import { describe, expect, it, vi } from "vitest";
import { getAppLocale } from "../../../i18n";
import type { TimelineEvent } from "../../timeline/types";
import { buildDailyCareInsight } from "./report";

const today = new Date("2026-06-17T14:00:00+09:00").getTime();

function event(
  id: string,
  kind: TimelineEvent["kind"],
  offsetMinutes: number,
  title: string = kind,
  metadataJson = "{}",
): TimelineEvent {
  return {
    id,
    kind,
    title,
    subtitle: "",
    metadataJson,
    occurredAt: today + offsetMinutes * 60_000,
  };
}

describe("buildDailyCareInsight", () => {
  it("derives hero, keywords, and closing note from today's timeline", () => {
    vi.setSystemTime(today + 90 * 60_000);
    const events = [
      event("context-1", "context", 0),
      event("utterance-1", "utterance", 10),
      event("reaction-1", "reaction", 20, "opened"),
      event("context-2", "context", 60),
    ];

    const insight = buildDailyCareInsight(events, getAppLocale("ko"));

    expect(insight.heroPrompt).toBe(
      "오늘 꽤 힘냈어. 네가 노력한 거 같이 확인해볼까?",
    );
    expect(insight.keywords).toEqual(["은은함", "다시 돌아옴"]);
    expect(insight.closingNote).toBe(
      "오늘도 잘 버텼어. 힘든 순간마다 다시 돌아온 것만으로도 충분히 대단해.",
    );
    vi.useRealTimers();
  });

  it("builds a companion-like narrative from detailed context metadata", () => {
    vi.setSystemTime(today + 120 * 60_000);
    const events = [
      event(
        "context-hwp",
        "context",
        0,
        "한글",
        JSON.stringify({
          category: "Work",
          frontmostDurationMs: 62 * 60_000,
        }),
      ),
      event(
        "context-doc",
        "context",
        70,
        "Obsidian",
        JSON.stringify({
          category: "Work",
          frontmostDurationMs: 18 * 60_000,
        }),
      ),
      event("utterance-1", "utterance", 80, "잠깐 정리해도 괜찮아."),
      event("reaction-1", "reaction", 81, "opened"),
    ];

    const insight = buildDailyCareInsight(events, getAppLocale("ko"));

    expect(insight.companionNarrative).toContain("한글");
    expect(insight.companionNarrative).toContain("흐름");
    expect(insight.activityDetails[0]).toMatchObject({
      label: "한글",
      kind: "work",
    });
    expect(insight.activityDetails[0].summary).toContain("오래");
    vi.useRealTimers();
  });
});
