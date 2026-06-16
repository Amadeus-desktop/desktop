import { describe, expect, it } from "vitest";
import { locale as ko } from "../../../i18n/ko";
import { buildDailyCareStats } from "./dailyCareStats";
import type { TimelineEvent } from "../../timeline/types";

describe("buildDailyCareStats", () => {
  it("uses timeline events for together time and note count", () => {
    const now = new Date();
    now.setHours(10, 0, 0, 0);
    const events: TimelineEvent[] = [
      {
        id: "ctx-1",
        kind: "context",
        occurredAt: now.getTime(),
        title: "Code",
        subtitle: "Amadeus",
        metadataJson: "{}",
      },
      {
        id: "ctx-2",
        kind: "context",
        occurredAt: now.getTime() + 10 * 60 * 1000,
        title: "Code",
        subtitle: "Amadeus",
        metadataJson: "{}",
      },
      {
        id: "utt-1",
        kind: "utterance",
        occurredAt: now.getTime() + 11 * 60 * 1000,
        title: "잠깐 쉬어도 괜찮아.",
        subtitle: "deep_pause · template",
        metadataJson: "{}",
      },
    ];

    expect(buildDailyCareStats(events, ko)).toMatchObject({
      togetherTimeValue: "10분",
      noteCountValue: "1번",
    });
  });
});
