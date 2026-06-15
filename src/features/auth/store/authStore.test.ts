import { beforeEach, describe, expect, it } from "vitest";
import {
  getCompanionSessionSnapshot,
  patchCompanionSession,
  resetCompanionSession,
} from "../../companion/lib/companionSessionStore";
import { signOut } from "./authStore";

describe("authStore signOut", () => {
  beforeEach(() => {
    resetCompanionSession();
    patchCompanionSession({
      mode: "nudge",
      nudge: "stale nudge",
      messages: [{ id: "1", sender: "companion", text: "hello" }],
      draft: "draft",
      activeUtteranceId: "utterance-1",
    });
  });

  it("clears companion session state", () => {
    signOut();

    const session = getCompanionSessionSnapshot();
    expect(session.mode).toBe("quiet");
    expect(session.nudge).toBe("");
    expect(session.messages).toEqual([]);
    expect(session.draft).toBe("");
    expect(session.activeUtteranceId).toBeNull();
  });
});
