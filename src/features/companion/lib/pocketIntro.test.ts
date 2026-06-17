import { describe, expect, it } from "vitest";
import { generatePocketIntro } from "./pocketIntro";
import type { Persona } from "../types";

const kurisu: Persona = {
  id: "makise-kurisu",
  name: "마키세 크리스",
  shortLabel: "크리스",
  description: "logical lab partner",
  speechExample: "…뭐, 수고했어.",
  icon: "bubble",
};

describe("generatePocketIntro", () => {
  it("uses the persona card first message instead of repeating the trigger utterance", () => {
    expect(generatePocketIntro("쉬는 중이면 괜찮아.", kurisu)).toBe(
      "아직도 붙잡고 있어? 하아... 그 결론은 너무 성급해. 그래도 네가 막힌 건 사실이니까, 변수부터 줄이자.",
    );
  });

  it("uses the persona card first message when opened without a nudge", () => {
    expect(generatePocketIntro("", kurisu)).toContain("변수부터 줄이자");
  });
});
