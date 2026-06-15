import { describe, expect, it, vi } from "vitest";
import { resolveCompanionReplyWithDependencies } from "./reply";
import type { MemoryCard } from "../../../domain/memory/cards";
import { initialSettings } from "../../settings/lib/settings";

const memoryCard: MemoryCard = {
  id: "memory-1",
  userId: "user-1",
  personaId: "seoyeon-modern-senior",
  memoryCategory: "semantic",
  memoryType: "user_preference",
  content: "사용자는 짧은 위로를 선호한다.",
  confidence: 94,
  source: "conversation",
  visibility: "cloud_safe",
  normalizedKey: "reply_style",
  sourceMessageIds: ["msg-1"],
  evidenceExcerptRedacted: "짧게 말해줘",
  observedAtMs: 1,
  validFromMs: null,
  expiresAtMs: null,
  userConfirmed: true,
  contradictsMemoryId: null,
  writeReason: "explicit_user_preference",
  createdAtMs: 1,
  updatedAtMs: 1,
  deletedAtMs: null,
};

const persona = {
  id: "seoyeon-modern-senior" as const,
  name: "한서연",
  shortLabel: "현대 재회",
  description: "헤어진 뒤에도 리듬을 기억하는 낮은 압력의 현대 로맨스.",
  icon: "letter" as const,
};

const settings = {
  ...initialSettings,
  locale: "ko" as const,
  nickname: "작업자",
  companionPersonaId: "seoyeon-modern-senior" as const,
  modelRoute: "local-first" as const,
};

describe("resolveCompanionReplyWithDependencies", () => {
  it("loads cloud-safe memories for deep replies", async () => {
    const generateChatReply = vi.fn().mockResolvedValue({
      message: "알겠어. 짧게 말할게.",
      provider: "test",
    });

    await resolveCompanionReplyWithDependencies(
      [{ id: "m1", sender: "user", text: "오늘 힘들어." }],
      persona,
      settings,
      {
        listCloudSafeMemoryCards: vi.fn().mockResolvedValue([memoryCard]),
        generateChatReply,
      },
    );

    expect(generateChatReply).toHaveBeenCalledWith(
      expect.any(Array),
      persona,
      settings,
      expect.objectContaining({
        mode: "deep",
        memoryCards: [memoryCard],
      }),
    );
  });

  it("falls back to no memory when cloud memory retrieval fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const generateChatReply = vi.fn().mockResolvedValue({
      message: "여기 있어.",
      provider: "test",
    });

    await resolveCompanionReplyWithDependencies(
      [{ id: "m1", sender: "user", text: "오늘 힘들어." }],
      persona,
      settings,
      {
        listCloudSafeMemoryCards: vi.fn().mockRejectedValue(new Error("offline")),
        generateChatReply,
      },
    );

    expect(generateChatReply).toHaveBeenCalledWith(
      expect.any(Array),
      persona,
      settings,
      expect.objectContaining({
        mode: "deep",
        memoryCards: [],
      }),
    );
    expect(warn).toHaveBeenCalledWith("cloud_memory_load_failed", {
      errorType: "Error",
    });
    warn.mockRestore();
  });
});
