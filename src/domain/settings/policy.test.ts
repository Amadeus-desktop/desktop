import { describe, expect, it } from "vitest";
import { getTalkFrequencyPolicy } from "./policy";

describe("getTalkFrequencyPolicy", () => {
  it("maps speech frequency to interaction cadence", () => {
    expect(getTalkFrequencyPolicy("quiet")).toMatchObject({
      cooldownMinutes: 45,
      pollIntervalMs: 120_000,
      dailyUtteranceLimit: 6,
    });
    expect(getTalkFrequencyPolicy("balanced")).toMatchObject({
      cooldownMinutes: 30,
      pollIntervalMs: 60_000,
      dailyUtteranceLimit: 12,
    });
    expect(getTalkFrequencyPolicy("active")).toMatchObject({
      cooldownMinutes: 15,
      pollIntervalMs: 20_000,
      dailyUtteranceLimit: 18,
    });
  });
});
