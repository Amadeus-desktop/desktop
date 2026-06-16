import { describe, expect, it, beforeEach } from "vitest";
import { getCompanionLayoutMode } from "./companionLayoutMode";
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

  it("updates the layout mode synchronously when mode is patched", () => {
    patchCompanionSession({ mode: "pocket" });
    expect(getCompanionLayoutMode()).toBe("pocket");
    expect(getCompanionSessionSnapshot().mode).toBe("pocket");
  });

  it("resets the layout mode when the session is reset", () => {
    patchCompanionSession({ mode: "pocket" });
    resetCompanionSession();
    expect(getCompanionLayoutMode()).toBe("quiet");
    expect(getCompanionSessionSnapshot().mode).toBe("quiet");
  });
});
