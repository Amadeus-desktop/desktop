import { describe, expect, it, beforeEach } from "vitest";
import {
  getCompanionSessionSnapshot,
  patchCompanionSession,
  resetCompanionSession,
  subscribeToCompanionSession,
} from "./companionSessionStore";

describe("companionSessionStore", () => {
  beforeEach(() => {
    resetCompanionSession();
  });
  it("returns a stable snapshot until patched", () => {
    patchCompanionSession({ mode: "quiet", nudge: "", messages: [], draft: "" });

    const first = getCompanionSessionSnapshot();
    const second = getCompanionSessionSnapshot();

    expect(first).toBe(second);

    patchCompanionSession({ mode: "nudge", nudge: "hello" });

    expect(getCompanionSessionSnapshot().mode).toBe("nudge");
    expect(getCompanionSessionSnapshot().nudge).toBe("hello");
  });

  it("notifies subscribers on patch", () => {
    let notifications = 0;
    const unsubscribe = subscribeToCompanionSession(() => {
      notifications += 1;
    });

    patchCompanionSession({ draft: "test" });
    expect(notifications).toBe(1);

    unsubscribe();
  });
});
