import { describe, expect, it } from "vitest";
import type { Persona } from "../types";
import { buildPocketOpeningMessages } from "./openingMessages";

const persona: Persona = {
  id: "seoyeon-modern-senior",
  name: "서연",
  shortLabel: "선배",
  description: "차분한 선배",
  icon: "letter",
};

describe("buildPocketOpeningMessages", () => {
  it("prepends the visible nudge before restored messages", () => {
    const messages = buildPocketOpeningMessages({
      nudge: "잠깐 쉬어도 괜찮아.",
      persona,
      openingId: "opening-1",
      restoredMessages: [
        { id: "old-1", sender: "user", text: "전에 하던 얘기" },
      ],
    });

    expect(messages.map((message) => message.text)).toEqual([
      "잠깐 쉬어도 괜찮아.",
      "전에 하던 얘기",
    ]);
    expect(messages[0]).toMatchObject({
      id: "opening-1",
      sender: "companion",
    });
  });

  it("uses the persona intro when there is no visible nudge", () => {
    const messages = buildPocketOpeningMessages({
      nudge: " ",
      persona,
      openingId: "opening-2",
      restoredMessages: [],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.sender).toBe("companion");
    expect(messages[0]?.text).toContain("물 한 모금");
  });
});
