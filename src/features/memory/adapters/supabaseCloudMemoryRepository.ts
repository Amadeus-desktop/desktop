import type {
  MemoryCard,
  MemoryCategory,
  MemorySource,
  MemoryType,
} from "../../../domain/memory/cards";
import type { VectorMemoryMatch } from "../../../domain/memory/rag";
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

export type CloudMemoryMatchRow = Omit<CloudMemoryRow, "user_id"> & {
  similarity: number;
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
  const personaId = await resolveCloudPersonaId(input.personaId);
  if (!personaId) return [];

  let query = supabase
    .from("cloud_memories")
    .select(CLOUD_MEMORY_SELECT)
    .eq("persona_id", personaId)
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

export async function matchCloudSafeMemoryCards(input: {
  personaId: string;
  queryEmbedding: number[];
  embeddingModel: string;
  memoryTypes?: MemoryType[];
  threshold?: number;
  limit?: number;
}): Promise<VectorMemoryMatch[]> {
  const supabase = getSupabaseClient();
  const personaId = await resolveCloudPersonaId(input.personaId);
  if (!personaId) return [];

  const rpcClient = supabase as unknown as {
    rpc: (
      functionName: "match_cloud_memories",
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await rpcClient.rpc("match_cloud_memories", {
    query_embedding: input.queryEmbedding,
    match_persona_id: personaId,
    match_memory_types: input.memoryTypes ?? null,
    match_threshold: input.threshold ?? 0.74,
    match_count: input.limit ?? 8,
    match_embedding_model: input.embeddingModel,
  });

  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => {
    const match = row as CloudMemoryMatchRow;
    return {
      card: normalizeCloudMemoryMatchRow(match),
      similarity: Number(match.similarity),
      embeddingModel: input.embeddingModel,
    };
  });
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

export function normalizeCloudMemoryMatchRow(row: CloudMemoryMatchRow): MemoryCard {
  return normalizeCloudMemoryRow({
    ...row,
    user_id: "",
  });
}

export async function resolveCloudPersonaId(
  personaIdOrSlug: string,
): Promise<string | null> {
  const value = personaIdOrSlug.trim();
  if (!value) return null;
  if (isCloudPersonaUuid(value)) return value;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("personas")
    .select("id")
    .eq("slug", value)
    .maybeSingle();

  if (error) throw error;
  const id = (data as { id?: unknown } | null)?.id;
  return typeof id === "string" && id.trim() ? id : null;
}

export function isCloudPersonaUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseNullableTime(value: string | null): number | null {
  return value ? Date.parse(value) : null;
}
