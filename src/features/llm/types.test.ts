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

  it("uses the persona card static prompt instead of a compact UI summary", () => {
    const request = toLlmChatRequest([], {
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
    });

    expect(request.promptEnvelope.personaStatic.identity).toMatchObject({
      name: "한서연",
      role: expect.stringContaining("현실적인 선배"),
    });
    expect(request.promptEnvelope.characterScenario.firstMessage).toBe(
      "헤어진 사람한테 이런 말 하는 거 웃긴데, 늦은 시간이네. 물 한 모금 마실래?",
    );
    expect(request.promptEnvelope.characterScenario.exampleDialogues.length).toBeGreaterThan(0);
    expect(request.promptEnvelope.personaState).toMatchObject({
      relationship_stage: "unresolved_reunion",
      affinity: 34,
    });
  });

  it("injects ranked memory cards into prompt sections", () => {
    const request = toLlmChatRequest([], {
      locale: "ko",
      personaId: "seoyeon-modern-senior",
      nickname: "작업자",
      nowMs: 1_800_000,
      persona: {
        id: "seoyeon-modern-senior",
        name: "한서연",
        shortLabel: "현대 재회",
        description: "헤어진 뒤에도 리듬을 기억하는 낮은 압력의 현대 로맨스.",
        icon: "letter",
      },
      memoryCards: [
        {
          id: "memory-1",
          userId: "user-1",
          personaId: "seoyeon-modern-senior",
          memoryCategory: "semantic",
          memoryType: "user_preference",
          content: "사용자는 긴 설명보다 짧은 위로를 선호한다.",
          confidence: 95,
          source: "conversation",
          visibility: "cloud_safe",
          normalizedKey: "reply_style",
          sourceMessageIds: ["msg-1"],
          evidenceExcerptRedacted: "짧게 말해줘",
          observedAtMs: 1_700_000,
          validFromMs: null,
          expiresAtMs: null,
          userConfirmed: true,
          contradictsMemoryId: null,
          writeReason: "explicit_user_preference",
          createdAtMs: 1_700_000,
          updatedAtMs: 1_700_000,
          deletedAtMs: null,
        },
      ],
    });

    expect(request.promptEnvelope.semanticMemories).toEqual([
      expect.objectContaining({
        id: "memory-1",
        content: expect.stringContaining("짧은 위로"),
      }),
    ]);
  });

  it("carries local redacted context and mode into the prompt envelope", () => {
    const request = toLlmChatRequest([], {
      locale: "ko",
      personaId: "seoyeon-modern-senior",
      nickname: "작업자",
      mode: "pocket",
      persona: {
        id: "seoyeon-modern-senior",
        name: "한서연",
        shortLabel: "현대 재회",
        description: "헤어진 뒤에도 리듬을 기억하는 낮은 압력의 현대 로맨스.",
        icon: "letter",
      },
      currentContext: {
        source: "local_desktop",
        summary: "문서 작업 중",
        trigger_type: "deep_pause",
        coarse_context_label: "work",
        confidence_bucket: "medium",
        redaction_policy_version: "phase08.v1",
        forbidden_keys_removed: ["raw_ocr_text"],
        redacted_ocr_summary: "[redacted-sensitive-ocr]",
      },
    });

    expect(request.promptEnvelope.mode).toBe("pocket");
    expect(request.promptEnvelope.outputContract.responseTokenCap).toBe(300);
    expect(request.promptEnvelope.currentContext).toEqual(
      expect.objectContaining({
        source: "local_desktop",
        redacted_ocr_summary: "[redacted-sensitive-ocr]",
      }),
    );
  });

  it("maps companion history to assistant role for OpenAI-compatible chat", () => {
    const request = toLlmChatRequest(
      [
        {
          id: "m1",
          sender: "companion",
          text: "여기 있어.",
        },
        {
          id: "m2",
          sender: "user",
          text: "고마워.",
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

    expect(request.messages.map((message) => message.role)).toEqual([
      "assistant",
      "user",
    ]);
  });

  it("preserves persona-card-specific prompt fields in the envelope", () => {
    const request = toLlmChatRequest([], {
      locale: "ko",
      personaId: "makise-kurisu",
      nickname: "작업자",
      persona: {
        id: "makise-kurisu",
        name: "마키세 크리스",
        shortLabel: "연구실 파트너",
        description: "논리와 반박으로 곁을 지키는 과학자형 연구실 파트너.",
        icon: "line",
      },
    });

    expect(request.promptEnvelope.personaStatic.canon_anchor).toBeTruthy();
    expect(request.promptEnvelope.personaStatic.scientific_boundary).toBeTruthy();
  });
});
