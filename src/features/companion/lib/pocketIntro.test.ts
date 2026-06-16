import { describe, expect, it } from "vitest";
import { generatePocketIntro } from "./pocketIntro";
import type { Persona } from "../types";

const kurisu: Persona = {
  id: "makise-kurisu",
  name: "마키세 크리스",
  shortLabel: "크리스",
  description: "logical lab partner",
  icon: "bubble",
};

describe("generatePocketIntro", () => {
  it("uses the trigger utterance as the first opened-chat message", () => {
    expect(generatePocketIntro("쉬는 중이면 괜찮아.", kurisu)).toBe(
      "쉬는 중이면 괜찮아.",
    );
  });

  it("falls back to a persona intro when opened without a nudge", () => {
    expect(generatePocketIntro("", kurisu)).toContain("관찰 가능한 변수");
  });
});
