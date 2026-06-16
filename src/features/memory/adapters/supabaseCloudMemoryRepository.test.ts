import { describe, expect, it } from "vitest";
import {
  isCloudPersonaUuid,
  normalizeCloudMemoryMatchRow,
  normalizeCloudMemoryRow,
} from "./supabaseCloudMemoryRepository";

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

describe("cloud memory persona and vector helpers", () => {
  it("distinguishes cloud persona UUIDs from local persona slugs", () => {
    expect(isCloudPersonaUuid("018f8c4f-7b8a-4f7d-9e31-9caeeea4d1c2")).toBe(true);
    expect(isCloudPersonaUuid("makise-kurisu")).toBe(false);
  });

  it("normalizes vector match rows into cloud-safe memory cards", () => {
    const card = normalizeCloudMemoryMatchRow({
      id: "018f8c4f-7b8a-4f7d-9e31-9caeeea4d1c2",
      persona_id: "persona-uuid",
      memory_category: "episodic",
      memory_type: "episodic_summary",
      content: "오늘 사용자는 한글 과제를 오래 붙잡았다.",
      confidence: 88,
      source: "conversation",
      safety_grade: "SafeWorkSummary",
      normalized_key: "today-hangul",
      source_message_ids: [],
      evidence_excerpt_redacted: "한글 과제",
      observed_at: null,
      valid_from: null,
      expires_at: null,
      user_confirmed: false,
      contradicts_memory_id: null,
      write_reason: "retrieval_test",
      created_at: "2026-06-16T00:00:01.000Z",
      updated_at: "2026-06-16T00:00:02.000Z",
      deleted_at: null,
      similarity: 0.82,
    });

    expect(card).toMatchObject({
      id: "018f8c4f-7b8a-4f7d-9e31-9caeeea4d1c2",
      personaId: "persona-uuid",
      memoryCategory: "episodic",
      memoryType: "episodic_summary",
      visibility: "cloud_safe",
      content: "오늘 사용자는 한글 과제를 오래 붙잡았다.",
    });
  });
});
