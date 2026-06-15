import { describe, expect, it } from "vitest";
import { normalizeEdgeLlmGeneration } from "./edgeLlmRepository";

describe("normalizeEdgeLlmGeneration", () => {
  it("accepts valid edge function generations", () => {
    expect(
      normalizeEdgeLlmGeneration({
        message: "괜찮아, 천천히 가자.",
        provider: "openai",
      }),
    ).toEqual({
      message: "괜찮아, 천천히 가자.",
      provider: "edge:openai",
    });
  });

  it("rejects invalid edge function payloads", () => {
    expect(() => normalizeEdgeLlmGeneration({ message: "" })).toThrow(
      "Invalid Edge LLM response",
    );
  });
});
