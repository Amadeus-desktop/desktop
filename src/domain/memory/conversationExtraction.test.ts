import { describe, expect, it } from "vitest";
import {
  containsForbiddenMemorySyncContent,
  extractConversationMemoryCandidates,
  memorySummaryEnvelopeFromCandidate,
} from "./conversationExtraction";

describe("conversation memory extraction", () => {
  it("creates a safe episodic summary envelope from conversation messages", () => {
    const [candidate] = extractConversationMemoryCandidates({
      personaId: "makise-kurisu",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "앞으로 답변은 짧게 해줘.",
          createdAtMs: 1_797_398_400_000,
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "알겠어. 짧고 바로 답할게.",
          createdAtMs: 1_797_398_401_000,
        },
      ],
      nowMs: 1_797_398_402_000,
    });

    expect(candidate).toMatchObject({
      personaId: "makise-kurisu",
      memoryCategory: "semantic",
      memoryType: "user_preference",
      source: "conversation",
      visibility: "cloud_safe",
      sourceMessageIds: ["msg-1", "msg-2"],
      writeReason: "conversation_safe_summary",
    });

    const envelope = memorySummaryEnvelopeFromCandidate(candidate);
    expect(envelope).toMatchObject({
      schemaVersion: 1,
      eventType: "memory.summary",
      payloadClass: "SafeSummary",
      safetyGrade: "SafeWorkSummary",
      redactionLevel: "SummaryRedacted",
      retentionPolicy: "Session",
    });
    expect(envelope.payload).toMatchObject({
      personaId: "makise-kurisu",
      memoryCategory: "semantic",
      memoryType: "user_preference",
      sourceMessageIds: ["msg-1", "msg-2"],
    });
  });

  it("rejects forbidden raw fields before queue envelope creation", () => {
    expect(containsForbiddenMemorySyncContent("open /Users/user/secret.txt")).toBe(
      true,
    );
    expect(
      extractConversationMemoryCandidates({
        personaId: "makise-kurisu",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "내 토큰 token=abc123 이거 기억해",
            createdAtMs: 1,
          },
        ],
        nowMs: 2,
      }),
    ).toEqual([]);
  });

  it("returns no candidates for empty messages", () => {
    expect(
      extractConversationMemoryCandidates({
        personaId: "makise-kurisu",
        messages: [],
        nowMs: 1,
      }),
    ).toEqual([]);
  });
});
