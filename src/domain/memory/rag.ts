import type { PromptMode } from "../prompt/assembly";
import type { MemoryCard } from "./cards";

export type VectorRetrievalEntryMetrics = {
  activeCloudSafeCardCount: number;
  deterministicPrecision: number;
  deepContinuityFailureTracedToMissingMemory: boolean;
  promptBudgetFailureRate: number;
  needsLongTermMemoryBeyondRecentSummaries: boolean;
};

export type VectorMemoryMatch = {
  card: MemoryCard;
  similarity: number;
  embeddingModel: string;
};

const MODE_VECTOR_CAP: Record<PromptMode, number> = {
  nudge: 2,
  pocket: 3,
  deep: 8,
};

export function shouldEnableVectorMemoryRetrieval(
  metrics: VectorRetrievalEntryMetrics,
): boolean {
  return (
    metrics.activeCloudSafeCardCount > 50 ||
    metrics.deterministicPrecision < 0.8 ||
    metrics.deepContinuityFailureTracedToMissingMemory ||
    metrics.promptBudgetFailureRate > 0.01 ||
    metrics.needsLongTermMemoryBeyondRecentSummaries
  );
}

export function combineRagWithDeterministicFallback(input: {
  vectorMatches: VectorMemoryMatch[];
  deterministicCards: MemoryCard[];
  mode: PromptMode;
  nowMs: number;
  expectedEmbeddingModel: string;
  minimumSimilarity: number;
}): MemoryCard[] {
  const contradictedIds = new Set(
    input.vectorMatches
      .map((match) => match.card.contradictsMemoryId)
      .filter((id): id is string => Boolean(id)),
  );
  const cap = MODE_VECTOR_CAP[input.mode];
  const selected = input.vectorMatches
    .filter((match) => match.embeddingModel === input.expectedEmbeddingModel)
    .filter((match) => match.similarity >= input.minimumSimilarity)
    .map((match) => match.card)
    .filter((card) => card.visibility === "cloud_safe")
    .filter((card) => !card.deletedAtMs)
    .filter((card) => !card.expiresAtMs || card.expiresAtMs >= input.nowMs)
    .filter((card) => !contradictedIds.has(card.id))
    .slice(0, cap);

  const seen = new Set(selected.map((card) => card.id));
  for (const card of input.deterministicCards) {
    if (selected.length >= cap) break;
    if (seen.has(card.id)) continue;
    if (card.visibility !== "cloud_safe") continue;
    selected.push(card);
    seen.add(card.id);
  }

  return selected;
}
