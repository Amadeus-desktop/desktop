import { describe, expect, it, vi } from "vitest";
import type { SyncQueueRow } from "../../timeline/types";
import { syncPendingMemorySummaryQueue } from "./cloudMemorySyncWorker";

function queueRow(payload: Record<string, unknown>): SyncQueueRow {
  return {
    id: "sync-1",
    eventType: "memory.summary",
    payloadJson: JSON.stringify({
      schemaVersion: 1,
      eventType: "memory.summary",
      payloadClass: "SafeSummary",
      safetyGrade: "SafeWorkSummary",
      redactionLevel: "SummaryRedacted",
      retentionPolicy: "Session",
      validatorVersion: "test.v1",
      payload,
    }),
    idempotencyKey: "memory-summary-1",
    safetyGrade: "SafeWorkSummary",
    redactionLevel: "SummaryRedacted",
    retentionPolicy: "Session",
    status: "pending",
    retryCount: 0,
    lastError: null,
    createdAtMs: 1,
    updatedAtMs: 1,
  };
}

describe("syncPendingMemorySummaryQueue", () => {
  it("uploads safe memory summary rows and marks them synced", async () => {
    const row = queueRow({
      personaId: "makise-kurisu",
      memoryCategory: "episodic",
      memoryType: "episodic_summary",
      content: "사용자는 오늘 과제를 오래 붙잡았다.",
      confidence: 82,
      source: "manual",
      evidenceExcerptRedacted: "과제를 오래 붙잡음",
      observedAt: "2026-06-17T00:00:00.000Z",
      writeReason: "safe_summary",
    });
    const uploadCloudMemory = vi.fn().mockResolvedValue({ id: "cloud-memory-1" });
    const markSyncQueueSynced = vi.fn().mockResolvedValue(row);

    const result = await syncPendingMemorySummaryQueue({
      listPendingSyncQueue: vi.fn().mockResolvedValue([row]),
      uploadCloudMemory,
      markSyncQueueSynced,
      recordSyncQueueFailure: vi.fn(),
    });

    expect(uploadCloudMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "memory-summary-1",
        personaId: "makise-kurisu",
        memoryCategory: "episodic",
        memoryType: "episodic_summary",
        safetyGrade: "SafeWorkSummary",
      }),
    );
    expect(markSyncQueueSynced).toHaveBeenCalledWith({ id: "sync-1" });
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0, retryable: 0 });
  });
});
