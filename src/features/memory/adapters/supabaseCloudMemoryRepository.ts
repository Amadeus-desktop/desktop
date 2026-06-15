import type {
  MemoryCard,
  MemoryCategory,
  MemorySource,
  MemoryType,
} from "../../../domain/memory/cards";
import { getSupabaseClient } from "../../../lib/supabase/client";

export type CloudMemoryRow = {
  id: string;
  user_id: string;
  persona_id: string;
  memory_category: MemoryCategory;
  memory_type: MemoryType;
  content: string;
  confidence: number;
  source: MemorySource;
  safety_grade: "SharedMemory" | "SafeWorkSummary";
  normalized_key: string | null;
  source_message_ids: string[] | null;
  evidence_excerpt_redacted: string | null;
  observed_at: string | null;
  valid_from: string | null;
  expires_at: string | null;
  user_confirmed: boolean;
  contradicts_memory_id: string | null;
  write_reason: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const CLOUD_MEMORY_SELECT = [
  "id",
  "user_id",
  "persona_id",
  "memory_category",
  "memory_type",
  "content",
  "confidence",
  "source",
  "safety_grade",
  "normalized_key",
  "source_message_ids",
  "evidence_excerpt_redacted",
  "observed_at",
  "valid_from",
  "expires_at",
  "user_confirmed",
  "contradicts_memory_id",
  "write_reason",
  "created_at",
  "updated_at",
  "deleted_at",
].join(", ");

export async function listCloudSafeMemoryCards(input: {
  personaId: string;
  memoryTypes?: MemoryType[];
  limit?: number;
}): Promise<MemoryCard[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("cloud_memories")
    .select(CLOUD_MEMORY_SELECT)
    .eq("persona_id", input.personaId)
    .is("deleted_at", null)
    .order("confidence", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(input.limit ?? 7);

  if (input.memoryTypes?.length) {
    query = query.in("memory_type", input.memoryTypes);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeCloudMemoryRow(row as CloudMemoryRow),
  );
}

export function normalizeCloudMemoryRow(row: CloudMemoryRow): MemoryCard {
  return {
    id: row.id,
    userId: row.user_id,
    personaId: row.persona_id,
    memoryCategory: row.memory_category,
    memoryType: row.memory_type,
    content: row.content,
    confidence: Number(row.confidence),
    source: row.source,
    visibility: "cloud_safe",
    normalizedKey: row.normalized_key,
    sourceMessageIds: row.source_message_ids ?? [],
    evidenceExcerptRedacted: row.evidence_excerpt_redacted,
    observedAtMs: parseNullableTime(row.observed_at),
    validFromMs: parseNullableTime(row.valid_from),
    expiresAtMs: parseNullableTime(row.expires_at),
    userConfirmed: row.user_confirmed,
    contradictsMemoryId: row.contradicts_memory_id,
    writeReason: row.write_reason,
    createdAtMs: Date.parse(row.created_at),
    updatedAtMs: Date.parse(row.updated_at),
    deletedAtMs: parseNullableTime(row.deleted_at),
  };
}

function parseNullableTime(value: string | null): number | null {
  return value ? Date.parse(value) : null;
}
