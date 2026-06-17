import { describe, expect, it, vi } from "vitest";
import type { ConversationMessage } from "../../timeline/types";
import { syncConversationMemorySummaries } from "./conversationMemorySyncWorker";

const message: ConversationMessage = {
  id: "msg-1",
  sessionId: "session-1",
  role: "user",
  content: "앞으로 답변은 짧게 해줘.",
  provider: null,
  idempotencyKey: "msg-1",
  cloudMessageId: "cloud-msg-1",
  syncStatus: "synced",
  clientSequence: 1,
  createdAtMs: 1_797_398_400_000,
  serverReceivedAtMs: 1_797_398_401_000,
};

describe("syncConversationMemorySummaries", () => {
  it("creates local syncable memory, enqueues a safe summary, and runs cloud sync", async () => {
    const createLocalMemory = vi.fn().mockResolvedValue({ id: "memory-1" });
    const enqueueSyncPayload = vi.fn().mockResolvedValue({ id: "sync-1" });
    const syncPendingMemorySummaryQueue = vi.fn().mockResolvedValue({
      processed: 1,
      synced: 1,
      failed: 0,
      retryable: 0,
    });

    const result = await syncConversationMemorySummaries(
      {
        personaId: "makise-kurisu",
        limit: 10,
      },
      {
        listConversationMessagesForPersona: vi.fn().mockResolvedValue([message]),
        createLocalMemory,
        enqueueSyncPayload,
        syncPendingMemorySummaryQueue,
      },
    );

    expect(createLocalMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: "makise-kurisu",
        scope: "syncable_summary",
        syncable: true,
      }),
    );
    expect(enqueueSyncPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "memory.summary",
        idempotencyKey: expect.stringContaining("memory-summary:makise-kurisu"),
      }),
    );
    expect(syncPendingMemorySummaryQueue).toHaveBeenCalledWith(undefined, {
      limit: 10,
    });
    expect(result).toEqual({
      candidates: 1,
      enqueued: 1,
      sync: { processed: 1, synced: 1, failed: 0, retryable: 0 },
    });
  });
});
