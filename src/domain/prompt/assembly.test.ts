import { describe, expect, it } from "vitest";
import {
  buildCompanionPromptEnvelope,
  filterPromptEnvelopeForProvider,
  type CompanionPromptInput,
} from "./assembly";

const input: CompanionPromptInput = {
  surface: "app",
  mode: "deep",
  locale: "ko",
  isConversationStart: false,
  personaStatic: {
    identity: { name: "한서연" },
    first_message: "늦은 시간이네. 물 한 모금 마실래?",
    scenario: { relationship_hook: "재회" },
    world_lore: { type: "modern" },
    safety_boundary: { dependency: "사용자가 AI 관계에만 기대도록 만들지 않는다." },
    privacy_contract: { desktop_context: "원문을 인용하지 않는다." },
  },
  personaState: {
    relationship_stage: "unresolved_reunion",
    affinity: 34,
    trust_state: "stable",
    open_loops: [],
    boundary_overrides: {},
    state_source: "system",
    version: 1,
  },
  semanticMemories: [
    {
      id: "memory-low",
      content: "낮은 신뢰 기억",
      confidence: 30,
      scope: "cloud_safe",
    },
    {
      id: "memory-high",
      content: "높은 신뢰 기억",
      confidence: 90,
      scope: "cloud_safe",
    },
  ],
  episodicContext: [{ id: "episode-1", summary: "최근 대화 요약", createdAtMs: 2 }],
  sessionMessages: [
    { id: "m2", role: "assistant", content: "응.", createdAtMs: 2, clientSequence: 2 },
    { id: "m1", role: "user", content: "오늘 힘들어.", createdAtMs: 1, clientSequence: 1 },
  ],
  currentContext: {
    source: "local_desktop",
    summary: "redacted local context",
    trigger_type: "deep_pause",
    coarse_context_label: "coding",
    confidence_bucket: "medium",
    redaction_policy_version: "v1",
    forbidden_keys_removed: ["raw_ocr_text"],
  },
};

describe("buildCompanionPromptEnvelope", () => {
  it("builds a fixed-order envelope and omits first_message after conversation start", () => {
    const envelope = buildCompanionPromptEnvelope(input);

    expect(envelope.sectionOrder).toEqual([
      "SYSTEM",
      "PERSONA STATIC",
      "CHARACTER SCENARIO",
      "PERSONA STATE",
      "SEMANTIC MEMORY CARDS",
      "EPISODIC CONTEXT",
      "SESSION MESSAGES",
      "CURRENT CONTEXT",
      "OUTPUT CONTRACT",
    ]);
    expect(envelope.characterScenario.firstMessage).toBeNull();
    expect(envelope.semanticMemories.map((memory) => memory.id)).toEqual([
      "memory-high",
      "memory-low",
    ]);
    expect(envelope.sessionMessages.map((message) => message.id)).toEqual([
      "m1",
      "m2",
    ]);
  });

  it("strips local desktop context for web cloud provider input", () => {
    const envelope = buildCompanionPromptEnvelope(input);
    const filtered = filterPromptEnvelopeForProvider(envelope, "web_cloud");

    expect(filtered.currentContext).toBeNull();
    expect(filtered.semanticMemories).toHaveLength(2);
  });

  it("rejects current context with forbidden raw keys before envelope creation", () => {
    expect(() =>
      buildCompanionPromptEnvelope({
        ...input,
        currentContext: {
          source: "local_desktop",
          summary: "raw OCR: token=abc",
          trigger_type: "deep_pause",
          coarse_context_label: "coding",
          confidence_bucket: "medium",
          redaction_policy_version: "v1",
          forbidden_keys_removed: [],
          raw_ocr_text: "token=abc",
        },
      }),
    ).toThrow("prompt_context_forbidden_key:raw_ocr_text");
  });
});
