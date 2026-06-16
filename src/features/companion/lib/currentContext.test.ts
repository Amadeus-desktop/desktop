import { describe, expect, it } from "vitest";
import { buildCompanionCurrentContextFromEvents } from "./currentContext";
import type { TimelineEvent } from "../../timeline/types";

describe("buildCompanionCurrentContextFromEvents", () => {
  it("summarizes today's redacted activity and trigger reason for the prompt", () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const occurredAt = now.getTime();
    const events: TimelineEvent[] = [
      {
        id: "context-work",
        kind: "context",
        occurredAt,
        title: "Zed",
        subtitle: "[redacted]",
        metadataJson: JSON.stringify({
          category: "Work",
          frontmostDurationMs: 72 * 60 * 1000,
        }),
      },
      {
        id: "context-break",
        kind: "context",
        occurredAt: occurredAt + 60_000,
        title: "Google Chrome",
        subtitle: "[redacted]",
        metadataJson: JSON.stringify({
          category: "NonWork",
          frontmostDurationMs: 15 * 60 * 1000,
          browserContext: {
            urlHost: "youtube.com",
            urlClass: "Video",
          },
          trigger: {
            candidate: {
              triggerType: "drift",
              reason: "non_work_video_after_work",
            },
            speakabilityScore: 72,
            action: "Bubble",
          },
        }),
      },
      {
        id: "utterance-1",
        kind: "utterance",
        occurredAt: occurredAt + 2 * 60_000,
        title: "잠깐 샌 것 같아.",
        subtitle: "drift · edge:gemini",
        metadataJson: "{}",
      },
    ];

    const context = buildCompanionCurrentContextFromEvents(events, {
      nowMs: occurredAt,
      nudge: "잠깐 샌 것 같아.",
    });

    expect(context).toMatchObject({
      source: "cloud_safe",
      allowed_surface: "both",
    });
    const summary = JSON.parse(context?.summary ?? "{}") as {
      currentReason: {
        visibleNudge: string | null;
        triggerType: string | null;
        triggerReason: string | null;
        speakabilityScore: number | null;
      };
      today: {
        proactiveMessages: number;
        activities: Array<{ label: string; kind: string; minutes: number }>;
      };
    };

    expect(summary.currentReason).toMatchObject({
      visibleNudge: "잠깐 샌 것 같아.",
      triggerType: "drift",
      triggerReason: "non_work_video_after_work",
      speakabilityScore: 72,
    });
    expect(summary.today.proactiveMessages).toBe(1);
    expect(summary.today.activities).toEqual([
      { label: "Zed", kind: "work", minutes: 72, observations: 1 },
      { label: "youtube.com", kind: "break", minutes: 15, observations: 1 },
    ]);
  });

  it("accepts lower-case activity metadata emitted by desktop observations", () => {
    const now = new Date();
    now.setHours(15, 0, 0, 0);
    const occurredAt = now.getTime();

    const context = buildCompanionCurrentContextFromEvents(
      [
        {
          id: "context-work",
          kind: "context",
          occurredAt,
          title: "Zed",
          subtitle: "[redacted]",
          metadataJson: JSON.stringify({
            category: "work",
            frontmostDurationMs: 20 * 60 * 1000,
          }),
        },
        {
          id: "context-video",
          kind: "context",
          occurredAt: occurredAt + 60_000,
          title: "Google Chrome",
          subtitle: "[redacted]",
          metadataJson: JSON.stringify({
            category: "non_work",
            browserContext: {
              urlHost: "youtube.com",
              urlClass: "video",
            },
            frontmostDurationMs: 10 * 60 * 1000,
          }),
        },
      ],
      { nowMs: occurredAt },
    );

    const summary = JSON.parse(context?.summary ?? "{}") as {
      today: {
        activities: Array<{ label: string; kind: string; minutes: number }>;
      };
    };

    expect(summary.today.activities).toEqual([
      { label: "Zed", kind: "work", minutes: 20, observations: 1 },
      { label: "youtube.com", kind: "break", minutes: 10, observations: 1 },
    ]);
  });

  it("returns null when there is no nudge and no timeline context today", () => {
    expect(buildCompanionCurrentContextFromEvents([], { nowMs: Date.now() })).toBeNull();
  });
});
