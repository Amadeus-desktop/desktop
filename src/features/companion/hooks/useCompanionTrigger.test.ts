import { describe, expect, it } from "vitest";
import { getCompanionTriggerPollingState } from "./useCompanionTrigger";

describe("getCompanionTriggerPollingState", () => {
  it("reports disabled when proactive polling is not enabled", () => {
    expect(
      getCompanionTriggerPollingState({ enabled: false, canPresent: true }),
    ).toBe("disabled");
  });

  it("reports not_presentable when the companion is busy", () => {
    expect(
      getCompanionTriggerPollingState({ enabled: true, canPresent: false }),
    ).toBe("not_presentable");
  });

  it("reports active when polling can run", () => {
    expect(
      getCompanionTriggerPollingState({ enabled: true, canPresent: true }),
    ).toBe("active");
  });
});
