import { describe, expect, it, vi } from "vitest";
import type { MemoryCard } from "../../../domain/memory/cards";
import { selectAppPromptMemoryCards } from "./ragMemorySourceSelector";

function memoryCard(overrides: Partial<MemoryCard>): MemoryCard {
  return {
    id: "memory-1",
    userId: "user-1",
    personaId: "makise-kurisu",
    memoryCategory: "semantic",
    memoryType: "user_preference",
    content: "사용자는 짧은 답변을 선호한다.",
    confidence: 90,
    source: "conversation",
    visibility: "local_private",
    normalizedKey: "reply-short",
    sourceMessageIds: ["msg-1"],
    evidenceExcerptRedacted: "짧게",
    observedAtMs: 1,
    validFromMs: null,
    expiresAtMs: null,
    userConfirmed: true,
    contradictsMemoryId: null,
    writeReason: "test",
    createdAtMs: 1,
    updatedAtMs: 1,
    deletedAtMs: null,
    ...overrides,
  };
}

describe("selectAppPromptMemoryCards", () => {
  it("combines local and cloud memory while online", async () => {
    const cards = await selectAppPromptMemoryCards(
      {
        personaId: "makise-kurisu",
        mode: "deep",
        provider: "local_qwen",
        online: true,
        nowMs: 10,
      },
      {
        listLocalMemoryCards: vi.fn().mockResolvedValue([memoryCard({ id: "local-1" })]),
        listCloudSafeMemoryCards: vi.fn().mockResolvedValue([
          memoryCard({
            id: "cloud-1",
            visibility: "cloud_safe",
            updatedAtMs: 2,
          }),
        ]),
      },
    );

    expect(cards.map((card) => card.id)).toEqual(["cloud-1", "local-1"]);
  });

  it("uses local memory only while offline", async () => {
    const listCloudSafeMemoryCards = vi.fn();

    const cards = await selectAppPromptMemoryCards(
      {
        personaId: "makise-kurisu",
        mode: "deep",
        provider: "local_qwen",
        online: false,
        nowMs: 10,
      },
      {
        listLocalMemoryCards: vi.fn().mockResolvedValue([memoryCard({ id: "local-1" })]),
        listCloudSafeMemoryCards,
      },
    );

    expect(listCloudSafeMemoryCards).not.toHaveBeenCalled();
    expect(cards.map((card) => card.id)).toEqual(["local-1"]);
  });

  it("falls back to local memory when cloud memory retrieval fails", async () => {
    const cards = await selectAppPromptMemoryCards(
      {
        personaId: "makise-kurisu",
        mode: "deep",
        provider: "local_qwen",
        online: true,
        nowMs: 10,
      },
      {
        listLocalMemoryCards: vi.fn().mockResolvedValue([memoryCard({ id: "local-1" })]),
        listCloudSafeMemoryCards: vi.fn().mockRejectedValue(new Error("network")),
      },
    );

    expect(cards.map((card) => card.id)).toEqual(["local-1"]);
  });
});
