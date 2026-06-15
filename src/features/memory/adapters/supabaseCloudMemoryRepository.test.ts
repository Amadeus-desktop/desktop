import { describe, expect, it } from "vitest";
import { normalizeCloudMemoryRow } from "./supabaseCloudMemoryRepository";

describe("normalizeCloudMemoryRow", () => {
  it("maps a cloud_memories row into a MemoryCard", () => {
    const card = normalizeCloudMemoryRow({
      id: "memory-1",
      user_id: "user-1",
      persona_id: "persona-1",
      memory_category: "semantic",
      memory_type: "user_preference",
      content: "사용자는 짧은 답변을 선호한다.",
      confidence: 91,
      source: "conversation",
      safety_grade: "SharedMemory",
      normalized_key: "reply_style",
      source_message_ids: ["msg-1"],
      evidence_excerpt_redacted: "짧게 말해줘",
      observed_at: "2026-06-16T00:00:00.000Z",
      valid_from: null,
      expires_at: null,
      user_confirmed: true,
      contradicts_memory_id: null,
      write_reason: "explicit_user_preference",
      created_at: "2026-06-16T00:00:01.000Z",
      updated_at: "2026-06-16T00:00:02.000Z",
      deleted_at: null,
    });

    expect(card).toMatchObject({
      id: "memory-1",
      userId: "user-1",
      personaId: "persona-1",
      memoryCategory: "semantic",
      memoryType: "user_preference",
      visibility: "cloud_safe",
      confidence: 91,
      sourceMessageIds: ["msg-1"],
      userConfirmed: true,
    });
    expect(card.observedAtMs).toBe(Date.parse("2026-06-16T00:00:00.000Z"));
    expect(card.updatedAtMs).toBe(Date.parse("2026-06-16T00:00:02.000Z"));
  });
});
