import type {
  MemoryCategory,
  MemorySource,
  MemoryType,
} from "../../../domain/memory/cards";
import {
  listPendingSyncQueue as defaultListPendingSyncQueue,
  markSyncQueueSynced as defaultMarkSyncQueueSynced,
  recordSyncQueueFailure as defaultRecordSyncQueueFailure,
} from "../../timeline/adapters/timelineRepository";
import type { SyncPayloadEnvelope, SyncQueueRow } from "../../timeline/types";
import {
  upsertCloudSafeMemoryCard as defaultUpsertCloudSafeMemoryCard,
  type CloudMemoryUpsertInput,
} from "./supabaseCloudMemoryRepository";

type CloudMemorySyncDependencies = {
  listPendingSyncQueue: (input?: { limit?: number }) => Promise<SyncQueueRow[]>;
  uploadCloudMemory: (input: CloudMemoryUpsertInput) => Promise<unknown>;
  markSyncQueueSynced: (input: { id: string }) => Promise<unknown>;
  recordSyncQueueFailure: (input: {
    id: string;
    lastError: string;
    retryable: boolean;
  }) => Promise<unknown>;
};

export type CloudMemorySyncResult = {
  processed: number;
  synced: number;
  failed: number;
  retryable: number;
};

const defaultDependencies: CloudMemorySyncDependencies = {
  listPendingSyncQueue: defaultListPendingSyncQueue,
  uploadCloudMemory: defaultUpsertCloudSafeMemoryCard,
  markSyncQueueSynced: defaultMarkSyncQueueSynced,
  recordSyncQueueFailure: defaultRecordSyncQueueFailure,
};

export async function syncPendingMemorySummaryQueue(
  dependencies: CloudMemorySyncDependencies = defaultDependencies,
  options: { limit?: number } = {},
): Promise<CloudMemorySyncResult> {
  const rows = await dependencies.listPendingSyncQueue({
    limit: options.limit ?? 10,
  });
  const result: CloudMemorySyncResult = {
    processed: 0,
    synced: 0,
    failed: 0,
    retryable: 0,
  };

  for (const row of rows) {
    result.processed += 1;
    try {
      const input = cloudMemoryInputFromSyncQueueRow(row);
      await dependencies.uploadCloudMemory(input);
      await dependencies.markSyncQueueSynced({ id: row.id });
      result.synced += 1;
    } catch (error) {
      const retryable = isRetryableSyncError(error);
      await dependencies.recordSyncQueueFailure({
        id: row.id,
        lastError: syncErrorMessage(error),
        retryable,
      });
      if (retryable) {
        result.retryable += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  return result;
}

export function cloudMemoryInputFromSyncQueueRow(
  row: SyncQueueRow,
): CloudMemoryUpsertInput {
  if (row.eventType !== "memory.summary") {
    throw new Error(`unsupported_sync_event:${row.eventType}`);
  }

  const envelope = parseSyncPayloadEnvelope(row.payloadJson);
  if (
    envelope.eventType !== "memory.summary" ||
    envelope.payloadClass !== "SafeSummary" ||
    envelope.safetyGrade !== "SafeWorkSummary" ||
    envelope.redactionLevel !== "SummaryRedacted"
  ) {
    throw new Error("unsupported_memory_summary_envelope");
  }

  const payload = envelope.payload;
  return {
    idempotencyKey: row.idempotencyKey,
    personaId: requiredString(payload.personaId, "personaId"),
    memoryCategory: requiredEnum(
      payload.memoryCategory,
      ["semantic", "episodic", "procedural"],
      "memoryCategory",
    ) as MemoryCategory,
    memoryType: requiredEnum(
      payload.memoryType,
      [
        "user_preference",
        "relationship_fact",
        "emotional_pattern",
        "boundary",
        "recurring_work_pattern",
        "episodic_summary",
        "persona_state_hint",
      ],
      "memoryType",
    ) as MemoryType,
    content: requiredString(payload.content, "content"),
    confidence: requiredNumber(payload.confidence, "confidence"),
    source: requiredEnum(
      payload.source,
      ["conversation", "nudge_reaction", "manual"],
      "source",
    ) as MemorySource,
    safetyGrade: "SafeWorkSummary",
    normalizedKey: optionalString(payload.normalizedKey) ?? row.idempotencyKey,
    sourceMessageIds: optionalStringArray(payload.sourceMessageIds),
    evidenceExcerptRedacted: requiredString(
      payload.evidenceExcerptRedacted,
      "evidenceExcerptRedacted",
    ),
    observedAt: requiredString(payload.observedAt, "observedAt"),
    validFrom: optionalString(payload.validFrom),
    expiresAt: optionalString(payload.expiresAt),
    userConfirmed:
      typeof payload.userConfirmed === "boolean" ? payload.userConfirmed : false,
    writeReason: requiredString(payload.writeReason, "writeReason"),
  };
}

function parseSyncPayloadEnvelope(payloadJson: string): SyncPayloadEnvelope {
  const parsed = JSON.parse(payloadJson) as SyncPayloadEnvelope;
  if (parsed.schemaVersion !== 1 || typeof parsed.payload !== "object") {
    throw new Error("invalid_sync_payload_envelope");
  }
  return parsed;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`memory_summary_${field}_required`);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`memory_summary_${field}_required`);
  }
  return value;
}

function requiredEnum(
  value: unknown,
  allowed: string[],
  field: string,
): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`memory_summary_${field}_unsupported`);
  }
  return value;
}

function isRetryableSyncError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  return !error.message.startsWith("memory_summary_") &&
    !error.message.startsWith("unsupported_") &&
    !error.message.startsWith("invalid_sync_payload");
}

function syncErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "memory_sync_failed";
}
