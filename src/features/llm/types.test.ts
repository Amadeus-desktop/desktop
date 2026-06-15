import { describe, expect, it } from "vitest";
import { toLlmChatRequest } from "./types";

describe("toLlmChatRequest", () => {
  it("includes a shared prompt envelope for persona continuity", () => {
    const request = toLlmChatRequest(
      [
        {
          id: "m1",
          sender: "user",
          text: "오늘 힘들어.",
        },
      ],
      {
        locale: "ko",
        personaId: "seoyeon-modern-senior",
        nickname: "작업자",
        persona: {
          id: "seoyeon-modern-senior",
          name: "한서연",
          shortLabel: "현대 재회",
          description: "헤어진 뒤에도 리듬을 기억하는 낮은 압력의 현대 로맨스.",
          icon: "letter",
        },
      },
    );

    expect(request.promptEnvelope.sectionOrder).toContain("PERSONA STATIC");
    expect(request.promptEnvelope.personaStatic.identity).toMatchObject({
      name: "한서연",
    });
    expect(request.promptEnvelope.sessionMessages).toEqual([
      expect.objectContaining({
        id: "m1",
        role: "user",
        content: "오늘 힘들어.",
      }),
    ]);
    expect(request.promptEnvelope.characterScenario.firstMessage).toBeNull();
  });
});
