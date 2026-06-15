import { describe, expect, it } from "vitest";
import {
  combineRagWithDeterministicFallback,
  shouldEnableVectorMemoryRetrieval,
  type VectorMemoryMatch,
} from "./rag";
import type { MemoryCard } from "./cards";

const now = Date.parse("2026-06-16T00:00:00.000Z");

function memory(overrides: Partial<MemoryCard> = {}): MemoryCard {
  return {
    id: "memory-1",
    userId: "user-1",
    personaId: "persona-1",
    memoryCategory: "semantic",
    memoryType: "user_preference",
    content: "사용자는 짧은 위로를 선호한다.",
    confidence: 92,
    source: "conversation",
    visibility: "cloud_safe",
    normalizedKey: "reply_style",
    sourceMessageIds: ["msg-1"],
    evidenceExcerptRedacted: "짧게 말해줘",
    observedAtMs: now - 1_000,
    validFromMs: null,
    expiresAtMs: null,
    userConfirmed: true,
    contradictsMemoryId: null,
    writeReason: "explicit_user_preference",
    createdAtMs: now - 1_000,
    updatedAtMs: now - 1_000,
    deletedAtMs: null,
    ...overrides,
  };
}

function vectorMatch(
  card: MemoryCard,
  overrides: Partial<VectorMemoryMatch> = {},
): VectorMemoryMatch {
  return {
    card,
    similarity: 0.86,
    embeddingModel: "text-embedding-3-small",
    ...overrides,
  };
}

describe("shouldEnableVectorMemoryRetrieval", () => {
  it("keeps deterministic retrieval until a RAG entry criterion is met", () => {
    expect(
      shouldEnableVectorMemoryRetrieval({
        activeCloudSafeCardCount: 12,
        deterministicPrecision: 0.91,
        deepContinuityFailureTracedToMissingMemory: false,
        promptBudgetFailureRate: 0,
        needsLongTermMemoryBeyondRecentSummaries: false,
      }),
    ).toBe(false);

    expect(
      shouldEnableVectorMemoryRetrieval({
        activeCloudSafeCardCount: 51,
        deterministicPrecision: 0.91,
        deepContinuityFailureTracedToMissingMemory: false,
        promptBudgetFailureRate: 0,
        needsLongTermMemoryBeyondRecentSummaries: false,
      }),
    ).toBe(true);
  });
});

describe("combineRagWithDeterministicFallback", () => {
  it("filters mismatched model, low similarity, deleted, expired and contradicted vector results", () => {
    const result = combineRagWithDeterministicFallback({
      vectorMatches: [
        vectorMatch(memory({ id: "kept" })),
        vectorMatch(memory({ id: "wrong-model" }), {
          embeddingModel: "other-model",
        }),
        vectorMatch(memory({ id: "low" }), { similarity: 0.2 }),
        vectorMatch(memory({ id: "deleted", deletedAtMs: now - 1 })),
        vectorMatch(memory({ id: "expired", expiresAtMs: now - 1 })),
        vectorMatch(memory({ id: "old" })),
        vectorMatch(memory({ id: "new", contradictsMemoryId: "old" })),
      ],
      deterministicCards: [],
      mode: "deep",
      nowMs: now,
      expectedEmbeddingModel: "text-embedding-3-small",
      minimumSimilarity: 0.75,
    });

    expect(result.map((card) => card.id)).toEqual(["kept", "new"]);
  });

  it("fills sparse vector results from deterministic retrieval without duplicates", () => {
    const result = combineRagWithDeterministicFallback({
      vectorMatches: [vectorMatch(memory({ id: "vector-1" }))],
      deterministicCards: [
        memory({ id: "vector-1" }),
        memory({ id: "det-1", confidence: 88 }),
        memory({ id: "det-2", confidence: 82 }),
      ],
      mode: "pocket",
      nowMs: now,
      expectedEmbeddingModel: "text-embedding-3-small",
      minimumSimilarity: 0.75,
    });

    expect(result.map((card) => card.id)).toEqual([
      "vector-1",
      "det-1",
      "det-2",
    ]);
  });
});
